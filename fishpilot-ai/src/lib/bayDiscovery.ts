// ============================================================
// /lib/bayDiscovery.ts — Ecosistema ⚓ Rada: Auto-discovery Baie & Spiagge
//
// Interroga Overpass API (OpenStreetMap) per elencare automaticamente le
// baie/cale/spiagge nel raggio dello spot selezionato, e calcola per
// ciascuna uno Shelter Score automatico incrociando una stima geometrica
// dell'imbocco con vento/mare live già noti per la zona (stessa euristica
// di lib/anchorage.ts, già usata per lo spot analizzato manualmente).
//
// LIMITE DICHIARATO: OpenStreetMap non ha un tag "cala"/"cove" standard;
// vengono cercati nodi/way con natural=bay o natural=beach. La direzione
// dell'imbocco è stimata dal più ampio "vuoto" angolare tra i vertici della
// geometria attorno al centroide (i vertici OSM tracciano tipicamente la
// costa, lasciando un varco verso il mare aperto) — un'euristica
// geometrica semplice, non un'analisi costiera reale: va sempre verificata
// con carta nautica. Best-effort: qualunque errore/timeout/geometria
// insufficiente restituisce un elenco vuoto o un punteggio "esposizione non
// nota", mai un errore bloccante.
// ============================================================

import { assessShelter } from "@/lib/anchorage";
import { haversineDistanceM } from "@/lib/utils";
import type { DiscoveredBay } from "@/types/fishing";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

interface OverpassGeomPoint {
  lat: number;
  lon: number;
}

interface OverpassElement {
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  geometry?: OverpassGeomPoint[];
  tags?: { natural?: string; name?: string };
}

/** Rotta (gradi, 0=Nord) da `from` a `to` con approssimazione piana: valida
 * sulla scala di poche centinaia di metri/pochi km di una baia. */
function planarBearingDeg(from: OverpassGeomPoint, to: OverpassGeomPoint): number {
  const dLat = to.lat - from.lat;
  const dLon = (to.lon - from.lon) * Math.cos((from.lat * Math.PI) / 180);
  const deg = (Math.atan2(dLon, dLat) * 180) / Math.PI;
  return (deg + 360) % 360;
}

/** Stima la direzione verso cui si apre la baia dal più ampio varco
 * angolare tra i vertici della sua geometria, visti dal centroide. Ritorna
 * null se la geometria è insufficiente (< 3 punti) o troppo chiusa per una
 * stima affidabile (varco < 10°, es. un singolo punto spiaggia arrotondato). */
function estimateOpeningBearingDeg(
  center: OverpassGeomPoint,
  geometry: OverpassGeomPoint[]
): number | null {
  if (geometry.length < 3) return null;

  const bearings = geometry.map((p) => planarBearingDeg(center, p)).sort((a, b) => a - b);

  let widestGapStart = 0;
  let widestGap = 0;
  for (let i = 0; i < bearings.length; i++) {
    const next = bearings[(i + 1) % bearings.length];
    const gap = i === bearings.length - 1 ? next + 360 - bearings[i] : next - bearings[i];
    if (gap > widestGap) {
      widestGap = gap;
      widestGapStart = bearings[i];
    }
  }

  if (widestGap < 10) return null;

  return (widestGapStart + widestGap / 2) % 360;
}

export interface BayDiscoveryLiveConditions {
  windDirectionDeg: number;
  windSpeedKmh: number;
  waveDirectionDeg: number;
  waveHeightM: number;
}

/** Cerca baie/spiagge nel raggio del punto indicato e calcola per ciascuna
 * uno Shelter Score automatico rispetto alle condizioni live fornite
 * (stesse condizioni già note per lo spot: nessuna chiamata meteo
 * aggiuntiva). Risultati ordinati per protezione decrescente. */
export async function findNearbyBays(
  latitude: number,
  longitude: number,
  live: BayDiscoveryLiveConditions,
  radiusM = 4000,
  maxResults = 8
): Promise<DiscoveredBay[]> {
  const query =
    `[out:json][timeout:15];` +
    `(node["natural"="bay"](around:${radiusM},${latitude},${longitude});` +
    `way["natural"="bay"](around:${radiusM},${latitude},${longitude});` +
    `node["natural"="beach"](around:${radiusM},${latitude},${longitude});` +
    `way["natural"="beach"](around:${radiusM},${latitude},${longitude}););` +
    `out geom ${maxResults * 4};`;

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

    const bays = elements
      .map((el): DiscoveredBay | null => {
        const lat = el.lat ?? el.center?.lat;
        const lon = el.lon ?? el.center?.lon;
        if (typeof lat !== "number" || typeof lon !== "number") return null;

        const type: DiscoveredBay["type"] = el.tags?.natural === "beach" ? "spiaggia" : "baia";
        const name =
          el.tags?.name ??
          (type === "spiaggia" ? "Spiaggia senza nome (OSM)" : "Baia senza nome (OSM)");

        const distanceM = haversineDistanceM(
          { latitude, longitude },
          { latitude: lat, longitude: lon }
        );

        const exposureDeg =
          el.geometry && el.geometry.length >= 3
            ? estimateOpeningBearingDeg({ lat, lon }, el.geometry)
            : null;

        const assessment = assessShelter({
          windDirectionDeg: live.windDirectionDeg,
          windSpeedKmh: live.windSpeedKmh,
          waveDirectionDeg: live.waveDirectionDeg,
          waveHeightM: live.waveHeightM,
          bayExposureDeg: exposureDeg,
        });

        return {
          name,
          type,
          latitude: lat,
          longitude: lon,
          distanceM: Math.round(distanceM),
          shelterScorePct: assessment.scorePct,
          shelterLabel: assessment.label,
          exposureKnown: assessment.exposureKnown,
        };
      })
      .filter((b): b is DiscoveredBay => b !== null)
      .sort((a, b) => b.shelterScorePct - a.shelterScorePct || a.distanceM - b.distanceM)
      .slice(0, maxResults);

    return bays;
  } catch {
    return [];
  }
}
