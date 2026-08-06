"use client";

import { useRef, useState } from "react";
import LocationAutocomplete from "@/components/LocationAutocomplete";
import { addLogbookEntry, uploadLogbookPhoto } from "@/lib/logbook";
import type { LocationSuggestion, LogbookTrackPoint, LogbookWeatherSnapshot } from "@/types/fishing";

const inputClasses =
  "w-full rounded-lg bg-abyss/60 border border-hull/50 px-4 py-3 text-foam placeholder:text-foam/30 font-body focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors";

interface LogbookFormProps {
  onSaved: () => void;
}

/** Nuova voce del Diario di Bordo: meteo attuale allo spot recuperato
 * automaticamente, traccia GPS registrabile con start/stop, foto caricate
 * su Supabase Storage (se raggiungibile). */
export default function LogbookForm({ onSaved }: LogbookFormProps) {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [fuelLiters, setFuelLiters] = useState("");
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [recording, setRecording] = useState(false);
  const [track, setTrack] = useState<LogbookTrackPoint[]>([]);
  const watchIdRef = useRef<number | null>(null);

  const [photoFiles, setPhotoFiles] = useState<File[]>([]);

  function handleGeolocate() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocation("");
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function toggleRecording() {
    if (recording) {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setRecording(false);
      return;
    }
    if (!navigator.geolocation) return;
    setTrack([]);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setTrack((prev) => [
          ...prev,
          {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            timestampISO: new Date().toISOString(),
          },
        ]);
      },
      undefined,
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    setRecording(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Indica un titolo per l'uscita.");
      return;
    }
    if (!coords && !location.trim()) {
      setError("Indica lo spot di partenza (testo o GPS).");
      return;
    }

    setSaving(true);
    try {
      let finalCoords = coords;
      if (!finalCoords) {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(location)}`);
        const data = await res.json();
        const first = data.results?.[0];
        if (!first) throw new Error("Località non trovata.");
        finalCoords = { lat: first.latitude, lng: first.longitude };
      }

      let weatherSnapshot: LogbookWeatherSnapshot | undefined;
      try {
        const res = await fetch(`/api/weather-snapshot?lat=${finalCoords.lat}&lng=${finalCoords.lng}`);
        const data = await res.json();
        weatherSnapshot = data.snapshot ?? undefined;
      } catch {
        // Meteo non recuperabile: l'uscita si salva comunque senza istantanea.
      }

      const photoUrls: string[] = [];
      for (const file of photoFiles) {
        const url = await uploadLogbookPhoto(file);
        if (url) photoUrls.push(url);
      }

      await addLogbookEntry({
        title,
        dateISO: new Date(date).toISOString(),
        startLocation: location || `${finalCoords.lat.toFixed(3)}, ${finalCoords.lng.toFixed(3)}`,
        latitude: finalCoords.lat,
        longitude: finalCoords.lng,
        notes: notes || undefined,
        fuelLiters: fuelLiters ? Number(fuelLiters) : undefined,
        gpsTrack: track,
        photoUrls,
        weatherSnapshot,
      });

      setTitle("");
      setLocation("");
      setCoords(null);
      setNotes("");
      setFuelLiters("");
      setTrack([]);
      setPhotoFiles([]);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Salvataggio non riuscito.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full rounded-2xl border border-hull/40 bg-depth/70 backdrop-blur-sm p-6 space-y-4"
    >
      <h2 className="font-display text-foam text-lg">Nuova voce di diario</h2>

      <label className="block">
        <span className="block text-xs font-mono uppercase tracking-widest text-foam/50 mb-1.5">
          Titolo uscita
        </span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Es. Uscita traina Capri"
          className={inputClasses}
        />
      </label>

      <label className="block">
        <span className="block text-xs font-mono uppercase tracking-widest text-foam/50 mb-1.5">
          Spot di partenza
        </span>
        {coords ? (
          <div className="flex items-center justify-between rounded-lg bg-abyss/60 border border-tide/50 px-4 py-3">
            <span className="text-tide font-mono text-sm">
              📍 GPS ({coords.lat.toFixed(3)}, {coords.lng.toFixed(3)})
            </span>
            <button type="button" onClick={() => setCoords(null)} className="text-foam/50 hover:text-foam text-sm">
              ✕
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <LocationAutocomplete
              value={location}
              onChange={setLocation}
              onSelect={(s: LocationSuggestion) => {
                setLocation(s.label);
                setCoords({ lat: s.latitude, lng: s.longitude });
              }}
              placeholder="Es. Marina di Massa Lubrense"
              className={inputClasses}
            />
            <button
              type="button"
              onClick={handleGeolocate}
              disabled={locating}
              className="shrink-0 min-h-[48px] px-4 rounded-lg border border-tide/50 text-tide text-sm hover:bg-tide/10 disabled:opacity-50"
            >
              📍
            </button>
          </div>
        )}
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-xs font-mono uppercase tracking-widest text-foam/50 mb-1.5">Data</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClasses} />
        </label>
        <label className="block">
          <span className="block text-xs font-mono uppercase tracking-widest text-foam/50 mb-1.5">
            Carburante (L)
          </span>
          <input
            type="number"
            min={0}
            step={0.5}
            value={fuelLiters}
            onChange={(e) => setFuelLiters(e.target.value)}
            placeholder="Es. 20"
            className={inputClasses}
          />
        </label>
      </div>

      <label className="block">
        <span className="block text-xs font-mono uppercase tracking-widest text-foam/50 mb-1.5">Note</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Catture, condizioni, osservazioni…"
          className={inputClasses}
        />
      </label>

      <div className="space-y-1.5">
        <span className="block text-xs font-mono uppercase tracking-widest text-foam/50">
          Traccia GPS ({track.length} punti)
        </span>
        <button
          type="button"
          onClick={toggleRecording}
          className={`w-full min-h-[44px] rounded-lg border font-body text-sm transition-colors ${
            recording
              ? "border-danger text-danger bg-danger/10"
              : "border-tide/50 text-tide hover:bg-tide/10"
          }`}
        >
          {recording ? "⏹️ Ferma registrazione traccia" : "▶️ Avvia registrazione traccia"}
        </button>
      </div>

      <label className="block">
        <span className="block text-xs font-mono uppercase tracking-widest text-foam/50 mb-1.5">
          Foto catture ({photoFiles.length})
        </span>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setPhotoFiles(Array.from(e.target.files ?? []))}
          className="w-full text-sm text-foam/70 font-body file:mr-3 file:rounded-lg file:border file:border-hull/50 file:bg-abyss/60 file:px-3 file:py-2 file:text-foam/70 file:text-sm"
        />
      </label>

      {error && (
        <p className="text-danger text-sm font-body" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full min-h-[52px] rounded-lg bg-signal text-abyss font-display font-semibold py-3.5 text-base tracking-wide transition-all hover:shadow-[0_0_25px_rgba(255,178,56,0.45)] active:scale-[0.98] disabled:opacity-50"
      >
        {saving ? "Salvataggio…" : "📖 Salva nel diario"}
      </button>
    </form>
  );
}
