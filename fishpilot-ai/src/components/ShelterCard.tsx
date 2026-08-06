"use client";

import { useMemo, useState } from "react";
import { assessShelter } from "@/lib/anchorage";
import { degToCompass } from "@/lib/utils";

const DIRECTIONS: { label: string; deg: number }[] = [
  { label: "N", deg: 0 },
  { label: "NE", deg: 45 },
  { label: "E", deg: 90 },
  { label: "SE", deg: 135 },
  { label: "S", deg: 180 },
  { label: "SO", deg: 225 },
  { label: "O", deg: 270 },
  { label: "NO", deg: 315 },
];

interface ShelterCardProps {
  windDirectionDeg: number;
  windSpeedKmh: number;
  waveDirectionDeg: number;
  waveHeightM: number;
}

function scoreColor(scorePct: number): string {
  if (scorePct >= 80) return "#2dd4bf"; // tide
  if (scorePct >= 55) return "#ffb238"; // signal
  return "#ff6b57"; // danger
}

/** Shelter Score: protezione stimata della baia, con imbocco selezionabile. */
export default function ShelterCard({
  windDirectionDeg,
  windSpeedKmh,
  waveDirectionDeg,
  waveHeightM,
}: ShelterCardProps) {
  const [bayExposureDeg, setBayExposureDeg] = useState<number | null>(null);

  const assessment = useMemo(
    () =>
      assessShelter({
        windDirectionDeg,
        windSpeedKmh,
        waveDirectionDeg,
        waveHeightM,
        bayExposureDeg,
      }),
    [windDirectionDeg, windSpeedKmh, waveDirectionDeg, waveHeightM, bayExposureDeg]
  );

  const color = scoreColor(assessment.scorePct);

  return (
    <div className="rounded-xl border border-hull/40 bg-depth/60 p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-foam text-lg">⚓ Indice Protezione Baia</h3>
        <span className="font-mono text-2xl tabular-nums" style={{ color }}>
          {assessment.scorePct}%
        </span>
      </div>

      <div className="h-2 rounded-full bg-hull/30 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${assessment.scorePct}%`, backgroundColor: color }}
        />
      </div>

      <p className="font-display text-base" style={{ color }}>
        {assessment.label}
      </p>

      <div>
        <p className="text-xs font-mono uppercase tracking-widest text-foam/50 mb-2">
          Verso dove si apre la baia (imbocco)
        </p>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
          <button
            type="button"
            onClick={() => setBayExposureDeg(null)}
            aria-pressed={bayExposureDeg === null}
            className={`min-h-[44px] rounded-lg text-xs font-mono border transition-colors ${
              bayExposureDeg === null
                ? "bg-signal text-abyss border-signal font-medium"
                : "border-hull/50 text-foam/60 hover:border-tide/60"
            }`}
          >
            N/D
          </button>
          {DIRECTIONS.map((d) => (
            <button
              key={d.deg}
              type="button"
              onClick={() => setBayExposureDeg(d.deg)}
              aria-pressed={bayExposureDeg === d.deg}
              className={`min-h-[44px] rounded-lg text-xs font-mono border transition-colors ${
                bayExposureDeg === d.deg
                  ? "bg-signal text-abyss border-signal font-medium"
                  : "border-hull/50 text-foam/60 hover:border-tide/60"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-foam/50 font-body">
        Vento da {degToCompass(windDirectionDeg)} · Onda di fondo da{" "}
        {degToCompass(waveDirectionDeg)}
      </p>

      {assessment.warnings.length > 0 && (
        <ul className="space-y-1.5 pt-3 border-t border-hull/30">
          {assessment.warnings.map((w) => (
            <li key={w} className="text-sm text-danger flex items-start gap-2" role="alert">
              <span aria-hidden>⚠</span>
              <span>{w}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[11px] text-foam/35 font-body pt-1">
        Stima euristica basata su vento/mare e imbocco indicato: non sostituisce carta
        nautica e valutazione diretta della baia.
      </p>
    </div>
  );
}
