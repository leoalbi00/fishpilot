"use client";

import { degToCompass, formatLocalTime, kmhToKnots } from "@/lib/utils";
import type { NightForecastResult } from "@/types/fishing";

interface NightForecastCardProps {
  forecast: NightForecastResult;
  utcOffsetSeconds: number;
}

const TREND_META: Record<NightForecastResult["trend"], { icon: string; label: string; color: string }> = {
  migliora: { icon: "↘", label: "In miglioramento", color: "#2dd4bf" },
  peggiora: { icon: "↗", label: "In peggioramento", color: "#ff6b57" },
  stabile: { icon: "→", label: "Stabile", color: "#ffb238" },
};

function severityColor(windKn: number, waveM: number): string {
  if (windKn > 18 || waveM > 1) return "#ff6b57";
  if (windKn > 10 || waveM > 0.5) return "#ffb238";
  return "#2dd4bf";
}

/** Suona un breve allarme a due toni (3 impulsi) per l'allerta maltempo.
 * Diverso dalla sirena continua di AnchorWatch: qui è un avviso puntuale,
 * riproducibile su richiesta (il browser blocca comunque l'audio senza un
 * gesto dell'utente, quindi non può partire da solo al caricamento). */
function playStormAlert() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    gain.gain.value = 0.5;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();

    const toneMs = 220;
    const pulses = 3;
    for (let i = 0; i < pulses; i++) {
      const t = ctx.currentTime + (i * 2 * toneMs) / 1000;
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.setValueAtTime(587, t + toneMs / 1000);
    }
    const stopAt = ctx.currentTime + (pulses * 2 * toneMs) / 1000;
    osc.stop(stopAt);
    osc.onended = () => ctx.close();
  } catch {
    // Web Audio non disponibile: nessun impatto bloccante, resta l'allerta visiva.
  }
}

export default function NightForecastCard({ forecast, utcOffsetSeconds }: NightForecastCardProps) {
  const trend = TREND_META[forecast.trend];
  // Un punto ogni ~2h per restare leggibile senza scroll.
  const sampled = forecast.points.filter((_, i) => i % 2 === 0);

  if (forecast.points.length === 0) {
    return (
      <div className="rounded-xl border border-hull/40 bg-depth/60 p-5">
        <h3 className="font-display text-foam text-lg mb-2">Previsione H24</h3>
        <p className="text-sm text-foam/50 font-body">Dati non disponibili per questa zona.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-hull/40 bg-depth/60 p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-foam text-lg">Previsione H24</h3>
        <span
          className="flex items-center gap-1.5 text-sm font-body px-2.5 py-1 rounded-full"
          style={{ color: trend.color, backgroundColor: `${trend.color}1a` }}
        >
          <span aria-hidden>{trend.icon}</span> {trend.label}
        </span>
      </div>

      {forecast.stormWarning && (
        <div
          className="rounded-lg border border-danger/60 bg-danger/10 px-4 py-3 flex items-center justify-between gap-3 animate-pulse"
          role="alert"
        >
          <p className="text-sm text-danger font-body">
            ⚠ Allerta maltempo nelle prossime 24h: {forecast.stormReasons.join(", ")}.
          </p>
          <button
            type="button"
            onClick={playStormAlert}
            className="shrink-0 min-h-[36px] px-3 rounded-lg border border-danger/60 text-danger text-xs font-body hover:bg-danger/15 active:scale-[0.97] transition-all"
          >
            🔊 Ascolta allerta
          </button>
        </div>
      )}

      <p className="text-xs text-foam/50 font-mono uppercase tracking-widest">
        Prossime 24 ore
      </p>

      <div className="grid grid-cols-1 divide-y divide-hull/30">
        {sampled.map((p) => {
          const windKn = kmhToKnots(p.windSpeedKmh);
          const gustKn = kmhToKnots(p.windGustsKmh);
          const color = severityColor(windKn, p.waveHeightM);
          return (
            <div key={p.timeISO} className="flex items-center justify-between py-2 text-sm">
              <span className="font-mono text-foam/70 w-14">
                {formatLocalTime(p.timeISO, utcOffsetSeconds)}
              </span>
              <span className="flex items-center gap-1.5 text-foam">
                <span
                  aria-hidden
                  className="w-2 h-2 rounded-full inline-block shrink-0"
                  style={{ backgroundColor: color }}
                />
                {windKn.toFixed(0)}
                <span className="text-foam/40">/{gustKn.toFixed(0)} kn</span>{" "}
                {degToCompass(p.windDirectionDeg)}
              </span>
              <span className="font-mono text-foam/70">{p.waveHeightM.toFixed(1)} m</span>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-foam/50 font-body pt-1 border-t border-hull/30">
        Picco: {kmhToKnots(forecast.maxWindSpeedKmh).toFixed(0)} kn di vento ·{" "}
        {forecast.maxWaveHeightM.toFixed(1)} m di onda
      </p>
    </div>
  );
}
