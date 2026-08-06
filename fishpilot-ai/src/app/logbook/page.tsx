"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import CopernicusMap from "@/components/CopernicusMap";
import LogbookForm from "@/components/LogbookForm";
import LogbookList from "@/components/LogbookList";
import DataSourcesFooter from "@/components/DataSourcesFooter";
import { listLogbookEntries } from "@/lib/logbook";
import type { LogbookEntry } from "@/types/fishing";

/** Ecosistema 📊 Copernicus & Log: layer satellitari Copernicus Marine +
 * Diario di Bordo digitalizzato, in un'unica schermata dedicata (fuori dal
 * flusso "spot" di Rada/Pesca). */
export default function LogbookPage() {
  const [entries, setEntries] = useState<LogbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [footerMeta, setFooterMeta] = useState<{ nowISO: string; utcOffsetSeconds: number } | null>(
    null
  );

  async function refresh() {
    setEntries(await listLogbookEntries());
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    setFooterMeta({
      nowISO: new Date().toISOString(),
      utcOffsetSeconds: -new Date().getTimezoneOffset() * 60,
    });
  }, []);

  return (
    <div className="chart-texture min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 px-6 py-10 sm:py-14 max-w-4xl mx-auto w-full space-y-8">
        <div className="space-y-2">
          <p className="font-mono text-xs tracking-[0.3em] text-tide uppercase">
            📊 Copernicus Marine & Logbook
          </p>
          <h1 className="font-display text-2xl sm:text-3xl text-foam font-semibold">
            Osservazione satellitare e Diario di Bordo
          </h1>
          <p className="text-foam/60 text-sm">
            Layer satellitari Copernicus Marine e registro digitale delle tue uscite.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="font-display text-foam text-lg">Layer Satellitari</h2>
          <CopernicusMap />
        </div>

        <LogbookForm onSaved={refresh} />

        <div className="space-y-3">
          <h2 className="font-display text-foam text-lg">Diario di Bordo</h2>
          {loading ? (
            <p className="text-sm text-foam/50 font-body">Caricamento…</p>
          ) : (
            <LogbookList entries={entries} onChanged={refresh} />
          )}
        </div>

        {footerMeta && (
          <DataSourcesFooter
            sources={[
              "Temperatura mare (SST) e Clorofilla-a: Copernicus Marine Service (beta)",
              "Meteo/mare all'uscita: Open-Meteo Forecast + Marine API",
              "Località: OpenStreetMap Nominatim",
              "Diario e foto: Supabase (fallback locale sul dispositivo se non raggiungibile)",
            ]}
            generatedAtISO={footerMeta.nowISO}
            utcOffsetSeconds={footerMeta.utcOffsetSeconds}
          />
        )}
      </main>
    </div>
  );
}
