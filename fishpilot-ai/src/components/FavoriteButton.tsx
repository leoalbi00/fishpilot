"use client";

import { useEffect, useState } from "react";
import { addFavorite, findFavoriteMatch, listFavorites, removeFavorite } from "@/lib/favorites";
import type { FishingTechnique } from "@/types/fishing";

interface FavoriteButtonProps {
  name: string;
  latitude: number;
  longitude: number;
  technique: FishingTechnique;
}

/** Pulsante a stella per salvare/rimuovere uno spot dai Preferiti. */
export default function FavoriteButton({
  name,
  latitude,
  longitude,
  technique,
}: FavoriteButtonProps) {
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listFavorites().then((favorites) => {
      if (cancelled) return;
      const match = findFavoriteMatch(favorites, latitude, longitude);
      setFavoriteId(match?.id ?? null);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [latitude, longitude]);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      if (favoriteId) {
        await removeFavorite(favoriteId);
        setFavoriteId(null);
      } else {
        const favorite = await addFavorite({ name, latitude, longitude, technique });
        setFavoriteId(favorite.id);
      }
    } finally {
      setBusy(false);
    }
  }

  const isFavorite = Boolean(favoriteId);

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!ready || busy}
      aria-pressed={isFavorite}
      aria-label={isFavorite ? "Rimuovi dai preferiti" : "Salva tra i preferiti"}
      className={`min-h-[44px] inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-body transition-all active:scale-[0.97] disabled:opacity-50 ${
        isFavorite
          ? "border-signal bg-signal/10 text-signal"
          : "border-hull/50 text-foam/70 hover:border-signal/60 hover:text-signal"
      }`}
    >
      <span aria-hidden>{isFavorite ? "★" : "☆"}</span>
      {isFavorite ? "Nei preferiti" : "Salva tra i preferiti"}
    </button>
  );
}
