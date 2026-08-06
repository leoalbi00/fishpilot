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

/** Tipo di fondale e tenuta ancora per lo spot corrente. Se non è già
 * registrato su un preferito, tenta una stima automatica (beta, EMODnet
 * Geology) come punto di partenza — sempre correggibile a mano. */
export default function SeabedCard({ latitude, longitude }: SeabedCardProps) {
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [seabedType, setSeabedType] = useState<SeabedHoldingType>("sconosciuto");
  const [autoEstimated, setAutoEstimated] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    listFavorites().then(async (favorites) => {
      if (cancelled) return;
      const match = findFavoriteMatch(favorites, latitude, longitude);

      if (match) {
        setFavoriteId(match.id);
        setSeabedType(match.seabedType);
        setReady(true);
        return;
      }

      setReady(true);

      // Nessun preferito salvato per questo spot: prova una stima
      // automatica (beta) come punto di partenza, mai bloccante.
      try {
        const res = await fetch(`/api/seabed?lat=${latitude}&lng=${longitude}`);
        const data = await res.json();
        if (!cancelled && data.seabedType) {
          setSeabedType(data.seabedType as SeabedHoldingType);
          setAutoEstimated(true);
        }
      } catch {
        // Nessuna stima disponibile: resta "sconosciuto".
      }
    });

    return () => {
      cancelled = true;
    };
  }, [latitude, longitude]);

  async function handleSelect(type: SeabedHoldingType) {
    setSeabedType(type);
    setAutoEstimated(false);
    if (favoriteId) {
      await updateFavoriteSeabed(favoriteId, type);
    }
  }

  const advice = SEABED_ADVICE[seabedType];

  return (
    <div className="rounded-xl border border-hull/40 bg-depth/60 p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-foam text-lg">Tipo di Fondale &amp; Tenuta</h3>
        {autoEstimated && (
          <span className="text-[10px] font-mono uppercase tracking-widest text-tide bg-tide/10 px-2 py-1 rounded-full">
            Stima auto (beta)
          </span>
        )}
      </div>

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

      {autoEstimated && (
        <p className="text-[11px] text-tide/70 font-body">
          Stima automatica da dato pubblico EMODnet Geology, non un rilievo diretto: verifica
          sempre con ecoscandaglio prima di ancorare e correggi qui se necessario.
        </p>
      )}

      {!favoriteId && (
        <p className="text-[11px] text-foam/35 font-body">
          Salva questo spot tra i Preferiti per ricordare il tipo di fondale la prossima volta.
        </p>
      )}
    </div>
  );
}
