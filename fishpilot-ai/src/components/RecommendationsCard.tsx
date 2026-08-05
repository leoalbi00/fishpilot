import type { RecommendationsResult } from "@/types/fishing";

export default function RecommendationsCard({
  recommendations,
}: {
  recommendations: RecommendationsResult;
}) {
  return (
    <div className="rounded-lg border border-hull/40 bg-depth/60 p-5 space-y-4">
      <h3 className="font-display text-foam text-lg">Consigli</h3>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
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

        <div>
          <dt className="text-foam/50 uppercase text-xs tracking-wide font-mono">
            Profondità consigliata
          </dt>
          <dd className="font-mono text-signal text-base mt-0.5">
            {recommendations.depthM}
          </dd>
        </div>

        <div className="sm:col-span-2">
          <dt className="text-foam/50 uppercase text-xs tracking-wide font-mono">
            Artificiali consigliati
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
