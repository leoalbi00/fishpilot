// ============================================================
// /lib/navigation.ts — Geodesia condivisa per Chartplotter
//
// Formule great-circle standard (nessuna API esterna): rotta vera tra due
// punti e Cross Track Error (scostamento laterale dalla rotta pianificata),
// usate da XteCard (Chartplotter) e dal pulsante MOB per calcolare la prua
// di ritorno verso l'uomo a mare.
// ============================================================

const EARTH_RADIUS_M = 6371000;

function toRad(d: number): number {
  return (d * Math.PI) / 180;
}
function toDeg(r: number): number {
  return (r * 180) / Math.PI;
}

export interface LatLng {
  latitude: number;
  longitude: number;
}

/** Rotta vera iniziale (gradi, 0-360) dal punto A al punto B (great-circle). */
export function bearingDeg(a: LatLng, b: LatLng): number {
  const φ1 = toRad(a.latitude);
  const φ2 = toRad(b.latitude);
  const Δλ = toRad(b.longitude - a.longitude);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Distanza great-circle in metri (formula dell'emisenoverso). */
export function distanceM(a: LatLng, b: LatLng): number {
  const φ1 = toRad(a.latitude);
  const φ2 = toRad(b.latitude);
  const Δφ = toRad(b.latitude - a.latitude);
  const Δλ = toRad(b.longitude - a.longitude);

  const h = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Cross Track Error: scostamento laterale (metri) del punto `current`
 * rispetto alla rotta great-circle da `legStart` a `legEnd`. Segno positivo
 * = a dritta della rotta, negativo = a sinistra (convenzione standard di
 * navigazione: XTE > 0 significa "hai deviato a dritta", quindi correggi a
 * sinistra per rientrare in rotta). Formula standard di cross-track
 * distance (Aviation Formulary / Movable Type). */
export function crossTrackDistanceM(current: LatLng, legStart: LatLng, legEnd: LatLng): number {
  const R = EARTH_RADIUS_M;
  const d13 = distanceM(legStart, current) / R;
  const θ13 = toRad(bearingDeg(legStart, current));
  const θ12 = toRad(bearingDeg(legStart, legEnd));

  return Math.asin(Math.sin(d13) * Math.sin(θ13 - θ12)) * R;
}
