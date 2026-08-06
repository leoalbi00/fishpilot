"use client";

import { useRouter } from "next/navigation";
import RouteMap from "@/components/RouteMap";
import PassageCalendarCard from "@/components/PassageCalendarCard";
import { useAppPreferences } from "@/components/AppPreferencesProvider";
import { degToCompass, formatLocalTime } from "@/lib/utils";
import { downloadGpx } from "@/lib/gpxExport";
import { saveReuseSpot } from "@/lib/crossEcosystem";
import type { AppMode, RoutePlanResult } from "@/types/fishing";

const SECTOR_LABELS: Record<string, string> = {
  prua: "Di prua",
  mure: "Al mascone",
  traverso: "Al traverso",
  "poppa-quartiere": "A un quarto di poppa",
  poppa: "Di poppa",
};

function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

/** Vista dei risultati di una Traversata: usata sia dalla pagina persistita
 * (/traversata/[id], dati da Supabase) sia dal fallback locale
 * (/traversata/local, quando il salvataggio su Supabase non è riuscito). */
export default function RouteResultsView({ plan }: { plan: RoutePlanResult }) {
  const router = useRouter();
  const { setMode } = useAppPreferences();
  const utcOffsetSeconds = plan.utcOffsetSeconds;
  const firstWaypoint = plan.waypoints[0];
  const lastWaypoint = plan.waypoints[plan.waypoints.length - 1];
  const etaFinalISO = plan.legs[plan.legs.length - 1]?.etaISO ?? plan.departureISO;
  const anySeaRouted = plan.legs.some((leg) => leg.isSeaRouted);

  function useArrivalFor(target: AppMode) {
    saveReuseSpot({
      label: lastWaypoint.name,
      latitude: lastWaypoint.latitude,
      longitude: lastWaypoint.longitude,
    });
    setMode(target);
    router.push("/");
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="font-mono text-xs tracking-[0.3em] text-tide uppercase">
          ⛵ Piano di Traversata
        </p>
        <h1 className="font-display text-2xl sm:text-3xl text-foam font-semibold">
          {firstWaypoint?.name} <span className="text-foam/40">→</span> {lastWaypoint?.name}
        </h1>
        <p className="text-foam/60 text-sm">
          Partenza {formatLocalTime(plan.departureISO, utcOffsetSeconds)} · {plan.cruiseSpeedKn} kn
          di crociera
        </p>
        {!plan.persisted && (
          <p className="text-xs text-signal/90 bg-signal/10 border border-signal/30 rounded-lg px-3 py-2 inline-block">
            Rotta calcolata ma non salvata: questo link non è condivisibile e andrà perso
            ricaricando la pagina. Ricalcola quando serve.
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => useArrivalFor("rada")}
            className="text-xs font-body rounded-full border border-hull/50 text-foam/60 px-3 py-1.5 hover:border-tide/60 hover:text-foam transition-colors"
          >
            ⚓ Usa l&apos;arrivo per Rada
          </button>
          <button
            type="button"
            onClick={() => useArrivalFor("pesca")}
            className="text-xs font-body rounded-full border border-hull/50 text-foam/60 px-3 py-1.5 hover:border-tide/60 hover:text-foam transition-colors"
          >
            🎣 Usa l&apos;arrivo per Pesca
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg border border-hull/40 bg-abyss/50 p-3.5 text-center">
          <p className="text-[10px] font-mono uppercase tracking-widest text-foam/45">
            Distanza
          </p>
          <p className="font-mono text-xl text-foam mt-1 tabular-nums">
            {plan.totalDistanceNm}
            <span className="text-sm text-foam/50 ml-0.5">NM</span>
          </p>
        </div>
        <div className="rounded-lg border border-hull/40 bg-abyss/50 p-3.5 text-center">
          <p className="text-[10px] font-mono uppercase tracking-widest text-foam/45">Durata</p>
          <p className="font-mono text-xl text-foam mt-1 tabular-nums">
            {formatDuration(plan.totalDurationHours)}
          </p>
        </div>
        <div className="rounded-lg border border-hull/40 bg-abyss/50 p-3.5 text-center">
          <p className="text-[10px] font-mono uppercase tracking-widest text-foam/45">ETA</p>
          <p className="font-mono text-xl text-foam mt-1 tabular-nums">
            {formatLocalTime(etaFinalISO, utcOffsetSeconds)}
          </p>
        </div>
        <div className="rounded-lg border border-hull/40 bg-abyss/50 p-3.5 text-center">
          <p className="text-[10px] font-mono uppercase tracking-widest text-foam/45">
            Carburante
          </p>
          <p className="font-mono text-xl text-foam mt-1 tabular-nums">
            {plan.fuelLitersEstimate !== undefined ? (
              <>
                {plan.fuelLitersEstimate}
                <span className="text-sm text-foam/50 ml-0.5">L</span>
              </>
            ) : (
              "—"
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => downloadGpx(plan)}
          className="min-h-[40px] rounded-lg border border-tide/50 text-tide px-4 text-sm font-body hover:bg-tide/10 active:scale-[0.98] transition-all"
        >
          ⬇️ Esporta GPX
        </button>
      </div>

      <RouteMap waypoints={plan.waypoints} refugePorts={plan.refugePorts} legs={plan.legs} />

      {anySeaRouted && (
        <p className="text-[11px] text-foam/35 font-body -mt-4">
          Tracciato via mare stimato (rete marittima precalcolata, uso indicativo): non è un
          percorso di navigazione ufficiale, verifica sempre su carta nautica aggiornata.
        </p>
      )}

      <div className="space-y-3">
        <h2 className="font-display text-foam text-lg">Meteo lungo la rotta</h2>
        {plan.legs.map((leg, i) => (
          <div
            key={`${leg.from}-${leg.to}-${i}`}
            className="rounded-xl border border-hull/40 bg-depth/60 p-5 space-y-3"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="font-display text-foam">
                {leg.from} <span className="text-foam/40">→</span> {leg.to}
              </p>
              <span className="font-mono text-xs text-foam/50">
                ETA {formatLocalTime(leg.etaISO, utcOffsetSeconds)}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-[10px] font-mono uppercase text-foam/45">Distanza / Rotta</p>
                <p className="font-mono text-foam mt-0.5">
                  {leg.distanceNm} NM · {leg.bearingDeg}° ({degToCompass(leg.bearingDeg)})
                </p>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase text-foam/45">Vento</p>
                <p className="font-mono text-foam mt-0.5">
                  {leg.windSpeedKn}/{leg.windGustsKn} kn {degToCompass(leg.windDirectionDeg)}
                </p>
                <p className="text-xs text-tide">
                  {SECTOR_LABELS[leg.relativeWindSector]} ({leg.relativeWindAngleDeg}°)
                </p>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase text-foam/45">Onde</p>
                <p className="font-mono text-foam mt-0.5">
                  {leg.waveHeightM.toFixed(1)}m / {leg.wavePeriodS.toFixed(0)}s{" "}
                  {degToCompass(leg.waveDirectionDeg)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase text-foam/45">Mare / Corrente</p>
                <p className="font-mono text-foam mt-0.5">
                  {leg.seaSurfaceTempC.toFixed(1)}°C
                  {leg.currentSpeedKmh !== undefined && leg.currentDirectionDeg !== undefined && (
                    <>
                      {" "}
                      · {(leg.currentSpeedKmh / 1.852).toFixed(1)}kn{" "}
                      {degToCompass(leg.currentDirectionDeg)}
                    </>
                  )}
                </p>
              </div>
            </div>

            {leg.warnings.length > 0 && (
              <ul className="space-y-1 pt-2 border-t border-hull/30">
                {leg.warnings.map((w) => (
                  <li key={w} className="text-sm text-danger flex items-start gap-2" role="alert">
                    <span aria-hidden>⚠</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <PassageCalendarCard calendar={plan.passageCalendar} />

      <div className="space-y-3">
        <h2 className="font-display text-foam text-lg">Porti di Rifugio</h2>
        {plan.refugePorts.length === 0 ? (
          <p className="text-sm text-foam/50 font-body">
            Nessun porto/marina trovato nei pressi della rotta (dato OpenStreetMap, copertura
            non garantita).
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {plan.refugePorts.map((port) => (
              <div
                key={`${port.name}-${port.latitude}-${port.longitude}`}
                className={`rounded-lg border p-4 ${
                  port.warning ? "border-danger/50 bg-danger/5" : "border-hull/40 bg-depth/60"
                }`}
              >
                <p className="font-display text-foam">⚓ {port.name}</p>
                <p className="text-xs font-mono text-foam/50 mt-0.5">
                  {port.distanceNm.toFixed(1)} NM dalla rotta
                </p>
                {port.warning && (
                  <p className="text-xs text-danger mt-1.5 flex items-start gap-1.5">
                    <span aria-hidden>⚠</span> {port.warning}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] text-foam/35 font-body">
          Fonte: OpenStreetMap. Elenco indicativo, non un database ufficiale dei porti — verifica
          sempre su carta nautica aggiornata.
        </p>
      </div>
    </div>
  );
}
