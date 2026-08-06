import type { DiscoveredBay } from "@/types/fishing";

function scoreColor(scorePct: number): string {
  if (scorePct >= 80) return "#2dd4bf"; // tide
  if (scorePct >= 55) return "#ffb238"; // signal
  return "#ff6b57"; // danger
}

function formatDistance(distanceM: number): string {
  return distanceM >= 1000 ? `${(distanceM / 1000).toFixed(1)} km` : `${distanceM} m`;
}

/** Baie/cale/spiagge trovate automaticamente via Overpass (OSM) nel raggio
 * dello spot, con Shelter Score già calcolato incrociando la geometria
 * della costa con vento/mare live: vedi lib/bayDiscovery.ts. */
export default function BayDiscoveryCard({ bays }: { bays: DiscoveredBay[] }) {
  return (
    <div className="rounded-xl border border-hull/40 bg-depth/60 p-5 space-y-4">
      <h3 className="font-display text-foam text-lg">⚓ Baie & Spiagge Vicine</h3>

      {bays.length === 0 ? (
        <p className="text-sm text-foam/50 font-body">
          Nessuna baia o spiaggia trovata via OpenStreetMap in questo raggio (copertura
          mappatura non garantita).
        </p>
      ) : (
        <div className="grid grid-cols-1 divide-y divide-hull/30">
          {bays.map((bay) => {
            const color = scoreColor(bay.shelterScorePct);
            return (
              <div
                key={`${bay.name}-${bay.latitude}-${bay.longitude}`}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="font-body text-foam truncate">
                    <span aria-hidden>{bay.type === "spiaggia" ? "🏖️" : "⚓"}</span> {bay.name}
                  </p>
                  <p className="text-xs font-mono text-foam/50 mt-0.5">
                    {formatDistance(bay.distanceM)}
                    {!bay.exposureKnown && " · imbocco non stimabile"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono text-lg tabular-nums" style={{ color }}>
                    {bay.shelterScorePct}%
                  </p>
                  <p className="text-xs font-body" style={{ color }}>
                    {bay.shelterLabel}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="inline-flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-foam/50 bg-abyss/50 border border-hull/40 rounded-full px-3 py-1.5">
        📡 Fonte Cale: OpenStreetMap Marine · Fonte Meteo: ECMWF / ICON-EU Live
      </p>

      <p className="text-[11px] text-foam/35 font-body">
        Elenco e imbocco stimati da dato aperto OSM + euristica geometrica: non un rilievo
        costiero ufficiale, verifica sempre con carta nautica e valutazione diretta della baia.
      </p>
    </div>
  );
}
