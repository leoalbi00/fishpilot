// ============================================================
// /lib/solunar.ts
//
// Tabelle solunari: la teoria solunare (Knight, 1926) ipotizza picchi di
// attività dei pesci in corrispondenza dei passaggi della Luna al
// meridiano locale. Periodi Major (~2h, centrati su culminazione e
// anti-culminazione lunare) e Minor (~1h, centrati su sorgere/tramonto
// lunare). Approssimazione classica, non garanzia di cattura.
// ============================================================

import { computeMoonEvents } from "@/lib/astro";
import type { SolunarPeriod, SolunarResult } from "@/types/fishing";

const MAJOR_HALF_WINDOW_MIN = 60;
const MINOR_HALF_WINDOW_MIN = 30;

function period(
  kind: "major" | "minor",
  center: Date,
  halfWindowMin: number,
  label: string
): SolunarPeriod {
  return {
    kind,
    startISO: new Date(center.getTime() - halfWindowMin * 60000).toISOString(),
    endISO: new Date(center.getTime() + halfWindowMin * 60000).toISOString(),
    label,
  };
}

/** Calcola le tabelle solunari per il giorno locale di `referenceDate`
 * (qualsiasi istante di quel giorno) nello spot indicato. */
export function computeSolunar(
  referenceDate: Date,
  latitude: number,
  longitude: number
): SolunarResult {
  const events = computeMoonEvents(referenceDate, latitude, longitude);

  const periods: SolunarPeriod[] = [];

  if (events.transit) {
    periods.push(
      period("major", events.transit, MAJOR_HALF_WINDOW_MIN, "Major — culminazione lunare")
    );
  }
  if (events.antitransit) {
    periods.push(
      period(
        "major",
        events.antitransit,
        MAJOR_HALF_WINDOW_MIN,
        "Major — luna sotto l'orizzonte (anti-transito)"
      )
    );
  }
  if (events.rise) {
    periods.push(period("minor", events.rise, MINOR_HALF_WINDOW_MIN, "Minor — sorgere della luna"));
  }
  if (events.set) {
    periods.push(period("minor", events.set, MINOR_HALF_WINDOW_MIN, "Minor — tramonto della luna"));
  }

  periods.sort((a, b) => a.startISO.localeCompare(b.startISO));

  return {
    moonPhaseLabel: events.phaseLabel,
    moonIllumination: events.illumination,
    periods,
  };
}
