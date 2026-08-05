"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { FishingTechnique } from "@/types/fishing";

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
  const [startLocation, setStartLocation] = useState("");
  const [destination, setDestination] = useState("");
  const [technique, setTechnique] = useState<FishingTechnique>("traina");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("06:00");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Precompila la data odierna lato client (evita mismatch di hydration).
  useEffect(() => {
    setDate(new Date().toISOString().slice(0, 10));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!startLocation.trim() || !destination.trim() || !date || !time) {
      setError("Compila tutti i campi prima di analizzare.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startLocation, destination, technique, date, time }),
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
