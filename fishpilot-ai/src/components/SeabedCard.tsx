"use client";

import { useEffect, useState } from "react";
import { findFavoriteMatch, listFavorites, updateFavoriteSeabed } from "@/lib/favorites";
import { SEABED_ADVICE } from "@/lib/anchorage";
import type { SeabedHoldingType } from "@/types/fishing";

const OPTIONS: { value: SeabedHoldingType; icon: string }[] = [
  { value: "sabbia", icon: "🏖️" },
  { value: "posidonia", icon: "🌿" },
  { value: "roccia", icon: "🪨" },
  { value: "fango", icon: "🟤" },
  { value: "misto", icon: "🔀" },
  { value: "sconosciuto", icon: "❔" },
];

interface SeabedCardProps {
  latitude: number;
  longitude: number;
}

/** Tipo di fondale e tenuta ancora per lo spot corrente (registrato sul preferito, se salvato). */
export default function SeabedCard({ latitude, longitude }: SeabedCardProps) {
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [seabedType, setSeabedType] = useState<SeabedHoldingType>("sconosciuto");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listFavorites().then((favorites) => {
      if (cancelled) return;
      const match = findFavoriteMatch(favorites, latitude, longitude);
      setFavoriteId(match?.id ?? null);
      setSeabedType(match?.seabedType ?? "sconosciuto");
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [latitude, longitude]);

  async function handleSelect(type: SeabedHoldingType) {
    setSeabedType(type);
    if (favoriteId) {
      await updateFavoriteSeabed(favoriteId, type);
    }
  }

  const advice = SEABED_ADVICE[seabedType];

  return (
    <div className="rounded-xl border border-hull/40 bg-depth/60 p-5 space-y-4">
      <h3 className="font-display text-foam text-lg">Tipo di Fondale &amp; Tenuta</h3>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            disabled={!ready}
            onClick={() => handleSelect(o.value)}
            aria-pressed={seabedType === o.value}
            className={`flex flex-col items-center gap-1 min-h-[52px] rounded-lg border py-2 text-[11px] font-body transition-colors disabled:opacity-50 ${
              seabedType === o.value
                ? "bg-signal text-abyss border-signal font-medium"
                : "border-hull/50 text-foam/60 hover:border-tide/60"
            }`}
          >
            <span aria-hidden className="text-base leading-none">
              {o.icon}
            </span>
            {SEABED_ADVICE[o.value].label}
          </button>
        ))}
      </div>

      <div className="rounded-lg bg-abyss/50 border border-hull/40 p-3.5">
        <p
          className={`font-mono text-sm uppercase tracking-wide ${
            advice.quality === "Ottima" || advice.quality === "Buona"
              ? "text-tide"
              : advice.quality === "Rischio"
                ? "text-danger"
                : "text-signal"
          }`}
        >
          Tenuta: {advice.quality}
        </p>
        <p className="text-sm text-foam/70 mt-1.5">{advice.advice}</p>
      </div>

      {!favoriteId && (
        <p className="text-[11px] text-foam/35 font-body">
          Salva questo spot tra i Preferiti per ricordare il tipo di fondale la prossima volta.
        </p>
      )}
    </div>
  );
}
