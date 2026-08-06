// ============================================================
// /lib/seamarkFeatures.ts — Ecosistema 🎣 Pesca: Secche, Scogli e Relitti
//
// Interroga Overpass API (OpenStreetMap, tag seamark:* già usati dai
// portolani digitali e natural=reef) per evidenziare sulla mappa i punti
// di interesse per la pesca nel raggio della zona analizzata: relitti,
// scogli isolati, ostruzioni e secche censite. Stesso pattern best-effort
// di lib/refugePorts.ts e lib/bayDiscovery.ts: qualunque errore/timeout
// restituisce un elenco vuoto, mai un errore bloccante.
// ============================================================

import { haversineDistanceM } from "@/lib/utils";
import type { SeamarkFeature } from "@/types/fishing";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

interface OverpassElement {
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: { "seamark:type"?: string; natural?: string; name?: string };
}

const TYPE_LABELS: Record<SeamarkFeature["type"], string> = {
  relitto: "Relitto",
  scoglio: "Scoglio isolato",
  ostruzione: "Ostruzione",
  secca: "Secca",
};

function classify(tags: OverpassElement["tags"]): SeamarkFeature["type"] | null {
  const seamark = tags?.["seamark:type"];
  if (seamark === "wreck") return "relitto";
  if (seamark === "rock") return "scoglio";
  if (seamark === "obstruction") return "ostruzione";
  if (tags?.natural === "reef") return "secca";
  return null;
}

/** Cerca secche/scogli/relitti/ostruzioni censiti su OSM nel raggio del
 * punto indicato, ordinati per distanza crescente. */
export async function findSeamarkFeatures(
  latitude: number,
  longitude: number,
  radiusM = 5000,
  maxResults = 25
): Promise<SeamarkFeature[]> {
  const query =
    `[out:json][timeout:15];` +
    `(node["seamark:type"="wreck"](around:${radiusM},${latitude},${longitude});` +
    `node["seamark:type"="rock"](around:${radiusM},${latitude},${longitude});` +
    `node["seamark:type"="obstruction"](around:${radiusM},${latitude},${longitude});` +
    `node["natural"="reef"](around:${radiusM},${latitude},${longitude}););` +
    `out center ${maxResults * 3};`;

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

    const features = elements
      .map((el): SeamarkFeature | null => {
        const lat = el.lat ?? el.center?.lat;
        const lon = el.lon ?? el.center?.lon;
        if (typeof lat !== "number" || typeof lon !== "number") return null;

        const type = classify(el.tags);
        if (!type) return null;

        const distanceM = haversineDistanceM(
          { latitude, longitude },
          { latitude: lat, longitude: lon }
        );

        return {
          name: el.tags?.name ?? TYPE_LABELS[type],
          type,
          latitude: lat,
          longitude: lon,
          distanceM: Math.round(distanceM),
        };
      })
      .filter((f): f is SeamarkFeature => f !== null)
      .sort((a, b) => a.distanceM - b.distanceM)
      .slice(0, maxResults);

    return features;
  } catch {
    return [];
  }
}
