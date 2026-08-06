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

export default function NightForecastCard({ forecast, utcOffsetSeconds }: NightForecastCardProps) {
  const trend = TREND_META[forecast.trend];
  // Un punto ogni ~2h per restare leggibile senza scroll.
  const sampled = forecast.points.filter((_, i) => i % 2 === 0);

  if (forecast.points.length === 0) {
    return (
      <div className="rounded-xl border border-hull/40 bg-depth/60 p-5">
        <h3 className="font-display text-foam text-lg mb-2">Previsione Notturna</h3>
        <p className="text-sm text-foam/50 font-body">
          Dati non disponibili per questa notte/zona.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-hull/40 bg-depth/60 p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-foam text-lg">Previsione Notturna</h3>
        <span
          className="flex items-center gap-1.5 text-sm font-body px-2.5 py-1 rounded-full"
          style={{ color: trend.color, backgroundColor: `${trend.color}1a` }}
        >
          <span aria-hidden>{trend.icon}</span> {trend.label}
        </span>
      </div>

      <p className="text-xs text-foam/50 font-mono uppercase tracking-widest">
        20:00 — 08:00
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
        Picco notturno: {kmhToKnots(forecast.maxWindSpeedKmh).toFixed(0)} kn di vento ·{" "}
        {forecast.maxWaveHeightM.toFixed(1)} m di onda
      </p>
    </div>
  );
}
