// Cronologia delle ultime ricerche di località (spot/waypoint), per
// richiamo rapido senza ridigitare. Solo localStorage, nessun account.
const KEY = "fishpilot_recent_searches";
const MAX_ITEMS = 8;

export interface RecentSearch {
  label: string;
  latitude: number;
  longitude: number;
}

export function saveRecentSearch(item: RecentSearch) {
  if (!item.label.trim()) return;
  try {
    const list = readRecentSearches();
    const deduped = [item, ...list.filter((s) => s.label !== item.label)].slice(0, MAX_ITEMS);
    window.localStorage.setItem(KEY, JSON.stringify(deduped));
  } catch {
    // localStorage non disponibile: nessun impatto bloccante.
  }
}

export function readRecentSearches(): RecentSearch[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RecentSearch[]) : [];
  } catch {
    return [];
  }
}
