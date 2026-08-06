import { formatLocalTime } from "@/lib/utils";
import type { SolunarResult } from "@/types/fishing";

interface SolunarCardProps {
  solunar: SolunarResult;
  utcOffsetSeconds: number;
}

const MOON_ICONS: Record<string, string> = {
  "Luna Nuova": "🌑",
  Crescente: "🌒",
  "Primo Quarto": "🌓",
  "Gibbosa Crescente": "🌔",
  "Luna Piena": "🌕",
  "Gibbosa Calante": "🌖",
  "Ultimo Quarto": "🌗",
  Calante: "🌘",
};

export default function SolunarCard({ solunar, utcOffsetSeconds }: SolunarCardProps) {
  const majors = solunar.periods.filter((p) => p.kind === "major");
  const minors = solunar.periods.filter((p) => p.kind === "minor");

  return (
    <div className="rounded-xl border border-hull/40 bg-depth/60 p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-foam text-lg">Tabelle Solunari</h3>
        <span className="flex items-center gap-1.5 text-sm text-foam/70 font-body">
          <span aria-hidden>{MOON_ICONS[solunar.moonPhaseLabel] ?? "🌙"}</span>
          {solunar.moonPhaseLabel}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-signal mb-2">
            Major (picco alto)
          </p>
          <ul className="space-y-1.5">
            {majors.length === 0 && <li className="text-sm text-foam/40">—</li>}
            {majors.map((p) => (
              <li key={p.startISO} className="text-sm text-foam font-mono tabular-nums">
                {formatLocalTime(p.startISO, utcOffsetSeconds)} –{" "}
                {formatLocalTime(p.endISO, utcOffsetSeconds)}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-tide mb-2">
            Minor (picco moderato)
          </p>
          <ul className="space-y-1.5">
            {minors.length === 0 && <li className="text-sm text-foam/40">—</li>}
            {minors.map((p) => (
              <li key={p.startISO} className="text-sm text-foam font-mono tabular-nums">
                {formatLocalTime(p.startISO, utcOffsetSeconds)} –{" "}
                {formatLocalTime(p.endISO, utcOffsetSeconds)}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="text-[11px] text-foam/35 font-body pt-1 border-t border-hull/30">
        Teoria solunare (Knight, 1926): picchi di attività attesi in coincidenza dei passaggi
        della luna al meridiano. Indicativo, non garanzia di cattura.
      </p>
    </div>
  );
}
