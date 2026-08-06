// Diario di Bordo digitalizzato (ecosistema 📊 Copernicus & Log): Supabase è
// la fonte primaria (persistenza tra dispositivi/sessioni), localStorage è
// il fallback rapido usato quando Supabase non è raggiungibile/configurato
// e come cache per i caricamenti successivi. Stesso pattern e stesso
// device_id anonimo già usati da lib/favorites.ts.
import { createClient } from "@/lib/supabase/client";
import { getDeviceId } from "@/lib/favorites";
import type { LogbookEntry, LogbookTrackPoint, LogbookWeatherSnapshot } from "@/types/fishing";

const ENTRIES_KEY = "fishpilot_logbook_entries";
const PHOTOS_BUCKET = "logbook-photos";

function isBrowser() {
  return typeof window !== "undefined";
}

function readLocalEntries(): LogbookEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(ENTRIES_KEY);
    return raw ? (JSON.parse(raw) as LogbookEntry[]) : [];
  } catch {
    return [];
  }
}

function writeLocalEntries(entries: LogbookEntry[]) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
  } catch {
    // localStorage non disponibile: l'uscita resta comunque salvata su Supabase, se raggiungibile.
  }
}

function rowToEntry(row: Record<string, unknown>): LogbookEntry {
  return {
    id: row.id as string,
    title: row.title as string,
    dateISO: row.date as string,
    startLocation: row.start_location as string,
    latitude: row.start_lat as number,
    longitude: row.start_lng as number,
    notes: (row.notes as string | null) ?? undefined,
    fuelLiters: (row.fuel_liters as number | null) ?? undefined,
    gpsTrack: (row.gps_track as LogbookTrackPoint[] | null) ?? [],
    photoUrls: (row.photo_urls as string[] | null) ?? [],
    weatherSnapshot: (row.weather_snapshot as LogbookWeatherSnapshot | null) ?? undefined,
    createdAtISO: row.created_at as string,
  };
}

/** Carica le uscite del dispositivo: prova Supabase, ripiega su localStorage se non disponibile. */
export async function listLogbookEntries(): Promise<LogbookEntry[]> {
  if (!isBrowser()) return [];
  const deviceId = getDeviceId();

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("logbook_entries")
      .select(
        "id, title, date, start_location, start_lat, start_lng, notes, fuel_liters, gps_track, photo_urls, weather_snapshot, created_at"
      )
      .eq("device_id", deviceId)
      .order("date", { ascending: false });

    if (error) throw error;

    const entries = (data ?? []).map(rowToEntry);
    writeLocalEntries(entries);
    return entries;
  } catch {
    return readLocalEntries();
  }
}

export interface NewLogbookEntryInput {
  title: string;
  dateISO: string;
  startLocation: string;
  latitude: number;
  longitude: number;
  notes?: string;
  fuelLiters?: number;
  gpsTrack: LogbookTrackPoint[];
  photoUrls: string[];
  weatherSnapshot?: LogbookWeatherSnapshot;
}

/** Salva una nuova uscita: prova Supabase, ripiega su localStorage se fallisce. */
export async function addLogbookEntry(input: NewLogbookEntryInput): Promise<LogbookEntry> {
  const deviceId = getDeviceId();

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("logbook_entries")
      .insert({
        device_id: deviceId,
        title: input.title,
        date: input.dateISO,
        start_location: input.startLocation,
        start_lat: input.latitude,
        start_lng: input.longitude,
        notes: input.notes ?? null,
        fuel_liters: input.fuelLiters ?? null,
        gps_track: input.gpsTrack,
        photo_urls: input.photoUrls,
        weather_snapshot: input.weatherSnapshot ?? null,
      })
      .select()
      .single();

    if (error || !data) throw error ?? new Error("Insert su Supabase fallito.");

    const entry = rowToEntry(data as Record<string, unknown>);
    writeLocalEntries([entry, ...readLocalEntries().filter((e) => e.id !== entry.id)]);
    return entry;
  } catch {
    const entry: LogbookEntry = {
      id: crypto.randomUUID(),
      title: input.title,
      dateISO: input.dateISO,
      startLocation: input.startLocation,
      latitude: input.latitude,
      longitude: input.longitude,
      notes: input.notes,
      fuelLiters: input.fuelLiters,
      gpsTrack: input.gpsTrack,
      photoUrls: input.photoUrls,
      weatherSnapshot: input.weatherSnapshot,
      createdAtISO: new Date().toISOString(),
    };
    writeLocalEntries([entry, ...readLocalEntries()]);
    return entry;
  }
}

/** Rimuove un'uscita da Supabase (se raggiungibile) e dalla cache locale. */
export async function removeLogbookEntry(id: string): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.from("logbook_entries").delete().eq("id", id);
  } catch {
    // Supabase non raggiungibile: la rimozione dalla cache locale è comunque sufficiente per l'MVP.
  } finally {
    writeLocalEntries(readLocalEntries().filter((e) => e.id !== id));
  }
}

/** Carica una foto sul bucket Supabase Storage e ritorna l'URL pubblico.
 * Ritorna null se Supabase/storage non è raggiungibile: l'uscita si salva
 * comunque, semplicemente senza quella foto (mai bloccante). */
export async function uploadLogbookPhoto(file: File): Promise<string | null> {
  try {
    const supabase = createClient();
    const path = `${getDeviceId()}/${crypto.randomUUID()}-${file.name}`;
    const { error } = await supabase.storage.from(PHOTOS_BUCKET).upload(path, file);
    if (error) throw error;

    const { data } = supabase.storage.from(PHOTOS_BUCKET).getPublicUrl(path);
    return data.publicUrl ?? null;
  } catch {
    return null;
  }
}
