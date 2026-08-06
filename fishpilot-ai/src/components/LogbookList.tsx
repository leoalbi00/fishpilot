"use client";

import { degToCompass, kmhToKnots } from "@/lib/utils";
import { removeLogbookEntry } from "@/lib/logbook";
import type { LogbookEntry } from "@/types/fishing";

interface LogbookListProps {
  entries: LogbookEntry[];
  onChanged: () => void;
}

export default function LogbookList({ entries, onChanged }: LogbookListProps) {
  function handleRemove(id: string) {
    // Rimandato di un tick: il bottone cliccato appartiene alla riga che sta
    // per essere rimossa dal DOM (stesso motivo del defer già usato altrove
    // nell'app, es. FavoritesPanel/RouteForm, per evitare il mis-targeting
    // del click nativo successivo quando l'elemento scompare nello stesso giro).
    setTimeout(async () => {
      await removeLogbookEntry(id);
      onChanged();
    }, 0);
  }

  if (entries.length === 0) {
    return (
      <p className="text-sm text-foam/50 font-body text-center py-6">
        Nessuna uscita registrata ancora: compila il modulo sopra per salvare la prima voce di
        diario.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry) => (
        <div key={entry.id} className="rounded-xl border border-hull/40 bg-depth/60 p-5 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-foam">{entry.title}</p>
              <p className="text-xs font-mono text-foam/50 mt-0.5">
                {new Date(entry.dateISO).toLocaleDateString("it-IT", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}{" "}
                · {entry.startLocation}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleRemove(entry.id)}
              aria-label="Elimina voce"
              className="text-foam/40 hover:text-danger text-sm shrink-0"
            >
              ✕
            </button>
          </div>

          {entry.weatherSnapshot && (
            <p className="text-xs font-mono text-foam/60">
              💨 {kmhToKnots(entry.weatherSnapshot.windSpeedKmh).toFixed(1)}kn{" "}
              {degToCompass(entry.weatherSnapshot.windDirectionDeg)} · 🌊{" "}
              {entry.weatherSnapshot.waveHeightM.toFixed(1)}m · 🌡️{" "}
              {entry.weatherSnapshot.airTempC.toFixed(0)}°C aria /{" "}
              {entry.weatherSnapshot.seaSurfaceTempC.toFixed(0)}°C mare
            </p>
          )}

          {entry.notes && <p className="text-sm text-foam/70 font-body">{entry.notes}</p>}

          <div className="flex flex-wrap gap-3 text-xs text-foam/50 font-mono">
            {entry.fuelLiters !== undefined && <span>⛽ {entry.fuelLiters} L</span>}
            {entry.gpsTrack.length > 0 && <span>🛰️ {entry.gpsTrack.length} punti traccia</span>}
          </div>

          {entry.photoUrls.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {entry.photoUrls.map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={url}
                  src={url}
                  alt="Cattura"
                  className="w-16 h-16 rounded-lg object-cover border border-hull/40"
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
