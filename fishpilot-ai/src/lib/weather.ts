// Recupera dati meteo-marini da Open-Meteo (nessuna API key richiesta):
// - Marine Weather API  -> altezza onde, periodo onde, direzione onda,
//                          corrente, temperatura mare
// - Forecast API        -> vento, raffiche, nuvolosità, pressione,
//                          temperatura aria, alba/tramonto
//
// Le funzioni *Series recuperano l'intera serie oraria per un intervallo di
// date (usate da Traversata per il meteo lungo la rotta e da Rada per la
// previsione notturna); *Conditions restano wrapper "un solo orario" per il
// flusso di analisi esistente (Spot/Tratta), basati sulle stesse serie.
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
  windGustsKmh: number;
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

export interface MarineSeries {
  times: string[];
  waveHeightM: number[];
  wavePeriodS: number[];
  waveDirectionDeg: number[];
  seaSurfaceTempC: number[];
  currentSpeedKmh: (number | undefined)[];
  currentDirectionDeg: (number | undefined)[];
}

export interface WeatherSeries {
  times: string[];
  windSpeedKmh: number[];
  windGustsKmh: number[];
  windDirectionDeg: number[];
  cloudCoverPct: number[];
  pressureHpa: number[];
  airTempC: number[];
  sunrise: string;
  sunset: string;
  utcOffsetSeconds: number;
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

export async function fetchMarineSeries(
  latitude: number,
  longitude: number,
  startDateISO: string,
  endDateISO: string
): Promise<MarineSeries> {
  const url =
    `https://marine-api.open-meteo.com/v1/marine?latitude=${latitude}&longitude=${longitude}` +
    `&hourly=wave_height,wave_period,wave_direction,sea_surface_temperature,ocean_current_velocity,ocean_current_direction` +
    `&start_date=${startDateISO}&end_date=${endDateISO}&timezone=auto`;

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

  return {
    times,
    waveHeightM: data.hourly.wave_height ?? [],
    wavePeriodS: data.hourly.wave_period ?? [],
    waveDirectionDeg: data.hourly.wave_direction ?? [],
    seaSurfaceTempC: data.hourly.sea_surface_temperature ?? [],
    currentSpeedKmh: data.hourly.ocean_current_velocity ?? [],
    currentDirectionDeg: data.hourly.ocean_current_direction ?? [],
  };
}

export async function fetchWeatherSeries(
  latitude: number,
  longitude: number,
  startDateISO: string,
  endDateISO: string
): Promise<WeatherSeries> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
    `&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m,cloud_cover,surface_pressure,temperature_2m` +
    `&daily=sunrise,sunset` +
    `&start_date=${startDateISO}&end_date=${endDateISO}&timezone=auto`;

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

  return {
    times,
    windSpeedKmh: data.hourly.wind_speed_10m ?? [],
    windGustsKmh: data.hourly.wind_gusts_10m ?? [],
    windDirectionDeg: data.hourly.wind_direction_10m ?? [],
    cloudCoverPct: data.hourly.cloud_cover ?? [],
    pressureHpa: data.hourly.surface_pressure ?? [],
    airTempC: data.hourly.temperature_2m ?? [],
    sunrise: data.daily?.sunrise?.[0] ?? `${startDateISO}T06:30`,
    sunset: data.daily?.sunset?.[0] ?? `${startDateISO}T20:00`,
    utcOffsetSeconds: data.utc_offset_seconds ?? 0,
  };
}

export async function fetchMarineConditions(
  latitude: number,
  longitude: number,
  dateISO: string,
  hour: number
): Promise<RawMarinePoint> {
  const series = await fetchMarineSeries(latitude, longitude, dateISO, dateISO);
  const idx = closestHourIndex(series.times, `${dateISO}T${pad(hour)}:00`);

  const currentSpeedKmh = series.currentSpeedKmh[idx];
  const currentDirectionDeg = series.currentDirectionDeg[idx];

  return {
    waveHeightM: series.waveHeightM[idx] ?? 0,
    wavePeriodS: series.wavePeriodS[idx] ?? 0,
    waveDirectionDeg: series.waveDirectionDeg[idx] ?? 0,
    seaSurfaceTempC: series.seaSurfaceTempC[idx] ?? 18,
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
  const series = await fetchWeatherSeries(latitude, longitude, dateISO, dateISO);
  const idx = closestHourIndex(series.times, `${dateISO}T${pad(hour)}:00`);

  return {
    windSpeedKmh: series.windSpeedKmh[idx] ?? 0,
    windGustsKmh: series.windGustsKmh[idx] ?? 0,
    windDirectionDeg: series.windDirectionDeg[idx] ?? 0,
    utcOffsetSeconds: series.utcOffsetSeconds,
    cloudCoverPct: series.cloudCoverPct[idx] ?? 0,
    pressureHpa: series.pressureHpa[idx] ?? 1013,
    airTempC: series.airTempC[idx] ?? 20,
    sunrise: series.sunrise,
    sunset: series.sunset,
  };
}

/** Indice dell'orario più vicino a `targetISO`: esportata per riuso da
 * lib/routePlanning.ts e lib/nightForecast.ts (stessa logica di selezione
 * usata internamente qui). */
export { closestHourIndex };
