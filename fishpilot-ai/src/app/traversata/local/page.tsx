"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import RouteResultsView from "@/components/RouteResultsView";
import { readLocalRoute } from "@/lib/localRoute";
import type { RoutePlanResult } from "@/types/fishing";

/** Fallback per rotte calcolate ma non salvate su Supabase (vedi lib/localRoute.ts). */
export default function LocalTraversataPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<RoutePlanResult | null | undefined>(undefined);

  useEffect(() => {
    setPlan(readLocalRoute());
  }, []);

  if (plan === undefined) {
    return (
      <div className="chart-texture min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-foam/50 font-body">Caricamento…</p>
        </main>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="chart-texture min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-foam/70 font-body">Nessuna rotta calcolata di recente da mostrare.</p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="min-h-[48px] rounded-lg border border-tide/50 text-tide px-5 py-3 font-body text-sm hover:bg-tide/10 transition-colors"
          >
            Torna alla home
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="chart-texture min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 px-6 py-10 sm:py-14 max-w-4xl mx-auto w-full">
        <RouteResultsView plan={plan} />
      </main>
    </div>
  );
}
