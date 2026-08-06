// Fallback locale per l'ecosistema Traversata: se /api/route non riesce a
// salvare il piano su Supabase, la rotta calcolata viene comunque mostrata
// passandola via sessionStorage a /traversata/local invece che tramite un
// id persistito. Vedi RouteForm.tsx e src/app/traversata/local/page.tsx.
import type { RoutePlanResult } from "@/types/fishing";

const KEY = "fishpilot_local_route";

export function saveLocalRoute(plan: RoutePlanResult) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(plan));
  } catch {
    // sessionStorage non disponibile: il fallback locale non potrà leggerlo,
    // ma non è un errore bloccante per l'utente.
  }
}

export function readLocalRoute(): RoutePlanResult | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RoutePlanResult) : null;
  } catch {
    return null;
  }
}
