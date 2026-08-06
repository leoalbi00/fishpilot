"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { FishingTechnique, SearchMode } from "@/types/fishing";

const TECHNIQUES: { value: FishingTechnique; label: string }[] = [
  { value: "traina", label: "Traina" },
  { value: "bolentino", label: "Bolentino" },
  { value: "spinning", label: "Spinning" },
  { value: "jigging", label: "Jigging" },
  { value: "drifting", label: "Drifting" },
];

const inputClasses =
  "w-full rounded-lg bg-abyss/60 border border-hull/50 px-4 py-3 text-foam placeholder:text-foam/30 font-body focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors";

export default function TripForm() {
  const router = useRouter();

  const [mode, setMode] = useState<SearchMode>("spot");

  // Modalità Spot Singolo (default)
  const [location, setLocation] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  // Modalità Tratta (avanzata)
  const [startLocation, setStartLocation] = useState("");
  const [destination, setDestination] = useState("");

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

  function clearCoords() {
    setCoords(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!date || !time) {
      setError("Compila data e ora prima di analizzare.");
      return;
    }

    let body: Record<string, unknown>;

    if (mode === "tratta") {
      if (!startLocation.trim() || !destination.trim()) {
        setError("Compila partenza e destinazione prima di analizzare.");
        return;
      }
      body = { mode, startLocation, destination, technique, date, time };
    } else {
      if (!coords && !location.trim()) {
        setError("Indica uno spot oppure usa la geolocalizzazione.");
        return;
      }
      body = coords
        ? { mode, coords, technique, date, time }
        : { mode, location, technique, date, time };
    }

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

      router.push(`/dashboard/${data.reportId}`);
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
      <div className="grid grid-cols-2 gap-2 rounded-lg border border-hull/50 p-1">
        <button
          type="button"
          onClick={() => setMode("spot")}
          aria-pressed={mode === "spot"}
          className={`rounded-md px-3 py-2 text-sm font-body transition-colors ${
            mode === "spot"
              ? "bg-signal text-abyss font-medium"
              : "text-foam/60 hover:text-foam"
          }`}
        >
          Spot Singolo
        </button>
        <button
          type="button"
          onClick={() => setMode("tratta")}
          aria-pressed={mode === "tratta"}
          className={`rounded-md px-3 py-2 text-sm font-body transition-colors ${
            mode === "tratta"
              ? "bg-signal text-abyss font-medium"
              : "text-foam/60 hover:text-foam"
          }`}
        >
          Tratta (avanzata)
        </button>
      </div>

      {mode === "spot" ? (
        <div className="space-y-2">
          <label className="block">
            <span className="block text-xs font-mono uppercase tracking-widest text-foam/50 mb-1.5">
              Dove ti trovi / Dove vuoi pescare
            </span>
            {coords ? (
              <div className="flex items-center justify-between rounded-lg bg-abyss/60 border border-tide/50 px-4 py-3">
                <span className="text-tide font-mono text-sm">
                  📍 Posizione GPS acquisita ({coords.lat.toFixed(3)}, {coords.lng.toFixed(3)})
                </span>
                <button
                  type="button"
                  onClick={clearCoords}
                  aria-label="Rimuovi posizione GPS"
                  className="text-foam/50 hover:text-foam text-sm ml-3"
                >
                  ✕
                </button>
              </div>
            ) : (
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
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
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-tide/50 text-tide px-4 py-2.5 text-sm font-body hover:bg-tide/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-xs font-mono uppercase tracking-widest text-foam/50 mb-1.5">
              Partenza
            </span>
            <input
              type="text"
              value={startLocation}
              onChange={(e) => setStartLocation(e.target.value)}
              placeholder="Es. Massa Lubrense (NA)"
              className={inputClasses}
            />
          </label>

          <label className="block">
            <span className="block text-xs font-mono uppercase tracking-widest text-foam/50 mb-1.5">
              Destinazione
            </span>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Es. Maratea (PZ)"
              className={inputClasses}
            />
          </label>
        </div>
      )}

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
              className={`rounded-lg px-2 py-2.5 text-sm font-body border transition-colors ${
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
        className="w-full rounded-lg bg-signal text-abyss font-display font-semibold py-3.5 text-base tracking-wide transition-all hover:shadow-[0_0_25px_rgba(255,178,56,0.45)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Analisi in corso…" : "Analizza pesca"}
      </button>
    </form>
  );
}
