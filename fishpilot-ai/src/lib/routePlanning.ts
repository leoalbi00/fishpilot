// ============================================================
// /lib/routePlanning.ts — Ecosistema ⛵ Traversata
//
// Calcola una rotta a più waypoint: distanza (miglia nautiche), rotta vera,
// ETA cumulativo, meteo-mare stimato all'arrivo su ciascun leg (tramite
// Open-Meteo, all'orario stimato di passaggio) e direzione del vento
// relativa alla prua. Nessun routing marino reale (linea diretta tra i
// waypoint, come già per la mappa dei report di pesca): non tiene conto di
// coste/isole da aggirare.
// ============================================================

import { fetchMarineConditions, fetchWeatherConditions } from "@/lib/weather";
import { haversineDistanceM, kmhToKnots } from "@/lib/utils";
import { computeSeaRoute } from "@/lib/seaRouting";
import type {
  GeocodedPlace,
  RelativeWindSector,
  RouteLeg,
  RoutePlan,
  RouteWeatherScenarios,
} from "@/types/fishing";

const METERS_PER_NM = 1852;

function toRad(d: number): number {
  return (d * Math.PI) / 180;
}
function toDeg(r: number): number {
  return (r * 180) / Math.PI;
}

/** Rotta vera iniziale (gradi, 0-360) dal punto A al punto B (great-circle). */
function initialBearingDeg(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const φ1 = toRad(a.latitude);
  const φ2 = toRad(b.latitude);
  const Δλ = toRad(b.longitude - a.longitude);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Normalizza un angolo in gradi nell'intervallo (-180, 180]. */
function normalizeSigned180(deg: number): number {
  return (((deg + 180) % 360) + 360) % 360 - 180;
}

/** Estrae i tre scenari meteo di rotta (peggiore/migliore/media) dalle
 * previsioni live già calcolate su ciascun leg — nessuna chiamata di rete
 * aggiuntiva. Esportata per essere ricalcolata anche in lettura sui piani
 * persistiti (stesso pattern di NightForecast/PassageCalendar). */
export function computeWeatherScenarios(legs: RouteLeg[]): RouteWeatherScenarios {
  const zero = { windSpeedKn: 0, windGustsKn: 0, waveHeightM: 0 };
  if (legs.length === 0) {
    return { worst: zero, best: zero, average: zero };
  }

  const avg = (values: number[]) =>
    Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 10) / 10;

  const windSpeeds = legs.map((l) => l.windSpeedKn);
  const windGusts = legs.map((l) => l.windGustsKn);
  const waveHeights = legs.map((l) => l.waveHeightM);

  return {
    worst: {
      windSpeedKn: Math.max(...windSpeeds),
      windGustsKn: Math.max(...windGusts),
      waveHeightM: Math.round(Math.max(...waveHeights) * 10) / 10,
    },
    best: {
      windSpeedKn: Math.min(...windSpeeds),
      windGustsKn: Math.min(...windGusts),
      waveHeightM: Math.round(Math.min(...waveHeights) * 10) / 10,
    },
    average: {
      windSpeedKn: avg(windSpeeds),
      windGustsKn: avg(windGusts),
      waveHeightM: avg(waveHeights),
    },
  };
}

function relativeWindSector(angleAbsDeg: number): RelativeWindSector {
  if (angleAbsDeg <= 22.5) return "prua";
  if (angleAbsDeg <= 67.5) return "mure";
  if (angleAbsDeg <= 112.5) return "traverso";
  if (angleAbsDeg <= 157.5) return "poppa-quartiere";
  return "poppa";
}

/** Istante UTC (ms) corrispondente a un orario locale "wall clock" note
 * l'offset UTC (secondi) della zona. */
function localToUtcMs(
  dateISO: string,
  hour: number,
  minute: number,
  utcOffsetSeconds: number
): number {
  const [y, m, d] = dateISO.split("-").map(Number);
  const naiveUtcMs = Date.UTC(y, m - 1, d, hour, minute, 0);
  return naiveUtcMs - utcOffsetSeconds * 1000;
}

/** Converte un istante UTC (ms) in data/ora locale "wall clock" (stesso
 * trucco di formatLocalTime in lib/utils.ts: shift + lettura come UTC). */
function utcMsToLocal(
  utcMs: number,
  utcOffsetSeconds: number
): { dateISO: string; hour: number; minute: number } {
  const shifted = new Date(utcMs + utcOffsetSeconds * 1000);
  return {
    dateISO: shifted.toISOString().slice(0, 10),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

export interface RoutePlanningInput {
  /** Almeno due punti, già geocodificati (partenza, eventuali waypoint, arrivo). */
  waypoints: GeocodedPlace[];
  cruiseSpeedKn: number;
  fuelLPerHour?: number;
  departureDateISO: string;
  departureHour: number;
  departureMinute: number;
}

/**
 * Calcola l'intero piano di rotta: per ogni leg, distanza/rotta sono pura
 * geometria (nessuna chiamata di rete); il meteo-mare stimato all'arrivo di
 * ciascun leg richiede invece una query Open-Meteo per waypoint, all'ETA
 * calcolato — tutte lanciate in parallelo una volta note le distanze.
 *
 * Semplificazione: l'offset UTC (fuso orario) è risolto una sola volta sul
 * primo waypoint e riusato per tutta la rotta. Per tratte interamente nel
 * Mediterraneo (stesso fuso in tutta la traversata) è corretto; su una
 * rotta che attraversa un cambio di fuso l'errore è al più di qualche ora
 * sull'orario locale mostrato, non sui calcoli di distanza/ETA assoluto.
 */
export async function planRoute(input: RoutePlanningInput): Promise<RoutePlan> {
  const { waypoints, cruiseSpeedKn, fuelLPerHour } = input;

  if (waypoints.length < 2) {
    throw new Error("Servono almeno due punti per calcolare una rotta.");
  }
  if (!(cruiseSpeedKn > 0)) {
    throw new Error("La velocità di crociera deve essere maggiore di zero.");
  }

  // Bootstrap: risolve l'offset UTC della zona interrogando il primo waypoint.
  const bootstrapWeather = await fetchWeatherConditions(
    waypoints[0].latitude,
    waypoints[0].longitude,
    input.departureDateISO,
    input.departureHour
  );
  const utcOffsetSeconds = bootstrapWeather.utcOffsetSeconds;
  const departureUtcMs = localToUtcMs(
    input.departureDateISO,
    input.departureHour,
    input.departureMinute,
    utcOffsetSeconds
  );

  // Passata 1: geometria pura (distanza, rotta, ETA cumulativo) — nessuna rete.
  interface LegGeometry {
    from: GeocodedPlace;
    to: GeocodedPlace;
    distanceNm: number;
    bearingDeg: number;
    etaUtcMs: number;
    pathCoordinates?: [number, number][];
    isSeaRouted: boolean;
  }

  let cumulativeHours = 0;
  let totalDistanceNm = 0;
  const geometry: LegGeometry[] = [];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const from = waypoints[i];
    const to = waypoints[i + 1];
    // Rotta via mare stimata (rete marittima precalcolata + fallback Coast
    // Avoidance per le tratte corte, vedi lib/seaRouting.ts): usata per
    // distanza/ETA e per disegnare un percorso più realistico quando
    // disponibile; altrimenti si ricade sulla linea diretta (già presente).
    const seaRoute = await computeSeaRoute(from, to);
    const distanceNm = seaRoute?.distanceNm ?? haversineDistanceM(from, to) / METERS_PER_NM;
    const bearingDeg = initialBearingDeg(from, to);

    cumulativeHours += distanceNm / cruiseSpeedKn;
    totalDistanceNm += distanceNm;

    geometry.push({
      from,
      to,
      distanceNm,
      bearingDeg,
      etaUtcMs: departureUtcMs + cumulativeHours * 3600000,
      pathCoordinates: seaRoute?.coordinates,
      isSeaRouted: Boolean(seaRoute),
    });
  }

  // Passata 2: meteo-mare all'ETA di ciascun leg, in parallelo.
  const legs: RouteLeg[] = await Promise.all(
    geometry.map(async (g) => {
      const local = utcMsToLocal(g.etaUtcMs, utcOffsetSeconds);
      const [marine, weather] = await Promise.all([
        fetchMarineConditions(g.to.latitude, g.to.longitude, local.dateISO, local.hour),
        fetchWeatherConditions(g.to.latitude, g.to.longitude, local.dateISO, local.hour),
      ]);

      const relAngleAbs = Math.abs(normalizeSigned180(weather.windDirectionDeg - g.bearingDeg));

      const warnings: string[] = [];
      if (weather.windSpeedKmh > 34) {
        warnings.push("Vento forte previsto su questo tratto.");
      }
      if (weather.windGustsKmh > 45) {
        warnings.push("Raffiche forti previste.");
      }
      if (marine.waveHeightM > 2) {
        warnings.push("Mare mosso/molto mosso previsto su questo tratto.");
      }

      return {
        from: g.from.name,
        to: g.to.name,
        distanceNm: Math.round(g.distanceNm * 10) / 10,
        bearingDeg: Math.round(g.bearingDeg),
        etaISO: new Date(g.etaUtcMs).toISOString(),
        windSpeedKn: Math.round(kmhToKnots(weather.windSpeedKmh) * 10) / 10,
        windGustsKn: Math.round(kmhToKnots(weather.windGustsKmh) * 10) / 10,
        windDirectionDeg: weather.windDirectionDeg,
        relativeWindAngleDeg: Math.round(relAngleAbs),
        relativeWindSector: relativeWindSector(relAngleAbs),
        waveHeightM: marine.waveHeightM,
        wavePeriodS: marine.wavePeriodS,
        waveDirectionDeg: marine.waveDirectionDeg,
        currentSpeedKmh: marine.currentSpeedKmh,
        currentDirectionDeg: marine.currentDirectionDeg,
        seaSurfaceTempC: marine.seaSurfaceTempC,
        warnings,
        pathCoordinates: g.pathCoordinates,
        isSeaRouted: g.isSeaRouted,
      } satisfies RouteLeg;
    })
  );

  const fuelLitersEstimate = fuelLPerHour
    ? Math.round(cumulativeHours * fuelLPerHour * 10) / 10
    : undefined;

  return {
    waypoints: waypoints.map((w) => ({
      name: w.name,
      latitude: w.latitude,
      longitude: w.longitude,
    })),
    legs,
    totalDistanceNm: Math.round(totalDistanceNm * 10) / 10,
    totalDurationHours: Math.round(cumulativeHours * 100) / 100,
    cruiseSpeedKn,
    fuelLPerHour,
    fuelLitersEstimate,
    departureISO: new Date(departureUtcMs).toISOString(),
    etaFinalISO: new Date(departureUtcMs + cumulativeHours * 3600000).toISOString(),
    utcOffsetSeconds,
    weatherScenarios: computeWeatherScenarios(legs),
  };
}
