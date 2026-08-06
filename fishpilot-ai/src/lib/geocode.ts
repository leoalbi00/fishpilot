import type { GeocodedPlace, LocationSuggestion } from "@/types/fishing";

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

interface NominatimSearchResult {
  place_id: number;
  name?: string;
  display_name: string;
  lat: string;
  lon: string;
}

/**
 * Suggerimenti di autocompletamento per i campi località (partenza, arrivo,
 * waypoint, spot): ricerca libera su Nominatim (OpenStreetMap), che copre
 * anche porti/marine/isole oltre alle sole città. Best-effort: in caso di
 * errore/timeout restituisce un elenco vuoto invece di far fallire l'input.
 */
export async function searchLocations(
  query: string,
  limit = 6
): Promise<LocationSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const url =
    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(trimmed)}` +
    `&format=jsonv2&limit=${limit}&accept-language=it`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, {
      headers: { "User-Agent": "FishPilotAI/1.0 (https://fishpilot.ai)" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return [];

    const data = (await res.json()) as NominatimSearchResult[];

    return data
      .map((r): LocationSuggestion | null => {
        const latitude = Number(r.lat);
        const longitude = Number(r.lon);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

        return {
          id: String(r.place_id),
          label: r.name || r.display_name.split(",")[0].trim(),
          displayName: r.display_name,
          latitude,
          longitude,
        };
      })
      .filter((s): s is LocationSuggestion => s !== null);
  } catch {
    return [];
  }
}

interface NominatimReverseResult {
  name?: string;
  display_name?: string;
  address?: {
    village?: string;
    town?: string;
    city?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
  };
}

/**
 * Converte coordinate (es. dalla geolocalizzazione GPS del browser) in un
 * nome di luogo leggibile, usando il reverse geocoding di Nominatim
 * (OpenStreetMap, gratuito): https://nominatim.org/release-docs/latest/api/Reverse/
 * Se il servizio non risponde, ripiega su un'etichetta basata sulle coordinate
 * così l'analisi può comunque proseguire.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<GeocodedPlace> {
  const fallback: GeocodedPlace = {
    name: `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`,
    displayName: `Posizione GPS (${latitude.toFixed(3)}, ${longitude.toFixed(3)})`,
    latitude,
    longitude,
  };

  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}` +
      `&lon=${longitude}&zoom=12&accept-language=it`;

    const res = await fetch(url, {
      headers: { "User-Agent": "FishPilotAI/1.0 (https://fishpilot.ai)" },
    });
    if (!res.ok) return fallback;

    const data = (await res.json()) as NominatimReverseResult;
    const place =
      data.address?.town ??
      data.address?.city ??
      data.address?.village ??
      data.address?.municipality ??
      data.name;

    if (!place) return fallback;

    const admin1 = data.address?.state ?? data.address?.county;

    return {
      name: place,
      displayName: [place, admin1, data.address?.country]
        .filter(Boolean)
        .join(", "),
      latitude,
      longitude,
      country: data.address?.country,
      admin1,
    };
  } catch {
    return fallback;
  }
}
