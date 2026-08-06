"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LocationAutocomplete from "@/components/LocationAutocomplete";
import type { LocationSuggestion } from "@/types/fishing";
import { saveLocalRoute } from "@/lib/localRoute";

interface WaypointField {
  id: string;
  location: string;
  coords: { lat: number; lng: number } | null;
  locating: boolean;
  locateError: string | null;
}

const inputClasses =
  "w-full rounded-lg bg-abyss/60 border border-hull/50 px-4 py-3 text-foam placeholder:text-foam/30 font-body focus:border-signal focus:ring-1 focus:ring-signal outline-none transition-colors";

function newWaypoint(): WaypointField {
  return {
    id: crypto.randomUUID(),
    location: "",
    coords: null,
    locating: false,
    locateError: null,
  };
}

function waypointLabel(index: number, total: number): string {
  if (index === 0) return "Punto A — Partenza";
  if (index === total - 1) return "Punto B — Arrivo";
  return `Waypoint ${index}`;
}

export default function RouteForm() {
  const router = useRouter();

  const [waypoints, setWaypoints] = useState<WaypointField[]>([newWaypoint(), newWaypoint()]);
  const [cruiseSpeedKn, setCruiseSpeedKn] = useState("6");
  const [fuelLPerHour, setFuelLPerHour] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("08:00");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDate(new Date().toISOString().slice(0, 10));
  }, []);

  function updateWaypoint(id: string, patch: Partial<WaypointField>) {
    setWaypoints((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  }

  function addWaypoint() {
    setWaypoints((prev) => [...prev.slice(0, -1), newWaypoint(), prev[prev.length - 1]]);
  }

  function removeWaypoint(id: string) {
    // Rimandato di un tick: il bottone cliccato appartiene alla riga che sta
    // per essere rimossa dal DOM (stesso motivo del defer in
    // LocationAutocomplete — evita il mis-targeting dell'evento nativo
    // successivo quando l'elemento cliccato scompare nello stesso giro).
    setTimeout(() => {
      setWaypoints((prev) => (prev.length > 2 ? prev.filter((w) => w.id !== id) : prev));
    }, 0);
  }

  function handleGeolocate(id: string) {
    updateWaypoint(id, { locateError: null });
    if (!navigator.geolocation) {
      updateWaypoint(id, { locateError: "Il tuo browser non supporta la geolocalizzazione." });
      return;
    }
    updateWaypoint(id, { locating: true });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateWaypoint(id, {
          coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          location: "",
          locating: false,
        });
      },
      () => {
        updateWaypoint(id, {
          locating: false,
          locateError: "Impossibile ottenere la posizione attuale.",
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (waypoints.some((w) => !w.coords && !w.location.trim())) {
      setError("Compila o geolocalizza tutti i waypoint prima di calcolare la rotta.");
      return;
    }
    const speed = Number(cruiseSpeedKn);
    if (!Number.isFinite(speed) || speed <= 0) {
      setError("Indica una velocità di crociera valida (nodi).");
      return;
    }
    if (!date || !time) {
      setError("Compila data e ora di partenza.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          waypoints: waypoints.map((w) => ({
            location: w.coords ? undefined : w.location,
            coords: w.coords ?? undefined,
          })),
          cruiseSpeedKn: speed,
          fuelLPerHour: fuelLPerHour ? Number(fuelLPerHour) : undefined,
          date,
          time,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Calcolo rotta non riuscito.");
      }

      if (data.routeId) {
        router.push(`/traversata/${data.routeId}`);
      } else if (data.plan) {
        // Rotta calcolata ma non salvata su Supabase: mostrata comunque
        // tramite il fallback locale (vedi lib/localRoute.ts).
        saveLocalRoute(data.plan);
        router.push("/traversata/local");
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
      <div className="space-y-3">
        {waypoints.map((w, i) => (
          <div key={w.id} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="block text-xs font-mono uppercase tracking-widest text-foam/50">
                {waypointLabel(i, waypoints.length)}
              </span>
              {waypoints.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeWaypoint(w.id)}
                  aria-label="Rimuovi waypoint"
                  className="min-w-[32px] min-h-[32px] text-foam/40 hover:text-danger text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {w.coords ? (
              <div className="flex items-center justify-between rounded-lg bg-abyss/60 border border-tide/50 px-4 py-3">
                <span className="text-tide font-mono text-sm">
                  📍 GPS ({w.coords.lat.toFixed(3)}, {w.coords.lng.toFixed(3)})
                </span>
                <button
                  type="button"
                  onClick={() => updateWaypoint(w.id, { coords: null })}
                  aria-label="Rimuovi posizione GPS"
                  className="text-foam/50 hover:text-foam text-sm ml-3"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <LocationAutocomplete
                  value={w.location}
                  onChange={(text) => updateWaypoint(w.id, { location: text })}
                  onSelect={(s: LocationSuggestion) =>
                    updateWaypoint(w.id, {
                      location: s.label,
                      coords: { lat: s.latitude, lng: s.longitude },
                    })
                  }
                  placeholder="Es. Capri (NA)"
                  className={inputClasses}
                />
                <button
                  type="button"
                  onClick={() => handleGeolocate(w.id)}
                  disabled={w.locating}
                  aria-label="Usa la mia posizione attuale"
                  className="shrink-0 min-h-[48px] px-4 rounded-lg border border-tide/50 text-tide text-sm hover:bg-tide/10 active:scale-[0.97] transition-all disabled:opacity-50"
                >
                  📍
                </button>
              </div>
            )}
            {w.locateError && <p className="text-danger text-xs font-body">{w.locateError}</p>}
          </div>
        ))}

        <button
          type="button"
          onClick={addWaypoint}
          className="w-full min-h-[44px] rounded-lg border border-dashed border-hull/50 text-foam/60 text-sm font-body hover:border-tide/60 hover:text-foam transition-colors"
        >
          + Aggiungi waypoint intermedio
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-xs font-mono uppercase tracking-widest text-foam/50 mb-1.5">
            Velocità di crociera (nodi)
          </span>
          <input
            type="number"
            min={0.5}
            step={0.5}
            value={cruiseSpeedKn}
            onChange={(e) => setCruiseSpeedKn(e.target.value)}
            className={inputClasses}
          />
        </label>

        <label className="block">
          <span className="block text-xs font-mono uppercase tracking-widest text-foam/50 mb-1.5">
            Consumo (L/h) — opzionale
          </span>
          <input
            type="number"
            min={0}
            step={0.5}
            value={fuelLPerHour}
            onChange={(e) => setFuelLPerHour(e.target.value)}
            placeholder="Es. 12"
            className={inputClasses}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="block text-xs font-mono uppercase tracking-widest text-foam/50 mb-1.5">
            Data partenza
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
            Ora partenza
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
        {loading ? "Calcolo rotta in corso…" : "⛵ Calcola rotta"}
      </button>
    </form>
  );
}
