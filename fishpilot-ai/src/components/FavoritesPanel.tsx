"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listFavorites, removeFavorite } from "@/lib/favorites";
import type { FavoriteSpot } from "@/types/fishing";

const TECHNIQUE_LABELS: Record<string, string> = {
  traina: "Traina",
  bolentino: "Bolentino",
  spinning: "Spinning",
  jigging: "Jigging",
  drifting: "Drifting",
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Sezione "Spot Preferiti" in home: ricarica meteo e consigli con un tap. */
export default function FavoritesPanel() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteSpot[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listFavorites().then((f) => {
      setFavorites(f);
      setLoaded(true);
    });
  }, []);

  async function handleQuickLoad(spot: FavoriteSpot) {
    setError(null);
    setLoadingId(spot.id);
    try {
      const now = new Date();
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "spot",
          coords: { lat: spot.latitude, lng: spot.longitude },
          technique: spot.technique,
          date: now.toISOString().slice(0, 10),
          time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analisi non riuscita.");

      router.push(`/dashboard/${data.reportId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore imprevisto.");
      setLoadingId(null);
    }
  }

  async function handleRemove(id: string) {
    setFavorites((prev) => prev.filter((f) => f.id !== id));
    await removeFavorite(id);
  }

  if (!loaded || favorites.length === 0) return null;

  return (
    <div className="w-full max-w-xl mt-6 space-y-3">
      <p className="text-xs font-mono uppercase tracking-widest text-foam/50">
        I tuoi spot preferiti
      </p>
      <div className="flex flex-col gap-2">
        {favorites.map((spot) => (
          <div
            key={spot.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-hull/40 bg-depth/60 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="font-body text-foam truncate">{spot.name}</p>
              <p className="text-xs font-mono text-foam/45">
                {TECHNIQUE_LABELS[spot.technique] ?? spot.technique}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleQuickLoad(spot)}
                disabled={loadingId === spot.id}
                className="min-h-[44px] rounded-lg bg-signal text-abyss px-3.5 py-2 text-xs font-display font-semibold active:scale-[0.97] transition-transform disabled:opacity-50"
              >
                {loadingId === spot.id ? "…" : "Analizza →"}
              </button>
              <button
                type="button"
                onClick={() => handleRemove(spot.id)}
                aria-label="Rimuovi dai preferiti"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-foam/40 hover:text-danger text-sm"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
      {error && (
        <p className="text-danger text-sm font-body" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
