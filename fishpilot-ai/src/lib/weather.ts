// Recupera dati meteo-marini da Open-Meteo (nessuna API key richiesta):
// - Marine Weather API  -> altezza onde, periodo onde, temperatura mare
// - Forecast API        -> vento, nuvolosità, pressione, temperatura aria,
//                          alba/tramonto del giorno richiesto
//
// Docs: https://open-meteo.com/en/docs/marine-weather-api
//       https://open-meteo.com/en/docs

export interface RawMarinePoint {
  waveHeightM: number;
  wavePeriodS: number;
  /** Direzione di provenienza dell'onda di fondo (gradi, 0=Nord): usata dal
   * modulo Rada per lo Shelter Score. */
  waveDirectionDeg: number;
  seaSurfaceTempC: number;
  /** Non sempre disponibile: il modello di corrente di Open-Meteo non copre tutte le zone. */
  currentSpeedKmh?: number;
  currentDirectionDeg?: number;
}

export interface RawWeatherPoint {
  windSpeedKmh: number;
  windDirectionDeg: number;
  /** Offset UTC (secondi) risolto da Open-Meteo per la data/zona richiesta
   * (include DST): usato per mostrare orari locali corretti nelle Tabelle
   * Solunari e nel Grafico Maree senza bisogno di un database di fusi orari. */
  utcOffsetSeconds: number;
  cloudCoverPct: number;
  pressureHpa: number;
  airTempC: number;
  sunrise: string;
  sunset: string;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Trova l'indice dell'array `times` più vicino all'orario richiesto.
 * Se non trova un match esatto (es. data fuori dalla finestra di forecast),
 * usa il timestamp disponibile più vicino invece di far fallire la richiesta. */
function closestHourIndex(times: string[], targetISO: string): number {
  const exact = times.indexOf(targetISO);
  if (exact !== -1) return exact;

  const targetMs = new Date(targetISO).getTime();
  let bestIdx = 0;
  let bestDiff = Infinity;

  times.forEach((t, i) => {
    const diff = Math.abs(new Date(t).getTime() - targetMs);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = i;
    }
  });

  return bestIdx;
}

export async function fetchMarineConditions(
  latitude: number,
  longitude: number,
  dateISO: string,
  hour: number
): Promise<RawMarinePoint> {
  const url =
    `https://marine-api.open-meteo.com/v1/marine?latitude=${latitude}&longitude=${longitude}` +
    `&hourly=wave_height,wave_period,wave_direction,sea_surface_temperature,ocean_current_velocity,ocean_current_direction` +
    `&start_date=${dateISO}&end_date=${dateISO}&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Impossibile recuperare le condizioni del mare (Open-Meteo Marine API).");
  }

  const data = await res.json();
  const times: string[] = data.hourly?.time ?? [];

  if (times.length === 0) {
    throw new Error(
      "Nessun dato marino disponibile per questa data/zona. Prova con una data entro i prossimi 16 giorni."
    );
  }

  const target = `${dateISO}T${pad(hour)}:00`;
  const idx = closestHourIndex(times, target);

  const currentSpeedKmh = data.hourly.ocean_current_velocity?.[idx];
  const currentDirectionDeg = data.hourly.ocean_current_direction?.[idx];

  return {
    waveHeightM: data.hourly.wave_height?.[idx] ?? 0,
    wavePeriodS: data.hourly.wave_period?.[idx] ?? 0,
    waveDirectionDeg: data.hourly.wave_direction?.[idx] ?? 0,
    seaSurfaceTempC: data.hourly.sea_surface_temperature?.[idx] ?? 18,
    currentSpeedKmh: typeof currentSpeedKmh === "number" ? currentSpeedKmh : undefined,
    currentDirectionDeg:
      typeof currentDirectionDeg === "number" ? currentDirectionDeg : undefined,
  };
}

export async function fetchWeatherConditions(
  latitude: number,
  longitude: number,
  dateISO: string,
  hour: number
): Promise<RawWeatherPoint> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&hourly=wind_speed_10m,wind_direction_10m,cloud_cover,surface_pressure,temperature_2m` +
    `&daily=sunrise,sunset` +
    `&start_date=${dateISO}&end_date=${dateISO}&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Impossibile recuperare i dati meteo (Open-Meteo Forecast API).");
  }

  const data = await res.json();
  const times: string[] = data.hourly?.time ?? [];

  if (times.length === 0) {
    throw new Error(
      "Nessun dato meteo disponibile per questa data/zona. Prova con una data entro i prossimi 16 giorni."
    );
  }

  const target = `${dateISO}T${pad(hour)}:00`;
  const idx = closestHourIndex(times, target);

  return {
    windSpeedKmh: data.hourly.wind_speed_10m?.[idx] ?? 0,
    windDirectionDeg: data.hourly.wind_direction_10m?.[idx] ?? 0,
    utcOffsetSeconds: data.utc_offset_seconds ?? 0,
    cloudCoverPct: data.hourly.cloud_cover?.[idx] ?? 0,
    pressureHpa: data.hourly.surface_pressure?.[idx] ?? 1013,
    airTempC: data.hourly.temperature_2m?.[idx] ?? 20,
    sunrise: data.daily?.sunrise?.[0] ?? `${dateISO}T06:30`,
    sunset: data.daily?.sunset?.[0] ?? `${dateISO}T20:00`,
  };
}
