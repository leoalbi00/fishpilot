// ============================================================
// /lib/refugePorts.ts — Ecosistema ⛵ Traversata: Porti di Rifugio
//
// Cerca porti/marine nei pressi della rotta interrogando l'Overpass API di
// OpenStreetMap (dato aperto, nessuna chiave richiesta) — coerente con le
// altre fonti dati "libere" già usate nell'app (Nominatim per il reverse
// geocoding, tile OpenFreeMap per la mappa). Non è un database ufficiale
// dei porti: copertura e completezza dipendono dal mappamento OSM locale.
// Best-effort: qualunque errore/timeout restituisce un elenco vuoto invece
// di far fallire l'intera pianificazione della rotta.
// ============================================================

import { haversineDistanceM } from "@/lib/utils";
import type { RefugePort, RouteLeg, RouteWaypoint } from "@/types/fishing";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const METERS_PER_NM = 1852;
const BBOX_PADDING_DEG = 0.15; // ~15 km di margine attorno alla rotta

interface OverpassElement {
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: { name?: string };
}

/** Cerca porti/marine entro un bounding box che racchiude tutti i
 * waypoint, ordinati per distanza dal punto di rotta più vicino. */
export async function findRefugePorts(
  waypoints: RouteWaypoint[],
  maxResults = 6
): Promise<RefugePort[]> {
  if (waypoints.length === 0) return [];

  const lats = waypoints.map((w) => w.latitude);
  const lons = waypoints.map((w) => w.longitude);
  const south = Math.min(...lats) - BBOX_PADDING_DEG;
  const north = Math.max(...lats) + BBOX_PADDING_DEG;
  const west = Math.min(...lons) - BBOX_PADDING_DEG;
  const east = Math.max(...lons) + BBOX_PADDING_DEG;
  const bbox = `${south},${west},${north},${east}`;

  const query =
    `[out:json][timeout:15];` +
    `(node["leisure"="marina"](${bbox});way["leisure"="marina"](${bbox});` +
    `node["harbour"="yes"](${bbox});node["seamark:type"="harbour"](${bbox}););` +
    `out center ${maxResults * 4};`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);

    const res = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: query,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return [];

    const data = (await res.json()) as { elements?: OverpassElement[] };
    const elements = data.elements ?? [];

    const ports = elements
      .map((el): RefugePort | null => {
        const latitude = el.lat ?? el.center?.lat;
        const longitude = el.lon ?? el.center?.lon;
        if (typeof latitude !== "number" || typeof longitude !== "number") return null;

        const distanceNm =
          Math.min(
            ...waypoints.map((w) => haversineDistanceM({ latitude, longitude }, w))
          ) / METERS_PER_NM;

        return {
          name: el.tags?.name ?? "Porto/marina senza nome (OSM)",
          latitude,
          longitude,
          distanceNm: Math.round(distanceNm * 10) / 10,
        };
      })
      .filter((p): p is RefugePort => p !== null)
      .sort((a, b) => a.distanceNm - b.distanceNm)
      .slice(0, maxResults);

    return ports;
  } catch {
    return [];
  }
}

/** Attacca un avviso ai porti se la rotta attraversa condizioni pericolose
 * (derivato dalle previsioni già calcolate sui leg, NON un bollettino
 * ufficiale di burrasca). */
export function attachRouteWarnings(ports: RefugePort[], legs: RouteLeg[]): RefugePort[] {
  const warnings = Array.from(new Set(legs.flatMap((l) => l.warnings)));
  if (warnings.length === 0) return ports;

  const warning = `Previsioni lungo la rotta: ${warnings.join(" ")}`;
  return ports.map((p) => ({ ...p, warning }));
}
