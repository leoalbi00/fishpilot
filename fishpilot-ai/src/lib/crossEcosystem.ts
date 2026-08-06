// ============================================================
// /lib/crossEcosystem.ts — Ponte facoltativo tra ecosistemi
//
// I tre ecosistemi (Traversata/Rada/Pesca) restano indipendenti: nessuno
// stato condiviso di default. Questo modulo esiste solo per il pulsante
// facoltativo "Usa questo spot per..." — porta un punto (lat/lng/etichetta)
// da un risultato all'altro ecosistema, consumato una sola volta (evita che
// una vecchia selezione riappaia in una sessione successiva). Solo
// sessionStorage: nessuna persistenza, nessun impatto su Supabase.
// ============================================================

const KEY = "fishpilot_reuse_spot";

export interface ReuseSpot {
  label: string;
  latitude: number;
  longitude: number;
}

export function saveReuseSpot(spot: ReuseSpot) {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(spot));
  } catch {
    // sessionStorage non disponibile: il pulsante diventa un no-op silenzioso.
  }
}

/** Legge e rimuove lo spot in attesa (consumo singolo). */
export function consumeReuseSpot(): ReuseSpot | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(KEY);
    return JSON.parse(raw) as ReuseSpot;
  } catch {
    return null;
  }
}
