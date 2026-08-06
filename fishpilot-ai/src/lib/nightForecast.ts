// ============================================================
// /lib/nightForecast.ts — Modulo Rada: Previsione H24
//
// Trend di vento e onda sulle 24h che seguono le 12:00 di `referenceDateISO`
// (copre quindi sia il pomeriggio/sera sia l'intera notte successiva), per
// valutare se la sosta in rada resterà sicura. Nessun calcolo aggiuntivo
// rispetto al meteo già usato altrove: si seleziona la finestra oraria dalla
// serie Open-Meteo già disponibile in lib/weather.ts.
// ============================================================

import { fetchMarineSeries, fetchWeatherSeries } from "@/lib/weather";
import { kmhToKnots } from "@/lib/utils";
import type { NightForecastPoint, NightForecastResult } from "@/types/fishing";

function addDays(dateISO: string, days: number): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Previsione vento/onda sulle 24h che seguono le 12:00 di
 * `referenceDateISO` (pomeriggio + intera notte successiva), nello spot
 * indicato. */
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

  const startTarget = `${referenceDateISO}T12:00`;
  const endTarget = `${nextDay}T12:00`;

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

  const maxWindGustsKmh = points.reduce((max, p) => Math.max(max, p.windGustsKmh), 0);

  // Soglie di allerta (stesse usate per il colore rosso dei punti in
  // NightForecastCard): vento sostenuto >18kn, raffiche >30kn, onda >1m.
  const stormReasons: string[] = [];
  if (kmhToKnots(maxWindSpeedKmh) > 18) {
    stormReasons.push(`vento fino a ${kmhToKnots(maxWindSpeedKmh).toFixed(0)} kn`);
  }
  if (kmhToKnots(maxWindGustsKmh) > 30) {
    stormReasons.push(`raffiche fino a ${kmhToKnots(maxWindGustsKmh).toFixed(0)} kn`);
  }
  if (maxWaveHeightM > 1) {
    stormReasons.push(`onda fino a ${maxWaveHeightM.toFixed(1)} m`);
  }

  return {
    points,
    trend,
    maxWindSpeedKmh,
    maxWaveHeightM,
    stormWarning: stormReasons.length > 0,
    stormReasons,
  };
}
