import type { SpeciesResult } from "@/types/fishing";

export default function SpeciesList({ species }: { species: SpeciesResult[] }) {
  if (species.length === 0) {
    return (
      <p className="text-sm text-foam/50 font-body">
        Nessuna specie compatibile trovata per questa tecnica/condizioni.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {species.map((s) => (
        <div
          key={s.name}
          className="rounded-lg border border-hull/40 bg-depth/60 p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-foam">{s.name}</p>
              <p className="font-body text-xs italic text-foam/45">
                {s.scientificName}
              </p>
            </div>
            <span className="font-mono text-tide text-lg tabular-nums shrink-0">
              {s.probability}%
            </span>
          </div>
          <div className="mt-2.5 h-1.5 rounded-full bg-hull/30 overflow-hidden">
            <div
              className="h-full bg-tide rounded-full transition-all duration-700"
              style={{ width: `${s.probability}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
