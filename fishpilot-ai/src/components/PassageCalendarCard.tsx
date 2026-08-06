import type { PassageCalendarResult, PassageRating } from "@/types/fishing";

const RATING_META: Record<PassageRating, { icon: string; label: string; color: string }> = {
  buona: { icon: "●", label: "Finestra buona", color: "#2dd4bf" },
  discreta: { icon: "●", label: "Finestra discreta", color: "#ffb238" },
  sconsigliata: { icon: "●", label: "Sconsigliata", color: "#ff6b57" },
};

function formatDayLabel(dateISO: string): string {
  const date = new Date(`${dateISO}T12:00:00Z`);
  return date.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });
}

/** Riepilogo dei prossimi 7 giorni con la finestra oraria più favorevole per
 * la traversata in ciascun giorno: vedi lib/passageCalendar.ts. */
export default function PassageCalendarCard({
  calendar,
}: {
  calendar: PassageCalendarResult | undefined;
}) {
  if (!calendar || calendar.days.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-hull/40 bg-depth/60 p-5 space-y-3">
      <h2 className="font-display text-foam text-lg">Calendario Traversata — Prossimi 7 giorni</h2>
      <div className="grid grid-cols-1 divide-y divide-hull/30">
        {calendar.days.map((day) => {
          const meta = RATING_META[day.rating];
          return (
            <div
              key={day.dateISO}
              className="flex items-center justify-between gap-3 py-2.5 text-sm flex-wrap"
            >
              <span className="font-mono text-foam/70 w-24 shrink-0 capitalize">
                {formatDayLabel(day.dateISO)}
              </span>
              <span className="flex items-center gap-1.5 text-foam flex-1 min-w-[160px]">
                <span aria-hidden style={{ color: meta.color }}>
                  {meta.icon}
                </span>
                {day.bestWindow.label}
              </span>
              <span className="font-mono text-foam/50 text-xs">
                {day.bestWindow.avgWindKn}kn · {day.bestWindow.avgWaveM}m
              </span>
              <span
                className="text-xs font-body px-2 py-0.5 rounded-full shrink-0"
                style={{ color: meta.color, backgroundColor: `${meta.color}1a` }}
              >
                {meta.label}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-foam/35 font-body pt-1 border-t border-hull/30">
        Stima sul punto di partenza, fasce orarie di 6h: indicativo, verifica sempre il bollettino
        meteo-marino aggiornato prima di salpare.
      </p>
    </div>
  );
}
