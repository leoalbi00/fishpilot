// ============================================================
// /lib/coastAvoidance.ts — Ecosistema ⛵ Traversata: Coast Avoidance
//
// Fallback per le tratte corte dove la rete marittima precalcolata di
// lib/seaRouting.ts non ha risoluzione sufficiente e non trova un
// percorso instradato plausibile (es. Maratea -> Praia a Mare, ~7-10 NM
// lungo una costa frastagliata): se la linea diretta A→B attraversa la
// costa, questo modulo calcola waypoint "offshore" spostati al largo per
// aggirare il promontorio, usando la costa reale (OpenStreetMap,
// natural=coastline via Overpass) invece di una rete di rotte
// commerciali troppo rada per queste distanze.
//
// Algoritmo:
// 1) Scarica i tratti di costa OSM nel rettangolo che contiene A e B.
// 2) Interseca il segmento diretto A→B con ciascun tratto di costa
//    (@turf/line-intersect): ogni incrocio è un punto dove la rotta
//    diretta "entra" o "esce" dalla terraferma.
// 3) Per ciascun incrocio determina UNA VOLTA il lato "verso il largo"
//    (una delle due perpendicolari alla costa locale, bearing ±90°): si
//    prova un piccolo spostamento di prova su entrambi i lati e si sceglie
//    quello che si allontana di più dal punto di costa più vicino (una
//    spinta verso l'interno di un promontorio resta vicina al resto del
//    suo perimetro costiero, una spinta verso il largo se ne allontana) —
//    scelta empirica sui dati scaricati, non affidata alla convenzione
//    OSM sul verso di digitalizzazione dei way, più robusta perché
//    auto-verificata sugli stessi dati.
// 4) Spinge TUTTI gli incroci contemporaneamente a distanza crescente
//    (1.2 / 2 / 3 / 5 NM) finché l'intera spezzata A→waypoint(s)→B non
//    risulta libera da incroci con la costa in OGNI suo tratto — non solo
//    tratto per tratto in modo indipendente, perché due waypoint vicini
//    spinti a distanze diverse potrebbero lasciare un tratto intermedio
//    ancora sopra la terraferma.
// 5) Se anche al tentativo più al largo la spezzata taglia ancora la
//    costa, l'aggiramento fallisce onestamente (null) invece di
//    restituire un percorso che sembra evitare la costa ma non ci riesce
//    davvero: il chiamante ricade sulla linea diretta.
//
// Best-effort: qualunque errore, timeout o assenza di dati di costa
// ritorna null — il chiamante (lib/seaRouting.ts) ricade sulla linea
// diretta, esattamente come già faceva.
// ============================================================

import lineIntersect from "@turf/line-intersect";
import { point as turfPoint, lineString as turfLineString } from "@turf/helpers";
import bearing from "@turf/bearing";
import destination from "@turf/destination";
import type { Feature, LineString } from "geojson";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const OFFSHORE_DISTANCES_NM = [1.2, 2, 3, 5];
const SIDE_TEST_DISTANCE_NM = 0.3;
const BBOX_PADDING_DEG = 0.15;

interface LatLng {
  latitude: number;
  longitude: number;
}

interface OverpassCoastwayElement {
  type: string;
  geometry?: { lat: number; lon: number }[];
}

async function fetchCoastlineSegments(bounds: {
  south: number;
  west: number;
  north: number;
  east: number;
}): Promise<Feature<LineString>[]> {
  const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
  const query = `[out:json][timeout:15];way["natural"="coastline"](${bbox});out geom;`;

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

    const data = (await res.json()) as { elements?: OverpassCoastwayElement[] };

    return (data.elements ?? [])
      .filter(
        (el): el is OverpassCoastwayElement & { geometry: { lat: number; lon: number }[] } =>
          el.type === "way" && Array.isArray(el.geometry) && el.geometry.length >= 2
      )
      .map((el) => turfLineString(el.geometry.map((p) => [p.lon, p.lat])));
  } catch {
    return [];
  }
}

function distanceKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Distanza (km) dal vertice di costa più vicino tra tutte le linee
 * fornite: usata per stimare empiricamente quale lato di un incrocio è
 * "al largo" (più lontano dalla costa) rispetto a "verso l'interno" del
 * promontorio (resta vicino al resto del suo perimetro). */
function nearestCoastlineDistanceKm(p: [number, number], coastlines: Feature<LineString>[]): number {
  let best = Infinity;
  for (const c of coastlines) {
    for (const coord of c.geometry.coordinates as [number, number][]) {
      const d = distanceKm(p, coord);
      if (d < best) best = d;
    }
  }
  return best;
}

/** true se il segmento a→b non attraversa nessuna delle linee di costa. */
function segmentClearOfCoast(
  a: [number, number],
  b: [number, number],
  coastlines: Feature<LineString>[]
): boolean {
  const seg = turfLineString([a, b]);
  return coastlines.every((c) => lineIntersect(seg, c).features.length === 0);
}

interface Crossing {
  point: [number, number];
  /** Bearing (gradi) verso il largo, determinato una sola volta per
   * ciascun incrocio: le distanze di spinta crescenti riusano sempre
   * questo stesso lato. */
  seawardBearingDeg: number;
  alongDistanceKm: number;
}

/** Incroci tra il segmento diretto from→to e le linee di costa, ordinati
 * lungo la rotta (dal punto A verso B), ciascuno con il lato "verso il
 * largo" già determinato. */
function findCrossings(from: LatLng, to: LatLng, coastlines: Feature<LineString>[]): Crossing[] {
  const fromCoord: [number, number] = [from.longitude, from.latitude];
  const toCoord: [number, number] = [to.longitude, to.latitude];
  const directLine = turfLineString([fromCoord, toCoord]);

  const crossings: Crossing[] = [];

  for (const coastline of coastlines) {
    const coords = coastline.geometry.coordinates as [number, number][];
    const intersections = lineIntersect(directLine, coastline);

    for (const feature of intersections.features) {
      const ip = feature.geometry.coordinates as [number, number];

      // Sotto-segmento di costa più vicino al punto d'incrocio, per
      // calcolarne la direzione locale (e quindi le due perpendicolari).
      let bestSegDist = Infinity;
      let segBearing = 0;
      for (let i = 0; i < coords.length - 1; i++) {
        const midpoint: [number, number] = [
          (coords[i][0] + coords[i + 1][0]) / 2,
          (coords[i][1] + coords[i + 1][1]) / 2,
        ];
        const d = distanceKm(midpoint, ip);
        if (d < bestSegDist) {
          bestSegDist = d;
          segBearing = bearing(turfPoint(coords[i]), turfPoint(coords[i + 1]));
        }
      }

      // Determina UNA VOLTA il lato verso il largo con uno spostamento di
      // prova piccolo su entrambe le perpendicolari: si tiene quello più
      // lontano dal vertice di costa più vicino.
      const ipPoint = turfPoint(ip);
      const leftBearing = segBearing - 90;
      const rightBearing = segBearing + 90;
      const leftTest = destination(ipPoint, SIDE_TEST_DISTANCE_NM, leftBearing, {
        units: "nauticalmiles",
      }).geometry.coordinates as [number, number];
      const rightTest = destination(ipPoint, SIDE_TEST_DISTANCE_NM, rightBearing, {
        units: "nauticalmiles",
      }).geometry.coordinates as [number, number];

      const seawardBearingDeg =
        nearestCoastlineDistanceKm(leftTest, coastlines) >= nearestCoastlineDistanceKm(rightTest, coastlines)
          ? leftBearing
          : rightBearing;

      crossings.push({
        point: ip,
        seawardBearingDeg,
        alongDistanceKm: distanceKm(fromCoord, ip),
      });
    }
  }

  crossings.sort((a, b) => a.alongDistanceKm - b.alongDistanceKm);
  return crossings;
}

/** Verifica che ogni tratto della spezzata (inclusi gli estremi) sia
 * libero dalla costa. */
function pathIsClearOfCoast(path: [number, number][], coastlines: Feature<LineString>[]): boolean {
  for (let i = 0; i < path.length - 1; i++) {
    if (!segmentClearOfCoast(path[i], path[i + 1], coastlines)) return false;
  }
  return true;
}

/** Se il segmento diretto from→to attraversa la costa, ritorna la spezzata
 * di waypoint (incluse origine e destinazione, [lng,lat]) che la aggira al
 * largo; null se il segmento è già libero da incroci con la costa, se i
 * dati di costa non sono disponibili, o se nessun tentativo di
 * aggiramento (fino a 5 NM al largo) risulta completamente libero dalla
 * costa — mai un'eccezione, e mai un percorso che tocca ancora terra. */
export async function avoidCoast(from: LatLng, to: LatLng): Promise<[number, number][] | null> {
  try {
    const south = Math.min(from.latitude, to.latitude) - BBOX_PADDING_DEG;
    const north = Math.max(from.latitude, to.latitude) + BBOX_PADDING_DEG;
    const west = Math.min(from.longitude, to.longitude) - BBOX_PADDING_DEG;
    const east = Math.max(from.longitude, to.longitude) + BBOX_PADDING_DEG;

    const coastlines = await fetchCoastlineSegments({ south, west, north, east });
    if (coastlines.length === 0) return null;

    const fromCoord: [number, number] = [from.longitude, from.latitude];
    const toCoord: [number, number] = [to.longitude, to.latitude];

    const crossings = findCrossings(from, to, coastlines);
    if (crossings.length === 0) return null;

    // Spinge TUTTI gli incroci alla stessa distanza per ciascun tentativo,
    // crescente finché l'intera spezzata non è libera dalla costa.
    for (const distanceNm of OFFSHORE_DISTANCES_NM) {
      const waypoints = crossings.map(
        (crossing) =>
          destination(turfPoint(crossing.point), distanceNm, crossing.seawardBearingDeg, {
            units: "nauticalmiles",
          }).geometry.coordinates as [number, number]
      );

      const path = [fromCoord, ...waypoints, toCoord];
      if (pathIsClearOfCoast(path, coastlines)) {
        return path;
      }
    }

    // Nessun tentativo ha prodotto una spezzata completamente libera dalla
    // costa: meglio ammettere il limite che mostrare una rotta che sembra
    // aggirare il promontorio ma in realtà lo taglia ancora.
    return null;
  } catch {
    return null;
  }
}
