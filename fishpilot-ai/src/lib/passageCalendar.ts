// ============================================================
// /lib/passageCalendar.ts — Ecosistema ⛵ Traversata: Calendario Traversata
//
// Analizza i prossimi 7 giorni (a partire dalla data di partenza) nel punto
// di partenza della rotta e indica, per ciascun giorno, la finestra oraria
// più favorevole (mare calmo, vento non contrario) per affrontare la
// traversata. Approssimazione dichiarata: usa solo il punto di partenza
// (non l'intera rotta) e fasce orarie fisse di 6h — sufficiente per
// un'indicazione di massima, non un bollettino di navigazione.
// ============================================================

import { fetchMarineSeries, fetchWeatherSeries } from "@/lib/weather";
import { kmhToKnots } from "@/lib/utils";
import type {
  PassageCalendarResult,
  PassageDay,
  PassageRating,
  PassageWindow,
} from "@/types/fishing";

const WINDOWS: { label: string; startHour: number; endHour: number }[] = [
  { label: "Notte (00:00–06:00)", startHour: 0, endHour: 6 },
  { label: "Mattina (06:00–12:00)", startHour: 6, endHour: 12 },
  { label: "Pomeriggio (12:00–18:00)", startHour: 12, endHour: 18 },
  { label: "Sera (18:00–24:00)", startHour: 18, endHour: 24 },
];

function rate(avgWindKn: number, avgWaveM: number): PassageRating {
  if (avgWindKn > 18 || avgWaveM > 1) return "sconsigliata";
  if (avgWindKn > 10 || avgWaveM > 0.5) return "discreta";
  return "buona";
}

function ratingRank(r: PassageRating): number {
  return r === "buona" ? 0 : r === "discreta" ? 1 : 2;
}

function addDays(dateISO: string, days: number): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Calcola il calendario dei prossimi 7 giorni (incluso `startDateISO`) per
 * il punto indicato. Nessuna eccezione: in caso di errore di rete/dati
 * mancanti va gestito dal chiamante (try/catch), qui si assume la rete
 * disponibile. */
export async function computePassageCalendar(
  latitude: number,
  longitude: number,
  startDateISO: string
): Promise<PassageCalendarResult> {
  const endDateISO = addDays(startDateISO, 6);

  const [weatherSeries, marineSeries] = await Promise.all([
    fetchWeatherSeries(latitude, longitude, startDateISO, endDateISO),
    fetchMarineSeries(latitude, longitude, startDateISO, endDateISO),
  ]);

  const days: PassageDay[] = [];

  for (let d = 0; d < 7; d++) {
    const dayISO = addDays(startDateISO, d);
    const windows: PassageWindow[] = WINDOWS.map((w) => {
      let windSum = 0;
      let waveSum = 0;
      let count = 0;

      for (let h = w.startHour; h < w.endHour; h++) {
        const target = `${dayISO}T${String(h).padStart(2, "0")}:00`;
        const wIdx = weatherSeries.times.indexOf(target);
        const mIdx = marineSeries.times.indexOf(target);
        if (wIdx === -1) continue;

        windSum += kmhToKnots(weatherSeries.windSpeedKmh[wIdx] ?? 0);
        waveSum += mIdx !== -1 ? (marineSeries.waveHeightM[mIdx] ?? 0) : 0;
        count++;
      }

      const avgWindKn = count > 0 ? windSum / count : 0;
      const avgWaveM = count > 0 ? waveSum / count : 0;

      return {
        label: w.label,
        startHour: w.startHour,
        endHour: w.endHour,
        avgWindKn: Math.round(avgWindKn * 10) / 10,
        avgWaveM: Math.round(avgWaveM * 10) / 10,
        rating: rate(avgWindKn, avgWaveM),
      };
    });

    const validWindows = windows.filter((w) => w.avgWindKn > 0 || w.avgWaveM > 0);
    const bestWindow = (validWindows.length > 0 ? validWindows : windows).reduce((best, w) =>
      ratingRank(w.rating) < ratingRank(best.rating) ? w : best
    );

    days.push({ dateISO: dayISO, bestWindow, rating: bestWindow.rating });
  }

  return { days };
}
