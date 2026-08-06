"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppPreferences } from "@/components/AppPreferencesProvider";
import LocationAutocomplete from "@/components/LocationAutocomplete";
import MapPicker from "@/components/MapPicker";
import { saveLocalReport } from "@/lib/localReport";
import { readRecentSearches, saveRecentSearch, type RecentSearch } from "@/lib/searchHistory";
import { consumeReuseSpot } from "@/lib/crossEcosystem";
import { suggestTechnique } from "@/lib/techniqueSuggestion";
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
  const [showMap, setShowMap] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [areaMode, setAreaMode] = useState<"punto" | "area">("punto");
  const [radiusM, setRadiusM] = useState(1000);

  const [techniqueMode, setTechniqueMode] = useState<"manuale" | "suggerita">("manuale");
  const [technique, setTechnique] = useState<FishingTechnique>("bolentino");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("06:00");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Precompila la data odierna lato client (evita mismatch di hydration).
  useEffect(() => {
    setDate(new Date().toISOString().slice(0, 10));
    setRecentSearches(readRecentSearches());

    // Spot riusato da un altro ecosistema (pulsante "Usa questo spot per...").
    const reused = consumeReuseSpot();
    if (reused) {
      setCoords({ lat: reused.latitude, lng: reused.longitude });
      setLocation(reused.label);
    }
  }, []);

  // Modalità "Suggerita": la tecnica segue automaticamente data/ora finché
  // l'utente non passa a "Manuale".
  useEffect(() => {
    if (techniqueMode !== "suggerita" || !date || !time) return;
    const hour = Number(time.split(":")[0]);
    setTechnique(suggestTechnique(date, hour).technique);
  }, [techniqueMode, date, time]);

  const techniqueSuggestion =
    date && time ? suggestTechnique(date, Number(time.split(":")[0])) : null;

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
    saveRecentSearch({ label: s.label, latitude: s.latitude, longitude: s.longitude });
    setRecentSearches(readRecentSearches());
  }

  function handleMapPick(p: { lat: number; lng: number }) {
    setCoords(p);
    setLocation("");
  }

  function handleRecentSelect(s: RecentSearch) {
    setLocation(s.label);
    setCoords({ lat: s.latitude, lng: s.longitude });
  }

  function clearCoords() {
    setCoords(null);
    setLocation("");
    setShowMap(false);
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

    const areaRadiusM = mode === "pesca" && areaMode === "area" ? radiusM : undefined;
    const body = coords
      ? { mode: "spot", coords, technique, date, time, areaRadiusM }
      : { mode: "spot", location, technique, date, time, areaRadiusM };

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
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleGeolocate}
              disabled={locating}
              className="flex-1 min-h-[48px] flex items-center justify-center gap-2 rounded-lg border border-tide/50 text-tide px-4 py-2.5 text-sm font-body hover:bg-tide/10 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              📍 {locating ? "Rilevamento in corso…" : "Posizione attuale"}
            </button>
            <button
              type="button"
              onClick={() => setShowMap((v) => !v)}
              aria-pressed={showMap}
              className={`shrink-0 min-h-[48px] px-4 rounded-lg border text-sm font-body transition-all active:scale-[0.98] ${
                showMap
                  ? "bg-tide/20 border-tide text-tide"
                  : "border-tide/50 text-tide hover:bg-tide/10"
              }`}
            >
              🗺️ Mappa
            </button>
          </div>
        )}

        {mode === "pesca" && !coords && showMap && (
          <div className="flex items-center gap-1 rounded-full border border-hull/50 p-0.5 w-fit">
            <button
              type="button"
              onClick={() => setAreaMode("punto")}
              aria-pressed={areaMode === "punto"}
              className={`px-2.5 py-1 rounded-full text-[11px] font-body transition-colors ${
                areaMode === "punto" ? "bg-signal text-abyss font-medium" : "text-foam/50 hover:text-foam"
              }`}
            >
              📍 Punto singolo
            </button>
            <button
              type="button"
              onClick={() => setAreaMode("area")}
              aria-pressed={areaMode === "area"}
              className={`px-2.5 py-1 rounded-full text-[11px] font-body transition-colors ${
                areaMode === "area" ? "bg-signal text-abyss font-medium" : "text-foam/50 hover:text-foam"
              }`}
            >
              ⭕ Area (raggio)
            </button>
          </div>
        )}

        {mode === "pesca" && !coords && showMap && areaMode === "area" && (
          <label className="block">
            <span className="flex items-center justify-between text-xs font-mono uppercase tracking-widest text-foam/50 mb-1.5">
              <span>Raggio area</span>
              <span className="text-tide normal-case tracking-normal">{(radiusM / 1000).toFixed(1)} km</span>
            </span>
            <input
              type="range"
              min={250}
              max={5000}
              step={250}
              value={radiusM}
              onChange={(e) => setRadiusM(Number(e.target.value))}
              className="w-full accent-tide"
            />
          </label>
        )}

        {!coords && showMap && (
          <MapPicker
            onPick={handleMapPick}
            radiusM={mode === "pesca" && areaMode === "area" ? radiusM : undefined}
          />
        )}

        {!coords && !showMap && recentSearches.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {recentSearches.map((s) => (
              <button
                key={`${s.label}-${s.latitude}-${s.longitude}`}
                type="button"
                onClick={() => handleRecentSelect(s)}
                className="min-h-[36px] rounded-full border border-hull/50 text-foam/60 px-3 text-xs font-body hover:border-tide/60 hover:text-foam transition-colors"
              >
                🕓 {s.label}
              </button>
            ))}
          </div>
        )}

        {locateError && (
          <p className="text-danger text-xs font-body" role="alert">
            {locateError}
          </p>
        )}
      </div>

      {mode === "pesca" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="block text-xs font-mono uppercase tracking-widest text-foam/50">
              Tecnica di pesca
            </span>
            <div className="flex items-center gap-1 rounded-full border border-hull/50 p-0.5">
              <button
                type="button"
                onClick={() => setTechniqueMode("suggerita")}
                aria-pressed={techniqueMode === "suggerita"}
                className={`px-2.5 py-1 rounded-full text-[11px] font-body transition-colors ${
                  techniqueMode === "suggerita"
                    ? "bg-signal text-abyss font-medium"
                    : "text-foam/50 hover:text-foam"
                }`}
              >
                ✨ Suggerita
              </button>
              <button
                type="button"
                onClick={() => setTechniqueMode("manuale")}
                aria-pressed={techniqueMode === "manuale"}
                className={`px-2.5 py-1 rounded-full text-[11px] font-body transition-colors ${
                  techniqueMode === "manuale"
                    ? "bg-signal text-abyss font-medium"
                    : "text-foam/50 hover:text-foam"
                }`}
              >
                Manuale
              </button>
            </div>
          </div>

          {techniqueMode === "suggerita" && techniqueSuggestion && (
            <p className="text-xs text-tide/80 font-body -mt-1">
              {TECHNIQUES.find((t) => t.value === techniqueSuggestion.technique)?.label}:{" "}
              {techniqueSuggestion.reason}
            </p>
          )}

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {TECHNIQUES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => {
                  setTechnique(t.value);
                  setTechniqueMode("manuale");
                }}
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
