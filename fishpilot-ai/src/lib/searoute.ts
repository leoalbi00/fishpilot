// ============================================================
// /lib/searoute.ts — Ecosistema ⛵ Traversata: routing marittimo reale
//
// Usa searoute-js: una rete marittima globale precalcolata (rotte di
// navigazione commerciale), interamente offline (nessuna chiamata di
// rete). Aggira la terraferma su scala macro, ma NON è un router di
// precisione costiera: la libreria stessa dichiara nel proprio README
// "Not for routing purposes! ... not for mariners to route their ships".
// Qui è usata per disegnare una rotta più realistica di una linea retta e
// per una stima di distanza più onesta — MAI come sostituto di una carta
// nautica ufficiale o di un vero plotter di bordo.
// ============================================================

import searoute from "searoute-js";
import type { Feature, LineString, Point } from "geojson";

export interface SeaRouteResult {
  /** [lng, lat] lungo il percorso via mare, per disegnare la rotta sulla mappa. */
  coordinates: [number, number][];
  distanceNm: number;
}

function toPointFeature(p: { latitude: number; longitude: number }): Feature<Point> {
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Point", coordinates: [p.longitude, p.latitude] },
  };
}

/** Calcola il percorso via mare tra due punti. Ritorna null se la rete
 * marittima nota non copre la zona (es. punti troppo interni/isolati): il
 * chiamante ricade sulla linea diretta (già disponibile). */
export function computeSeaRoute(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
): SeaRouteResult | null {
  try {
    const line = searoute(toPointFeature(from), toPointFeature(to), "nm");
    const coordinates = line?.geometry?.coordinates;
    if (!line || !coordinates || coordinates.length < 2) return null;

    return {
      coordinates: coordinates as [number, number][],
      distanceNm: Number(line.properties?.length ?? 0),
    };
  } catch {
    return null;
  }
}
