import type { GeocodedPlace } from "@/types/fishing";

interface OpenMeteoGeocodingResult {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  country_code?: string;
  admin1?: string;
  admin2?: string;
  admin3?: string;
}

/**
 * Alcuni utenti scrivono "Massa Lubrense (NA)": estraiamo il nome principale
 * da cercare e un eventuale "suggerimento" tra parentesi (sigla provincia,
 * regione...) usato solo per scegliere il risultato migliore tra più omonimi.
 */
function extractHint(raw: string): { query: string; hint?: string } {
  const match = raw.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (match) {
    return { query: match[1].trim(), hint: match[2].trim() };
  }
  return { query: raw.trim() };
}

/**
 * Converte un nome di località in coordinate usando la Geocoding API di
 * Open-Meteo (gratuita, nessuna API key richiesta):
 * https://open-meteo.com/en/docs/geocoding-api
 */
export async function geocodeLocation(raw: string): Promise<GeocodedPlace> {
  const { query, hint } = extractHint(raw);

  if (!query) {
    throw new Error("Indica un nome di località valido.");
  }

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    query
  )}&count=8&language=it&format=json`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Geocoding non riuscito per "${raw}".`);
  }

  const data = (await res.json()) as { results?: OpenMeteoGeocodingResult[] };
  const results = data.results;

  if (!results || results.length === 0) {
    throw new Error(
      `Nessuna località trovata per "${raw}". Prova con un nome più preciso (es. la città più vicina).`
    );
  }

  let chosen = results[0];

  if (hint) {
    const hintLower = hint.toLowerCase();
    const better = results.find((r) =>
      [r.admin1, r.admin2, r.admin3, r.country, r.country_code]
        .filter((field): field is string => Boolean(field))
        .some((field) => field.toLowerCase().includes(hintLower))
    );
    if (better) chosen = better;
  }

  return {
    name: chosen.name,
    displayName: [chosen.name, chosen.admin1, chosen.country]
      .filter(Boolean)
      .join(", "),
    latitude: chosen.latitude,
    longitude: chosen.longitude,
    country: chosen.country,
    admin1: chosen.admin1,
  };
}
