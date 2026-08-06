import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import RouteMap from "@/components/RouteMap";
import { createClient } from "@/lib/supabase/server";
import { degToCompass, formatLocalTime } from "@/lib/utils";
import type { RefugePort, RouteLeg, RouteWaypoint } from "@/types/fishing";

interface RoutePlanRow {
  id: string;
  cruise_speed_kn: number;
  fuel_l_per_hour: number | null;
  waypoints: RouteWaypoint[];
  legs: RouteLeg[];
  refuge_ports: RefugePort[];
  total_distance_nm: number;
  total_duration_hours: number;
  fuel_liters_estimate: number | null;
  departure: string;
  utc_offset_seconds: number;
}

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

export default async function TraversataPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase.from("route_plans").select("*").eq("id", id).single();
  const route = data as unknown as RoutePlanRow | null;

  if (!route) {
    notFound();
  }

  const utcOffsetSeconds = route.utc_offset_seconds ?? 0;
  const firstWaypoint = route.waypoints[0];
  const lastWaypoint = route.waypoints[route.waypoints.length - 1];
  const etaFinalISO = route.legs[route.legs.length - 1]?.etaISO ?? route.departure;

  return (
    <div className="chart-texture min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 px-6 py-10 sm:py-14 max-w-4xl mx-auto w-full space-y-8">
        <div className="space-y-2">
          <p className="font-mono text-xs tracking-[0.3em] text-tide uppercase">
            ⛵ Piano di Traversata
          </p>
          <h1 className="font-display text-2xl sm:text-3xl text-foam font-semibold">
            {firstWaypoint?.name} <span className="text-foam/40">→</span> {lastWaypoint?.name}
          </h1>
          <p className="text-foam/60 text-sm">
            Partenza {formatLocalTime(route.departure, utcOffsetSeconds)} ·{" "}
            {route.cruise_speed_kn} kn di crociera
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border border-hull/40 bg-abyss/50 p-3.5 text-center">
            <p className="text-[10px] font-mono uppercase tracking-widest text-foam/45">
              Distanza
            </p>
            <p className="font-mono text-xl text-foam mt-1 tabular-nums">
              {route.total_distance_nm}
              <span className="text-sm text-foam/50 ml-0.5">NM</span>
            </p>
          </div>
          <div className="rounded-lg border border-hull/40 bg-abyss/50 p-3.5 text-center">
            <p className="text-[10px] font-mono uppercase tracking-widest text-foam/45">Durata</p>
            <p className="font-mono text-xl text-foam mt-1 tabular-nums">
              {formatDuration(route.total_duration_hours)}
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
              {route.fuel_liters_estimate !== null ? (
                <>
                  {route.fuel_liters_estimate}
                  <span className="text-sm text-foam/50 ml-0.5">L</span>
                </>
              ) : (
                "—"
              )}
            </p>
          </div>
        </div>

        <RouteMap waypoints={route.waypoints} refugePorts={route.refuge_ports} />

        <div className="space-y-3">
          <h2 className="font-display text-foam text-lg">Meteo lungo la rotta</h2>
          {route.legs.map((leg, i) => (
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

        <div className="space-y-3">
          <h2 className="font-display text-foam text-lg">Porti di Rifugio</h2>
          {route.refuge_ports.length === 0 ? (
            <p className="text-sm text-foam/50 font-body">
              Nessun porto/marina trovato nei pressi della rotta (dato OpenStreetMap, copertura
              non garantita).
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {route.refuge_ports.map((port) => (
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
      </main>
    </div>
  );
}
