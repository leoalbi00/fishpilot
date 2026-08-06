"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppPreferences } from "@/components/AppPreferencesProvider";
import LocationAutocomplete from "@/components/LocationAutocomplete";
import { saveLocalReport } from "@/lib/localReport";
import type { FishingTechnique, LocationSuggestion } from "@/types/fishing";

const TECHNIQUES: { value: FishingTechnique; label: string }[] = [
  { value: "traina", label: "Traina" },
  { value: "bolentino", label: "Bolentino" },
  { value: "spinning", label: "Spinning" },
  { value: "jigging", label: "Jigging" },
  { value: "drifting", label: "Drifting" },
];

const inputClasses =
  "w-full rounded-lg bg-abyss/60 border border-hull/50 px-4 py-3 text-foam placeholder:text-foam/30 font-body focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors";

/** Form dello spot analizzato in ⚓ Rada e 🎣 Pesca (le rotte multi-waypoint
 * vivono nell'ecosistema ⛵ Traversata, vedi RouteForm). La scheda "Tecnica
 * di pesca" è visibile solo in modalità Pesca: in Rada resta comunque un
 * valore di default silenzioso, usato solo internamente dalla pipeline di
 * analisi (mai mostrato). */
export default function TripForm() {
  const router = useRouter();
  const { mode } = useAppPreferences();

  const [location, setLocation] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  const [technique, setTechnique] = useState<FishingTechnique>("bolentino");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("06:00");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Precompila la data odierna lato client (evita mismatch di hydration).
  useEffect(() => {
    setDate(new Date().toISOString().slice(0, 10));
  }, []);

  function handleGeolocate() {
    setLocateError(null);

    if (!navigator.geolocation) {
      setLocateError("Il tuo browser non supporta la geolocalizzazione.");
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocation("");
        setLocating(false);
      },
      (err) => {
        setLocateError(
          err.code === err.PERMISSION_DENIED
            ? "Permesso di geolocalizzazione negato. Consentilo dal browser oppure inserisci lo spot manualmente."
            : "Impossibile ottenere la posizione attuale."
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function handleSuggestionSelect(s: LocationSuggestion) {
    setLocation(s.label);
    setCoords({ lat: s.latitude, lng: s.longitude });
  }

  function clearCoords() {
    setCoords(null);
    setLocation("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!date || !time) {
      setError("Compila data e ora prima di analizzare.");
      return;
    }
    if (!coords && !location.trim()) {
      setError("Indica uno spot oppure usa la geolocalizzazione.");
      return;
    }

    const body = coords
      ? { mode: "spot", coords, technique, date, time }
      : { mode: "spot", location, technique, date, time };

    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Analisi non riuscita.");
      }

      if (data.reportId) {
        router.push(`/dashboard/${data.reportId}`);
      } else if (data.report) {
        // Report calcolato ma non salvato su Supabase: mostrato comunque
        // tramite il fallback locale (vedi lib/localReport.ts).
        saveLocalReport(data.report);
        router.push("/dashboard/local");
      } else {
        throw new Error("Risposta inattesa dal server.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore imprevisto.");
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-xl rounded-2xl border border-hull/40 bg-depth/70 backdrop-blur-sm p-6 sm:p-8 space-y-5 shadow-[0_0_40px_rgba(0,0,0,0.35)]"
    >
      <div className="space-y-2">
        <label className="block">
          <span className="block text-xs font-mono uppercase tracking-widest text-foam/50 mb-1.5">
            Dove ti trovi / Dove vuoi pescare
          </span>
          {coords ? (
            <div className="flex items-center justify-between rounded-lg bg-abyss/60 border border-tide/50 px-4 py-3">
              <span className="text-tide font-mono text-sm truncate">
                📍 {location || `${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}`}
              </span>
              <button
                type="button"
                onClick={clearCoords}
                aria-label="Rimuovi posizione"
                className="text-foam/50 hover:text-foam text-sm ml-3 shrink-0"
              >
                ✕
              </button>
            </div>
          ) : (
            <LocationAutocomplete
              value={location}
              onChange={setLocation}
              onSelect={handleSuggestionSelect}
              placeholder="Es. Massa Lubrense (NA)"
              className={inputClasses}
            />
          )}
        </label>

        {!coords && (
          <button
            type="button"
            onClick={handleGeolocate}
            disabled={locating}
            className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-lg border border-tide/50 text-tide px-4 py-2.5 text-sm font-body hover:bg-tide/10 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            📍 {locating ? "Rilevamento in corso…" : "Usa la mia posizione attuale"}
          </button>
        )}

        {locateError && (
          <p className="text-danger text-xs font-body" role="alert">
            {locateError}
          </p>
        )}
      </div>

      {mode === "pesca" && (
        <div>
          <span className="block text-xs font-mono uppercase tracking-widest text-foam/50 mb-1.5">
            Tecnica di pesca
          </span>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {TECHNIQUES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTechnique(t.value)}
                aria-pressed={technique === t.value}
                className={`min-h-[44px] rounded-lg px-2 py-2.5 text-sm font-body border transition-colors active:scale-[0.97] ${
                  technique === t.value
                    ? "bg-signal text-abyss border-signal font-medium"
                    : "border-hull/50 text-foam/70 hover:border-tide/60"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-xs font-mono uppercase tracking-widest text-foam/50 mb-1.5">
            Data
          </span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClasses}
          />
        </label>

        <label className="block">
          <span className="block text-xs font-mono uppercase tracking-widest text-foam/50 mb-1.5">
            Ora
          </span>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={inputClasses}
          />
        </label>
      </div>

      {error && (
        <p className="text-danger text-sm font-body" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full min-h-[52px] rounded-lg bg-signal text-abyss font-display font-semibold py-3.5 text-base tracking-wide transition-all hover:shadow-[0_0_25px_rgba(255,178,56,0.45)] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading
          ? "Analisi in corso…"
          : mode === "rada"
            ? "⚓ Analizza rada"
            : "🎣 Analizza pesca"}
      </button>
    </form>
  );
}
