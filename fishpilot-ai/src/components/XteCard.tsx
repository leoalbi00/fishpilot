"use client";

import { useEffect, useState } from "react";
import { readActiveRoute } from "@/lib/activeRoute";
import { crossTrackDistanceM } from "@/lib/navigation";
import type { RoutePlanResult } from "@/types/fishing";

interface XteCardProps {
  position: GeolocationPosition | null;
}

/** Cross Track Error rispetto all'ultima Traversata calcolata (vedi
 * lib/activeRoute.ts): individua il leg più vicino alla posizione attuale
 * e ne calcola lo scostamento laterale live con la formula great-circle
 * standard (nessuna API esterna). */
export default function XteCard({ position }: XteCardProps) {
  const [plan, setPlan] = useState<RoutePlanResult | null | undefined>(undefined);

  useEffect(() => {
    setPlan(readActiveRoute());
  }, []);

  if (plan === undefined) {
    return null;
  }

  if (!plan) {
    return (
      <div className="rounded-xl border border-hull/40 bg-depth/60 p-5">
        <h3 className="font-display text-foam text-lg mb-2">Cross Track Error</h3>
        <p className="text-sm text-foam/50 font-body">
          Nessuna rotta attiva: calcola una Traversata per abilitare l&apos;XTE live.
        </p>
      </div>
    );
  }

  if (!position) {
    return (
      <div className="rounded-xl border border-hull/40 bg-depth/60 p-5">
        <h3 className="font-display text-foam text-lg mb-2">Cross Track Error</h3>
        <p className="text-sm text-foam/50 font-body">In attesa del segnale GPS…</p>
      </div>
    );
  }

  const current = { latitude: position.coords.latitude, longitude: position.coords.longitude };

  let bestLegIndex = -1;
  let bestXteM = Infinity;
  for (let i = 0; i < plan.waypoints.length - 1; i++) {
    const start = plan.waypoints[i];
    const end = plan.waypoints[i + 1];
    const xte = crossTrackDistanceM(current, start, end);
    if (Math.abs(xte) < Math.abs(bestXteM)) {
      bestXteM = xte;
      bestLegIndex = i;
    }
  }

  if (bestLegIndex === -1) {
    return null;
  }

  const start = plan.waypoints[bestLegIndex];
  const end = plan.waypoints[bestLegIndex + 1];
  const side = bestXteM > 0 ? "a dritta" : bestXteM < 0 ? "a sinistra" : "in rotta";
  const severe = Math.abs(bestXteM) > 200;

  return (
    <div
      className={`rounded-xl border p-5 space-y-2 ${
        severe ? "border-danger/60 bg-danger/5" : "border-hull/40 bg-depth/60"
      }`}
    >
      <h3 className="font-display text-foam text-lg">Cross Track Error</h3>
      <p className={`font-mono text-3xl tabular-nums ${severe ? "text-danger" : "text-foam"}`}>
        {Math.abs(bestXteM).toFixed(0)}
        <span className="text-sm text-foam/50 ml-1">m {side}</span>
      </p>
      <p className="text-xs text-foam/50 font-body">
        Leg attivo: {start.name} <span aria-hidden>→</span> {end.name}
      </p>
    </div>
  );
}
