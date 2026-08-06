// ============================================================
// /lib/nightForecast.ts — Modulo Rada: Previsione Notturna
//
// Trend di vento e onda dalle 20:00 alle 08:00 del giorno successivo, per
// valutare se la sosta in rada resterà sicura durante la notte. Nessun
// calcolo aggiuntivo rispetto al meteo già usato altrove: si seleziona la
// finestra oraria dalla serie Open-Meteo già disponibile in lib/weather.ts.
// ============================================================

import { fetchMarineSeries, fetchWeatherSeries } from "@/lib/weather";
import type { NightForecastPoint, NightForecastResult } from "@/types/fishing";

function addDays(dateISO: string, days: number): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Previsione vento/onda per la notte che segue `referenceDateISO`
 * (20:00 -> 08:00 del giorno dopo), nello spot indicato. */
export async function computeNightForecast(
  referenceDateISO: string,
  latitude: number,
  longitude: number
): Promise<NightForecastResult> {
  const nextDay = addDays(referenceDateISO, 1);

  const [weatherSeries, marineSeries] = await Promise.all([
    fetchWeatherSeries(latitude, longitude, referenceDateISO, nextDay),
    fetchMarineSeries(latitude, longitude, referenceDateISO, nextDay),
  ]);

  const startTarget = `${referenceDateISO}T20:00`;
  const endTarget = `${nextDay}T08:00`;

  const startIdx = weatherSeries.times.findIndex((t) => t >= startTarget);
  const endIdx = weatherSeries.times.findIndex((t) => t >= endTarget);

  const from = startIdx === -1 ? 0 : startIdx;
  const to = endIdx === -1 ? weatherSeries.times.length - 1 : endIdx;

  const points: NightForecastPoint[] = [];
  for (let i = from; i <= to; i++) {
    const time = weatherSeries.times[i];
    const marineIdx = marineSeries.times.indexOf(time);

    points.push({
      timeISO: time,
      windSpeedKmh: weatherSeries.windSpeedKmh[i] ?? 0,
      windGustsKmh: weatherSeries.windGustsKmh[i] ?? 0,
      windDirectionDeg: weatherSeries.windDirectionDeg[i] ?? 0,
      waveHeightM: marineIdx !== -1 ? (marineSeries.waveHeightM[marineIdx] ?? 0) : 0,
    });
  }

  const maxWindSpeedKmh = points.reduce((max, p) => Math.max(max, p.windSpeedKmh), 0);
  const maxWaveHeightM = points.reduce((max, p) => Math.max(max, p.waveHeightM), 0);

  let trend: NightForecastResult["trend"] = "stabile";
  if (points.length >= 2) {
    const first = points[0];
    const last = points[points.length - 1];
    // Pesi euristici: 10 km/h di vento "pesano" come 1 m di onda.
    const score = (last.windSpeedKmh - first.windSpeedKmh) / 10 + (last.waveHeightM - first.waveHeightM);
    if (score > 0.5) trend = "peggiora";
    else if (score < -0.5) trend = "migliora";
  }

  return { points, trend, maxWindSpeedKmh, maxWaveHeightM };
}
