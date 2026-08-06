// ============================================================
// /lib/tides.ts
//
// Marea astronomica approssimata: modello di "marea di equilibrio"
// semidiurna, somma delle componenti principali M2 (lunare, periodo
// 12h25.2m) e S2 (solare, periodo 12h esatte). La composizione delle due
// riproduce correttamente il ciclo sizigie/quadrature (~14.8 giorni), ma
// le AMPIEZZE sono valori indicativi per il Mediterraneo, non calibrati
// sulla stazione costiera locale: il Mediterraneo ha maree deboli e
// fortemente influenzate dalla morfologia costiera/risonanza di bacino,
// che questo modello puramente astronomico non cattura. Il grafico va
// letto come indicazione dei MOMENTI di alta/bassa marea, non delle
// altezze assolute.
// ============================================================

import { moonDistanceEarthRadii, moonHourAngleDeg, sunHourAngleDeg } from "@/lib/astro";
import type { TidePeak, TidePoint, TideResult } from "@/types/fishing";

const M2_AMPLITUDE_M = 0.15;
const S2_AMPLITUDE_M = 0.06;
const MEAN_MOON_DISTANCE_EARTH_RADII = 60.2666;

const DEG = Math.PI / 180;

/** Altezza di marea (m, relativa al livello medio) all'istante `date`. */
function tideHeight(date: Date, longitudeEastDeg: number): number {
  const haMoon = moonHourAngleDeg(date, longitudeEastDeg);
  const haSun = sunHourAngleDeg(date, longitudeEastDeg);

  // La forza generatrice di marea scala con 1/distanza^3: la componente
  // lunare si rinforza vicino al perigeo.
  const distanceFactor = Math.pow(
    MEAN_MOON_DISTANCE_EARTH_RADII / moonDistanceEarthRadii(date),
    3
  );

  const m2 = M2_AMPLITUDE_M * distanceFactor * Math.cos(2 * haMoon * DEG);
  const s2 = S2_AMPLITUDE_M * Math.cos(2 * haSun * DEG);

  return m2 + s2;
}

/** Curva di marea + picchi di alta/bassa marea per le prossime `hoursSpan`
 * ore a partire dalla mezzanotte UTC del giorno di `referenceDate`. */
export function computeTide(
  referenceDate: Date,
  longitudeEastDeg: number,
  hoursSpan = 48
): TideResult {
  const dayStart = new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth(),
      referenceDate.getUTCDate(),
      0,
      0,
      0
    )
  );
  const stepMin = 10;
  const totalSteps = Math.round((hoursSpan * 60) / stepMin);

  const points: TidePoint[] = [];
  for (let i = 0; i <= totalSteps; i++) {
    const t = new Date(dayStart.getTime() + i * stepMin * 60000);
    points.push({ timeISO: t.toISOString(), heightM: tideHeight(t, longitudeEastDeg) });
  }

  const peaks: TidePeak[] = [];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1].heightM;
    const cur = points[i].heightM;
    const next = points[i + 1].heightM;
    if (cur > prev && cur >= next) {
      peaks.push({ timeISO: points[i].timeISO, heightM: cur, type: "alta" });
    } else if (cur < prev && cur <= next) {
      peaks.push({ timeISO: points[i].timeISO, heightM: cur, type: "bassa" });
    }
  }

  return { points, peaks };
}
