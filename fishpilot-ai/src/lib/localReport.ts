// Fallback locale per gli ecosistemi ⚓ Rada / 🎣 Pesca: se /api/analyze non
// riesce a salvare il rapporto su Supabase, viene comunque mostrato
// passandolo via sessionStorage a /dashboard/local invece che tramite un id
// persistito. Vedi TripForm.tsx, FavoritesPanel.tsx e
// src/app/dashboard/local/page.tsx. Stesso pattern di lib/localRoute.ts.
import type { SpotReportResult } from "@/types/fishing";

const KEY = "fishpilot_local_report";

export function saveLocalReport(report: SpotReportResult) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(report));
  } catch {
    // sessionStorage non disponibile: il fallback locale non potrà leggerlo,
    // ma non è un errore bloccante per l'utente.
  }
}

export function readLocalReport(): SpotReportResult | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SpotReportResult) : null;
  } catch {
    return null;
  }
}
