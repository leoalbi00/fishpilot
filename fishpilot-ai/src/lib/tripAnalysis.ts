import { runFishingAlgorithm } from "@/lib/fishingAlgorithm";
import { buildTimeInfo, getSeason, midpoint } from "@/lib/utils";
import { fetchMarineConditions, fetchWeatherConditions } from "@/lib/weather";
import type {
  FishingAlgorithmResult,
  FishingTechnique,
  GeocodedPlace,
  Season,
  TimeInput,
  ZonePoint,
} from "@/types/fishing";

export interface TripAnalysisInput {
  /** Località di partenza (modalità Tratta) o spot singolo (modalità Spot), già geocodificati. */
  start: GeocodedPlace;
  /** Presente solo in modalità Tratta: se assente, si analizza un unico spot. */
  destination?: GeocodedPlace;
  technique: FishingTechnique;
  dateISO: string; // "YYYY-MM-DD"
  hour: number; // 0-23
  minute: number; // 0-59
}

export interface TripAnalysisResult {
  start: GeocodedPlace;
  destination?: GeocodedPlace;
  season: Season;
  time: TimeInput;
  primary: FishingAlgorithmResult;
  /** Punti campionati: un solo punto in modalità Spot, tre (partenza -> metà -> destinazione) in modalità Tratta. */
  zones: ZonePoint[];
}

/**
 * Analizza uno spot singolo o un'intera tratta: campiona le condizioni
 * meteo-marine (uno o tre punti, a seconda della modalità) ed esegue
 * l'algoritmo di scoring su ciascuno.
 *
 * In modalità Tratta, il report "primary" (score/specie/consigli mostrati in
 * dashboard) è quello calcolato sul punto medio della rotta, rappresentativo
 * della zona di pesca. In modalità Spot è semplicemente l'unico punto.
 */
export async function analyzeTrip(
  input: TripAnalysisInput
): Promise<TripAnalysisResult> {
  const { start, destination } = input;
  const season = getSeason(input.dateISO);

  const samplePoints = destination
    ? [
        { label: start.name, latitude: start.latitude, longitude: start.longitude },
        {
          label: "Rotta (metà percorso)",
          ...midpoint(start, destination),
        },
        {
          label: destination.name,
          latitude: destination.latitude,
          longitude: destination.longitude,
        },
      ]
    : [{ label: start.name, latitude: start.latitude, longitude: start.longitude }];

  const sampled = await Promise.all(
    samplePoints.map(async (point) => {
      const [marine, weather] = await Promise.all([
        fetchMarineConditions(point.latitude, point.longitude, input.dateISO, input.hour),
        fetchWeatherConditions(point.latitude, point.longitude, input.dateISO, input.hour),
      ]);

      const time = buildTimeInfo(
        input.hour,
        input.minute,
        weather.sunrise,
        weather.sunset
      );

      const result = runFishingAlgorithm({
        weather: {
          waveHeightM: marine.waveHeightM,
          wavePeriodS: marine.wavePeriodS,
          cloudCoverPct: weather.cloudCoverPct,
          pressureHpa: weather.pressureHpa,
          airTempC: weather.airTempC,
        },
        seaTemperature: { surfaceTempC: marine.seaSurfaceTempC },
        wind: { speedKmh: weather.windSpeedKmh, directionDeg: weather.windDirectionDeg },
        season,
        time,
        technique: input.technique,
      });

      const zone: ZonePoint = {
        label: point.label,
        latitude: point.latitude,
        longitude: point.longitude,
        score: result.score,
        seaSurfaceTempC: marine.seaSurfaceTempC,
        airTempC: weather.airTempC,
        pressureHpa: weather.pressureHpa,
        waveHeightM: marine.waveHeightM,
        wavePeriodS: marine.wavePeriodS,
        waveDirectionDeg: marine.waveDirectionDeg,
        windSpeedKmh: weather.windSpeedKmh,
        windDirectionDeg: weather.windDirectionDeg,
        currentSpeedKmh: marine.currentSpeedKmh,
        currentDirectionDeg: marine.currentDirectionDeg,
      };

      return { zone, result, time, utcOffsetSeconds: weather.utcOffsetSeconds };
    })
  );

  // In modalità Tratta il punto medio (indice 1) rappresenta la zona di pesca
  // principale; in modalità Spot c'è un solo punto (indice 0).
  const primaryIndex = destination ? 1 : 0;
  const primarySample = sampled[primaryIndex];

  return {
    start,
    destination,
    season,
    time: primarySample.time,
    primary: {
      ...primarySample.result,
      conditions: {
        ...primarySample.result.conditions,
        utcOffsetSeconds: primarySample.utcOffsetSeconds,
      },
    },
    zones: sampled.map((s) => s.zone),
  };
}
