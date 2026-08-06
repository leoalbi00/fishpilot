import type { RecommendationsResult, SpeciesResult } from "@/types/fishing";

const TECHNIQUE_LABELS: Record<string, string> = {
  traina: "Traina",
  bolentino: "Bolentino",
  spinning: "Spinning",
  jigging: "Jigging",
  drifting: "Drifting",
};

interface RecommendationsCardProps {
  recommendations: RecommendationsResult;
  species: SpeciesResult[];
  technique: string;
}

export default function RecommendationsCard({
  recommendations,
  species,
  technique,
}: RecommendationsCardProps) {
  const topSpecies = species.slice(0, 3).map((s) => s.name);

  return (
    <div className="rounded-lg border border-hull/40 bg-depth/60 p-5 space-y-4">
      <h3 className="font-display text-foam text-lg">Cosa e Come Pescare</h3>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div className="sm:col-span-2">
          <dt className="text-foam/50 uppercase text-xs tracking-wide font-mono">
            Cosa pescare
          </dt>
          <dd className="text-foam mt-0.5">
            {topSpecies.length > 0 ? topSpecies.join(" · ") : "Nessuna specie compatibile trovata"}
          </dd>
        </div>

        <div>
          <dt className="text-foam/50 uppercase text-xs tracking-wide font-mono">
            Dove — Profondità
          </dt>
          <dd className="font-mono text-signal text-base mt-0.5">
            {recommendations.depthM}
          </dd>
        </div>

        <div>
          <dt className="text-foam/50 uppercase text-xs tracking-wide font-mono">
            Dove — Fondale
          </dt>
          <dd className="text-foam mt-0.5">{recommendations.seabedType}</dd>
        </div>

        <div>
          <dt className="text-foam/50 uppercase text-xs tracking-wide font-mono">
            Come — Tecnica
          </dt>
          <dd className="font-mono text-signal text-base mt-0.5">
            {TECHNIQUE_LABELS[technique] ?? technique}
          </dd>
        </div>

        {recommendations.trollingSpeedKn && (
          <div>
            <dt className="text-foam/50 uppercase text-xs tracking-wide font-mono">
              Velocità traina
            </dt>
            <dd className="font-mono text-signal text-base mt-0.5">
              {recommendations.trollingSpeedKn}
            </dd>
          </div>
        )}

        <div className="sm:col-span-2">
          <dt className="text-foam/50 uppercase text-xs tracking-wide font-mono">
            Come — Montatura
          </dt>
          <dd className="text-foam mt-0.5">{recommendations.rig}</dd>
        </div>

        <div className="sm:col-span-2">
          <dt className="text-foam/50 uppercase text-xs tracking-wide font-mono">
            Come — Esche/artificiali
          </dt>
          <dd className="text-foam mt-0.5">
            {recommendations.lures.join(" · ")}
          </dd>
        </div>

        <div className="sm:col-span-2">
          <dt className="text-foam/50 uppercase text-xs tracking-wide font-mono">
            Fascia oraria migliore
          </dt>
          <dd className="text-foam mt-0.5">{recommendations.bestTimeWindow}</dd>
        </div>
      </dl>

      {recommendations.notes.length > 0 && (
        <ul className="text-sm text-foam/70 list-disc list-inside space-y-1 pt-3 border-t border-hull/30">
          {recommendations.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
