import { colorForScore, labelForScore } from "@/lib/utils";

export default function ScoreGauge({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const color = colorForScore(clamped);
  const angle = clamped * 3.6; // percentuale -> gradi (cerchio completo = 360°)

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-52 h-52 sm:w-60 sm:h-60">
        {/* Ghiera: arco colorato proporzionale al punteggio + 10 tacche
            (una ogni 10 punti: rappresentano i decili dello score) */}
        <div
          className="absolute inset-0 rounded-full transition-[background] duration-700"
          style={{
            backgroundImage: [
              "repeating-conic-gradient(from 0deg, rgba(234,246,246,0.45) 0deg 0.8deg, transparent 0.8deg 36deg)",
              `conic-gradient(${color} ${angle}deg, rgba(22,59,82,0.55) ${angle}deg)`,
            ].join(", "),
          }}
        />

        {/* Quadrante centrale, stile display digitale */}
        <div className="absolute inset-[14px] rounded-full bg-abyss border border-hull/50 flex flex-col items-center justify-center">
          <span
            className="font-mono text-5xl sm:text-6xl font-semibold tabular-nums"
            style={{ color }}
          >
            {clamped}
          </span>
          <span className="font-mono text-[10px] tracking-[0.25em] text-foam/50 uppercase mt-1">
            Fishing Score
          </span>
        </div>
      </div>

      <span
        className="font-display text-sm uppercase tracking-widest"
        style={{ color }}
      >
        {labelForScore(clamped)}
      </span>
    </div>
  );
}
