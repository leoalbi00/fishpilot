"use client";

import { useMemo } from "react";
import { formatLocalTime } from "@/lib/utils";
import type { TideResult } from "@/types/fishing";

interface TideChartProps {
  tide: TideResult;
  utcOffsetSeconds: number;
}

const WIDTH = 600;
const HEIGHT = 180;
const PADDING = 12;

export default function TideChart({ tide, utcOffsetSeconds }: TideChartProps) {
  const { pathD, areaD, peakPositions } = useMemo(() => {
    const heights = tide.points.map((p) => p.heightM);
    const min = Math.min(...heights);
    const max = Math.max(...heights);
    const range = Math.max(0.01, max - min);

    const xFor = (i: number) =>
      PADDING + (i / (tide.points.length - 1)) * (WIDTH - PADDING * 2);
    const yFor = (h: number) =>
      HEIGHT - PADDING - ((h - min) / range) * (HEIGHT - PADDING * 2);

    const linePoints = tide.points.map((p, i) => `${xFor(i)},${yFor(p.heightM)}`);
    const pathD = `M${linePoints.join(" L")}`;
    const areaD = `${pathD} L${WIDTH - PADDING},${HEIGHT - PADDING} L${PADDING},${HEIGHT - PADDING} Z`;

    const peakPositions = tide.peaks.map((peak) => {
      const idx = tide.points.findIndex((p) => p.timeISO === peak.timeISO);
      return {
        peak,
        x: xFor(Math.max(0, idx)),
        y: yFor(peak.heightM),
      };
    });

    return { pathD, areaD, peakPositions };
  }, [tide]);

  return (
    <div className="rounded-xl border border-hull/40 bg-depth/60 p-5 space-y-4">
      <h3 className="font-display text-foam text-lg">Grafico Maree</h3>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full h-auto"
        role="img"
        aria-label="Andamento della marea nelle prossime 48 ore"
      >
        <defs>
          <linearGradient id="tideFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#tideFill)" />
        <path d={pathD} fill="none" stroke="#2dd4bf" strokeWidth="2" />
        {peakPositions.map(({ peak, x, y }) => (
          <circle
            key={peak.timeISO}
            cx={x}
            cy={y}
            r={4}
            fill={peak.type === "alta" ? "#2dd4bf" : "#ffb238"}
            stroke="#061620"
            strokeWidth={1.5}
          />
        ))}
      </svg>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm font-body">
        {tide.peaks.slice(0, 6).map((peak) => (
          <span key={peak.timeISO} className="flex items-center gap-1.5 text-foam/80">
            <span
              aria-hidden
              className="w-2 h-2 rounded-full inline-block"
              style={{ backgroundColor: peak.type === "alta" ? "#2dd4bf" : "#ffb238" }}
            />
            {peak.type === "alta" ? "Alta" : "Bassa"}{" "}
            <span className="font-mono tabular-nums">
              {formatLocalTime(peak.timeISO, utcOffsetSeconds)}
            </span>
          </span>
        ))}
      </div>

      <p className="text-[11px] text-foam/35 font-body pt-1 border-t border-hull/30">
        Approssimazione astronomica (componenti M2+S2): utile per i MOMENTI di alta/bassa
        marea, non calibrata sulla stazione costiera locale. Il Mediterraneo ha maree deboli
        e irregolari.
      </p>
    </div>
  );
}
