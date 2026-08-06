"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import SpotResultsView from "@/components/SpotResultsView";
import { readLocalReport } from "@/lib/localReport";
import type { SpotReportResult } from "@/types/fishing";

/** Fallback per rapporti calcolati ma non salvati su Supabase (vedi lib/localReport.ts). */
export default function LocalDashboardPage() {
  const router = useRouter();
  const [report, setReport] = useState<SpotReportResult | null | undefined>(undefined);

  useEffect(() => {
    setReport(readLocalReport());
  }, []);

  if (report === undefined) {
    return (
      <div className="chart-texture min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-foam/50 font-body">Caricamento…</p>
        </main>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="chart-texture min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-foam/70 font-body">Nessun rapporto calcolato di recente da mostrare.</p>
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
        <SpotResultsView report={report} />
      </main>
    </div>
  );
}
