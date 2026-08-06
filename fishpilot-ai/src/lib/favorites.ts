// Gestione degli "Spot Preferiti": Supabase è la fonte primaria (persistenza
// tra dispositivi/sessioni), localStorage è il fallback rapido usato quando
// Supabase non è raggiungibile/configurato e come cache per i caricamenti
// successivi. L'MVP non ha login: gli spot sono associati a un device_id
// generato una volta sola e salvato in localStorage.
import { createClient } from "@/lib/supabase/client";
import type { FavoriteSpot, FishingTechnique, SeabedHoldingType } from "@/types/fishing";

const DEVICE_ID_KEY = "fishpilot_device_id";
const FAVORITES_KEY = "fishpilot_favorites";
// ~50m: due spot entro questa distanza sono considerati "lo stesso punto".
const COORD_EPSILON = 0.0005;

function isBrowser() {
  return typeof window !== "undefined";
}

export function getDeviceId(): string {
  if (!isBrowser()) return "";
  let id = window.localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function readLocalFavorites(): FavoriteSpot[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    return raw ? (JSON.parse(raw) as FavoriteSpot[]) : [];
  } catch {
    return [];
  }
}

function writeLocalFavorites(favorites: FavoriteSpot[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

/** Trova, tra i preferiti, uno spot vicino alle coordinate indicate. */
export function findFavoriteMatch(
  favorites: FavoriteSpot[],
  latitude: number,
  longitude: number
): FavoriteSpot | undefined {
  return favorites.find(
    (f) =>
      Math.abs(f.latitude - latitude) < COORD_EPSILON &&
      Math.abs(f.longitude - longitude) < COORD_EPSILON
  );
}

/** Carica i preferiti: prova Supabase, ripiega su localStorage se non disponibile. */
export async function listFavorites(): Promise<FavoriteSpot[]> {
  if (!isBrowser()) return [];
  const deviceId = getDeviceId();

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("favorite_spots")
      .select("id, name, latitude, longitude, technique, seabed_type, created_at")
      .eq("device_id", deviceId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const favorites: FavoriteSpot[] = (data ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      latitude: row.latitude as number,
      longitude: row.longitude as number,
      technique: row.technique as FishingTechnique,
      seabedType: (row.seabed_type as SeabedHoldingType) ?? "sconosciuto",
      createdAt: row.created_at as string,
    }));

    writeLocalFavorites(favorites);
    return favorites;
  } catch {
    return readLocalFavorites();
  }
}

/** Salva un nuovo spot preferito: prova Supabase, ripiega su localStorage se fallisce. */
export async function addFavorite(spot: {
  name: string;
  latitude: number;
  longitude: number;
  technique: FishingTechnique;
  seabedType?: SeabedHoldingType;
}): Promise<FavoriteSpot> {
  const deviceId = getDeviceId();
  const seabedType = spot.seabedType ?? "sconosciuto";

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("favorite_spots")
      .insert({
        device_id: deviceId,
        name: spot.name,
        latitude: spot.latitude,
        longitude: spot.longitude,
        technique: spot.technique,
        seabed_type: seabedType,
      })
      .select()
      .single();

    if (error || !data) throw error ?? new Error("Insert su Supabase fallito.");

    const favorite: FavoriteSpot = {
      id: data.id as string,
      name: data.name as string,
      latitude: data.latitude as number,
      longitude: data.longitude as number,
      technique: data.technique as FishingTechnique,
      seabedType: (data.seabed_type as SeabedHoldingType) ?? "sconosciuto",
      createdAt: data.created_at as string,
    };

    writeLocalFavorites([
      favorite,
      ...readLocalFavorites().filter((f) => f.id !== favorite.id),
    ]);
    return favorite;
  } catch {
    const favorite: FavoriteSpot = {
      id: crypto.randomUUID(),
      name: spot.name,
      latitude: spot.latitude,
      longitude: spot.longitude,
      technique: spot.technique,
      seabedType,
      createdAt: new Date().toISOString(),
    };
    writeLocalFavorites([favorite, ...readLocalFavorites()]);
    return favorite;
  }
}

/** Aggiorna il tipo di fondale registrato per uno spot preferito già salvato. */
export async function updateFavoriteSeabed(
  id: string,
  seabedType: SeabedHoldingType
): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.from("favorite_spots").update({ seabed_type: seabedType }).eq("id", id);
  } catch {
    // Supabase non raggiungibile: l'aggiornamento della cache locale sotto è comunque sufficiente.
  } finally {
    writeLocalFavorites(
      readLocalFavorites().map((f) => (f.id === id ? { ...f, seabedType } : f))
    );
  }
}

/** Rimuove uno spot preferito da Supabase (se raggiungibile) e dalla cache locale. */
export async function removeFavorite(id: string): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.from("favorite_spots").delete().eq("id", id);
  } catch {
    // Supabase non raggiungibile: la rimozione dalla cache locale è comunque sufficiente per l'MVP.
  } finally {
    writeLocalFavorites(readLocalFavorites().filter((f) => f.id !== id));
  }
}
