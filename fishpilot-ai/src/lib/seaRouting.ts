// ============================================================
// /lib/seaRouting.ts — Ecosistema ⛵ Traversata: routing marittimo reale
//
// Usa la rete marittima globale precalcolata di searoute-js (rotte di
// navigazione commerciale, interamente offline — nessuna chiamata di
// rete), ma con uno snap-to-network riscritto e un controllo di
// plausibilità aggiuntivo, per due bug distinti scoperti testando tratte
// costiere brevi reali (es. Napoli -> Capri, ~18 NM):
//
// 1) La funzione searoute() del pacchetto sceglie i vertici candidati SOLO
//    sulla singola linea più vicina al punto: per due punti ravvicinati
//    (la norma in una Traversata costiera breve) origine e destinazione
//    finiscono spesso per agganciarsi allo STESSO vertice. Il percorso
//    risultante ha un solo punto e la libreria lancia un'eccezione interna
//    ("coordinates must be an array of two or more positions"), catturata
//    con fallback silenzioso alla linea diretta — il sintomo segnalato
//    (rotta ancora disegnata sopra la terraferma). Qui lo snap cerca il
//    vertice più vicino su tutta la rete entro un raggio ragionevole e, in
//    caso di collisione, la destinazione riprova escludendo il vertice
//    già assegnato all'origine.
//
// 2) Una volta risolta la collisione, però, la rete "densificata" di
//    searoute-js è pensata per rotte commerciali d'alto mare: nelle acque
//    costiere ha pochissimi vertici, spesso privi di collegamenti locali
//    diretti. Il percorso più breve sul grafo tra due punti vicini può
//    quindi passare per un nodo hub lontanissimo (es. una rotta
//    Napoli -> Capri di 18 NM in linea d'aria risultava instradata per
//    320 NM passando vicino alla Sicilia) — un risultato assurdo, peggiore
//    della linea diretta. Il controllo di plausibilità sotto scarta questi
//    casi (distanza instradata sproporzionata rispetto alla linea d'aria)
//    e ricade sulla linea diretta, esattamente come quando non si trova
//    alcun percorso: per le tratte locali molto brevi la rete di
//    searoute-js semplicemente non ha risoluzione sufficiente per un
//    instradamento sensato, e mostrare una rotta sbagliata sarebbe più
//    pericoloso che ammettere il limite.
//
// La rete marittima e l'algoritmo di ricerca percorso restano quelli di
// searoute-js (stessi dati, stesse librerie geojson-path-finder/@turf):
// funziona bene per le tratte lunghe in mare aperto (verificato, es.
// Napoli -> Palermo: 196 NM instradate contro 169 NM in linea d'aria, un
// aggiramento plausibile della costa/promontori).
//
// NON è comunque un router di precisione costiera: la libreria stessa
// dichiara nel proprio README "Not for routing purposes! ... not for
// mariners to route their ships". Qui è usata per disegnare una rotta più
// realistica di una linea retta e per una stima di distanza più onesta —
// MAI come sostituto di una carta nautica ufficiale o di un vero
// plotter di bordo.
// ============================================================

import PathFinder from "geojson-path-finder";
import { point as turfPoint, lineString as turfLineString } from "@turf/helpers";
import rhumbDistance from "@turf/rhumb-distance";
import length from "@turf/length";
import type { Feature, FeatureCollection, LineString } from "geojson";
import marnet from "searoute-js/data/marnet_densified.json";
import { haversineDistanceM } from "@/lib/utils";

const network = marnet as unknown as FeatureCollection<LineString>;
const METERS_PER_NM = 1852;

// Costruita una sola volta per processo (come fa la stessa searoute-js):
// il preprocessing della topologia dell'intera rete globale ha un costo
// non trascurabile da ripetere ad ogni chiamata.
let routeFinder: PathFinder | null = null;
function getRouteFinder(): PathFinder {
  if (!routeFinder) {
    routeFinder = new PathFinder(network);
  }
  return routeFinder;
}

export interface SeaRouteResult {
  /** [lng, lat] lungo il percorso via mare, per disegnare la rotta sulla mappa. */
  coordinates: [number, number][];
  distanceNm: number;
}

function toLngLat(p: { latitude: number; longitude: number }): [number, number] {
  return [p.longitude, p.latitude];
}

/** Vertice più vicino a `target` tra quelli della rete marittima entro
 * `maxDistanceKm` (non solo quelli della linea più vicina, a differenza
 * dello snap integrato in searoute-js): opzionalmente esclude un vertice
 * esatto già assegnato all'altro estremo della rotta, per evitare che
 * origine e destinazione collidano sullo stesso nodo. */
function nearestNetworkVertex(
  target: [number, number],
  maxDistanceKm: number,
  exclude?: [number, number]
): [number, number] | null {
  const targetPoint = turfPoint(target);
  let best: [number, number] | null = null;
  let bestDistanceKm = Infinity;

  for (const feature of network.features) {
    const coordinates = feature.geometry?.coordinates as [number, number][] | undefined;
    if (!coordinates) continue;

    for (const coord of coordinates) {
      if (exclude && coord[0] === exclude[0] && coord[1] === exclude[1]) continue;

      const distanceKm = rhumbDistance(targetPoint, turfPoint(coord));
      if (distanceKm < bestDistanceKm && distanceKm <= maxDistanceKm) {
        bestDistanceKm = distanceKm;
        best = coord;
      }
    }
  }

  return best;
}

/** Calcola il percorso via mare tra due punti, aggirando la terraferma
 * sulla rete marittima precalcolata. Ritorna null se la rete non copre la
 * zona, non trova un percorso, o il percorso trovato è geometricamente
 * assurdo rispetto alla linea d'aria (rete troppo rada in quel tratto di
 * costa): il chiamante ricade sulla linea diretta, mai un'eccezione. */
export function computeSeaRoute(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
): SeaRouteResult | null {
  const haversineNm = haversineDistanceM(from, to) / METERS_PER_NM;

  try {
    const fromLngLat = toLngLat(from);
    const toLngLatCoord = toLngLat(to);

    // Raggio di snap generoso ma non illimitato (evita di agganciarsi a
    // vertici di una rotta commerciale in tutt'altra zona): scala con la
    // lunghezza della tratta, minimo ~48 NM per lasciare margine alle
    // tratte molto brevi.
    const searchRadiusKm = Math.max(haversineNm * 1.852 * 4, 90);

    const originVertex = nearestNetworkVertex(fromLngLat, searchRadiusKm);
    if (!originVertex) return null;

    let destVertex = nearestNetworkVertex(toLngLatCoord, searchRadiusKm);
    if (!destVertex) return null;

    // Stesso nodo per origine e destinazione (tipico per tratte brevi
    // ravvicinate): riprova escludendolo, per garantire due estremi distinti.
    if (destVertex[0] === originVertex[0] && destVertex[1] === originVertex[1]) {
      destVertex = nearestNetworkVertex(toLngLatCoord, searchRadiusKm, originVertex);
      if (!destVertex) return null;
    }

    const found = getRouteFinder().findPath(turfPoint(originVertex), turfPoint(destVertex));
    if (!found || !found.path || found.path.length < 2) return null;

    const line: Feature<LineString> = turfLineString(found.path);
    const distanceNm = length(line, { units: "miles" }) * 1.15078;

    // Controllo di plausibilità: un percorso via mare più lungo del
    // triplo (o +40 NM) della linea d'aria indica che la rete non ha
    // risoluzione locale sufficiente ed è passata per un nodo lontano —
    // meglio la linea diretta di una rotta assurda.
    const maxPlausibleNm = Math.max(haversineNm * 3, haversineNm + 40);
    if (distanceNm > maxPlausibleNm) return null;

    return {
      coordinates: found.path,
      distanceNm,
    };
  } catch {
    return null;
  }
}
