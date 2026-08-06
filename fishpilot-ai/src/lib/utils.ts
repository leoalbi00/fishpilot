import type { Season, TimeInput } from "@/types/fishing";

/** Determina la stagione meteorologica (emisfero nord) da una data "YYYY-MM-DD". */
export function getSeason(dateISO: string): Season {
  const month = Number(dateISO.split("-")[1]);
  if (month === 12 || month === 1 || month === 2) return "inverno";
  if (month >= 3 && month <= 5) return "primavera";
  if (month >= 6 && month <= 8) return "estate";
  return "autunno";
}

/** Estrae "HH:MM" da una stringa ISO tipo "2026-07-20T06:12" e la converte in minuti. */
function isoTimeToMinutes(iso: string): number {
  const timePart = iso.split("T")[1] ?? "00:00";
  const [h, m] = timePart.split(":").map(Number);
  return h * 60 + (Number.isFinite(m) ? m : 0);
}

/** Costruisce le informazioni orarie (alba/tramonto) confrontando l'ora richiesta
 * con gli orari di sunrise/sunset forniti da Open-Meteo per quel giorno/luogo. */
export function buildTimeInfo(
  hour: number,
  minute: number,
  sunriseISO: string,
  sunsetISO: string,
  windowMinutes = 90
): TimeInput {
  const requested = hour * 60 + minute;
  const sunrise = isoTimeToMinutes(sunriseISO);
  const sunset = isoTimeToMinutes(sunsetISO);

  return {
    hour,
    minute,
    isDawn: Math.abs(requested - sunrise) <= windowMinutes,
    isDusk: Math.abs(requested - sunset) <= windowMinutes,
  };
}

/** Punto medio semplice tra due coordinate (approssimazione valida su distanze
 * costiere come quelle tipiche di una battuta di pesca in traina). */
export function midpoint(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
) {
  return {
    latitude: (a.latitude + b.latitude) / 2,
    longitude: (a.longitude + b.longitude) / 2,
  };
}

/** Colore associato a un Fishing Score, usato sia nella UI che nella mappa. */
export function colorForScore(score: number): string {
  if (score < 40) return "#ff6b57"; // danger
  if (score < 70) return "#ffb238"; // signal (attenzione/discreto)
  return "#2dd4bf"; // tide (ottimo)
}

/** Etichetta testuale sintetica per un punteggio. */
export function labelForScore(score: number): string {
  if (score < 30) return "Sconsigliato";
  if (score < 50) return "Scarso";
  if (score < 70) return "Discreto";
  if (score < 85) return "Buono";
  return "Eccellente";
}

/** km/h -> nodi. */
export function kmhToKnots(kmh: number): number {
  return kmh / 1.852;
}

const COMPASS_LABELS = [
  "N",
  "NE",
  "E",
  "SE",
  "S",
  "SO",
  "O",
  "NO",
] as const;

/** Converte una direzione in gradi (0-360, 0 = Nord) nel punto cardinale
 * italiano più vicino (N, NE, E, SE, S, SO, O, NO). */
export function degToCompass(deg: number): string {
  const normalized = ((deg % 360) + 360) % 360;
  const index = Math.round(normalized / 45) % 8;
  return COMPASS_LABELS[index];
}

/** Formatta un istante ISO (UTC) come ora locale HH:MM dello spot, dato il
 * suo offset UTC in secondi (risolto da Open-Meteo, DST incluso). Evita di
 * dipendere da un database di fusi orari lato client/server. */
export function formatLocalTime(isoUTC: string, utcOffsetSeconds: number): string {
  const shifted = new Date(new Date(isoUTC).getTime() + utcOffsetSeconds * 1000);
  return shifted.toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

const EARTH_RADIUS_M = 6371000;

/** Distanza in metri tra due coordinate (formula dell'emisenoverso). */
export function haversineDistanceM(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Punto a `distanceM` metri da `origin`, lungo la rotta `bearingDeg`
 * (0=Nord, 90=Est), formula great-circle diretta. */
export function destinationPoint(
  origin: { latitude: number; longitude: number },
  bearingDeg: number,
  distanceM: number
): { latitude: number; longitude: number } {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;

  const δ = distanceM / EARTH_RADIUS_M;
  const θ = toRad(bearingDeg);
  const φ1 = toRad(origin.latitude);
  const λ1 = toRad(origin.longitude);

  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
  );
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
    );

  return { latitude: toDeg(φ2), longitude: toDeg(λ2) };
}
