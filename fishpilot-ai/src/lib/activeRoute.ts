// ============================================================
// /lib/activeRoute.ts — Rotta attiva per il Chartplotter
//
// Cache in localStorage (non sessionStorage: una Traversata pianificata
// resta "attiva" anche riaprendo l'app in un momento successivo, finché non
// se ne calcola una nuova) dell'ultimo piano di rotta calcolato, letta dal
// Chartplotter per il calcolo del Cross Track Error. Nessuna tabella
// Supabase dedicata: è solo una comodità locale del dispositivo.
// ============================================================

import type { RoutePlanResult } from "@/types/fishing";

const KEY = "fishpilot_active_route";

export function cacheActiveRoute(plan: RoutePlanResult) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(plan));
  } catch {
    // localStorage non disponibile: il Chartplotter mostrerà "nessuna rotta attiva".
  }
}

export function readActiveRoute(): RoutePlanResult | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RoutePlanResult) : null;
  } catch {
    return null;
  }
}
