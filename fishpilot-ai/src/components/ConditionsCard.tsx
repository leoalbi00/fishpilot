import type { ConditionsSummary } from "@/types/fishing";

interface ConditionsCardProps {
  conditions: ConditionsSummary;
  seaSurfaceTempC?: number;
  waveHeightM?: number;
  windSpeedKmh?: number;
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
      <p className="font-mono text-2xl text-foam mt-1 tabular-nums">
        {value}
        <span className="text-sm text-foam/50 ml-0.5">{unit}</span>
      </p>
    </div>
  );
}

export default function ConditionsCard({
  conditions,
  seaSurfaceTempC,
  waveHeightM,
  windSpeedKmh,
}: ConditionsCardProps) {
  return (
    <div className="rounded-lg border border-hull/40 bg-depth/60 p-5 space-y-4">
      <h3 className="font-display text-foam text-lg">Condizioni</h3>

      <div className="grid grid-cols-3 gap-3">
        <StatTile
          label="Mare"
          value={seaSurfaceTempC !== undefined ? seaSurfaceTempC.toFixed(1) : "—"}
          unit="°C"
        />
        <StatTile
          label="Onde"
          value={waveHeightM !== undefined ? waveHeightM.toFixed(1) : "—"}
          unit="m"
        />
        <StatTile
          label="Vento"
          value={windSpeedKmh !== undefined ? Math.round(windSpeedKmh).toString() : "—"}
          unit="km/h"
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
