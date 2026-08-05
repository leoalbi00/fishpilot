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
