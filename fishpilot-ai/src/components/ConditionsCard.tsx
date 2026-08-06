import { degToCompass, kmhToKnots } from "@/lib/utils";
import { weatherCodeInfo } from "@/lib/weatherIcons";
import type { ConditionsSummary, ZonePoint } from "@/types/fishing";

interface ConditionsCardProps {
  conditions: ConditionsSummary;
  /** Punto meteo-marino di riferimento (spot analizzato o metà rotta). */
  zone?: ZonePoint;
}

function StatTile({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="rounded-lg border border-hull/40 bg-abyss/50 p-3.5 text-center">
      <p className="text-[10px] font-mono uppercase tracking-widest text-foam/45">
        {label}
      </p>
      <p className="font-mono text-xl text-foam mt-1 tabular-nums">
        {value}
        <span className="text-sm text-foam/50 ml-0.5">{unit}</span>
      </p>
    </div>
  );
}

export default function ConditionsCard({ conditions, zone }: ConditionsCardProps) {
  const windKn = zone ? kmhToKnots(zone.windSpeedKmh) : undefined;
  const windDir = zone ? degToCompass(zone.windDirectionDeg) : undefined;
  const currentKn =
    zone?.currentSpeedKmh !== undefined ? kmhToKnots(zone.currentSpeedKmh) : undefined;
  const currentDir =
    zone?.currentDirectionDeg !== undefined ? degToCompass(zone.currentDirectionDeg) : undefined;
  const sky = zone?.weatherCode !== undefined ? weatherCodeInfo(zone.weatherCode) : undefined;

  return (
    <div className="rounded-lg border border-hull/40 bg-depth/60 p-5 space-y-4">
      <h3 className="font-display text-foam text-lg">Meteo Marino</h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {sky && (
          <div className="rounded-lg border border-hull/40 bg-abyss/50 p-3.5 text-center">
            <p className="text-[10px] font-mono uppercase tracking-widest text-foam/45">Cielo</p>
            <p className="font-mono text-xl text-foam mt-1 tabular-nums flex items-center justify-center gap-1.5">
              <span aria-hidden>{sky.icon}</span>
              <span className="text-base">{sky.label}</span>
            </p>
            {zone?.cloudCoverPct !== undefined && (
              <p className="text-xs text-foam/50 mt-0.5">{Math.round(zone.cloudCoverPct)}% nuvole</p>
            )}
          </div>
        )}
        <StatTile
          label="Vento"
          value={windKn !== undefined ? `${windKn.toFixed(1)} ${windDir}` : "—"}
          unit="kn"
        />
        <StatTile
          label="Onde"
          value={
            zone !== undefined
              ? `${zone.waveHeightM.toFixed(1)}m / ${zone.wavePeriodS.toFixed(0)}`
              : "—"
          }
          unit="s"
        />
        <StatTile
          label="Correnti"
          value={currentKn !== undefined ? `${currentKn.toFixed(1)} ${currentDir}` : "n/d"}
          unit="kn"
        />
        <StatTile
          label="Temp. mare"
          value={zone !== undefined ? zone.seaSurfaceTempC.toFixed(1) : "—"}
          unit="°C"
        />
        <StatTile
          label="Temp. aria"
          value={zone !== undefined ? zone.airTempC.toFixed(1) : "—"}
          unit="°C"
        />
        <StatTile
          label="Pressione"
          value={zone !== undefined ? Math.round(zone.pressureHpa).toString() : "—"}
          unit="hPa"
        />
      </div>

      <p className="text-sm text-foam/70">{conditions.summary}</p>

      {conditions.warnings.length > 0 && (
        <ul className="space-y-1.5 pt-3 border-t border-hull/30">
          {conditions.warnings.map((w) => (
            <li
              key={w}
              className="text-sm text-danger flex items-start gap-2"
              role="alert"
            >
              <span aria-hidden>⚠</span>
              <span>{w}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
