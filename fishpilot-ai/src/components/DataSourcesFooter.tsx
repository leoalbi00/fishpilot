import { formatLocalDateTime } from "@/lib/utils";

interface DataSourcesFooterProps {
  sources: string[];
  generatedAtISO: string;
  utcOffsetSeconds: number;
}

/** Box di trasparenza mostrato in fondo alle schermate principali: elenca
 * le API live effettivamente usate per calcolare i dati mostrati e
 * l'orario dell'ultimo aggiornamento (ricalcolo di questa pagina). */
export default function DataSourcesFooter({
  sources,
  generatedAtISO,
  utcOffsetSeconds,
}: DataSourcesFooterProps) {
  return (
    <div className="rounded-xl border border-hull/40 bg-abyss/40 p-5 space-y-3">
      <h3 className="font-mono text-xs uppercase tracking-widest text-foam/50">
        📡 Fonti Dati Ufficiali
      </h3>
      <ul className="space-y-1.5">
        {sources.map((s) => (
          <li key={s} className="text-sm text-foam/70 font-body flex items-start gap-2">
            <span aria-hidden className="text-tide">
              •
            </span>
            <span>{s}</span>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-foam/40 font-mono pt-2 border-t border-hull/30">
        Ultimo aggiornamento dati: {formatLocalDateTime(generatedAtISO, utcOffsetSeconds)}
      </p>
    </div>
  );
}
