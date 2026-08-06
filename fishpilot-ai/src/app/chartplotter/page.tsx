"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import ChartplotterGauges from "@/components/ChartplotterGauges";
import XteCard from "@/components/XteCard";
import MobButton from "@/components/MobButton";
import ChartplotterMap from "@/components/ChartplotterMap";
import DataSourcesFooter from "@/components/DataSourcesFooter";

/** Ecosistema 🎛️ Chartplotter: un solo watchPosition condiviso da quadro
 * strumenti, XTE, mappa own-ship e MOB, per evitare più sottoscrizioni GPS
 * concorrenti (spreco di batteria) sulla stessa schermata. */
export default function ChartplotterPage() {
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  // Calcolati lato client dopo il mount (non in render diretto): "new
  // Date()" letto durante il render SSR differirebbe da quello
  // dell'idratazione lato client, causando un mismatch React.
  const [footerMeta, setFooterMeta] = useState<{ nowISO: string; utcOffsetSeconds: number } | null>(
    null
  );

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError("Il tuo browser non supporta la geolocalizzazione.");
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition(pos);
        setGpsError(null);
      },
      () => setGpsError("Segnale GPS non disponibile."),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    setFooterMeta({
      nowISO: new Date().toISOString(),
      utcOffsetSeconds: -new Date().getTimezoneOffset() * 60,
    });
  }, []);

  return (
    <div className="chart-texture min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 px-6 py-10 sm:py-14 max-w-4xl mx-auto w-full space-y-6">
        <div className="space-y-2">
          <p className="font-mono text-xs tracking-[0.3em] text-tide uppercase">
            🎛️ Chartplotter & Virtual Instruments
          </p>
          <h1 className="font-display text-2xl sm:text-3xl text-foam font-semibold">
            Quadro strumenti di bordo
          </h1>
          <p className="text-foam/60 text-sm">
            Dati letti in tempo reale dai sensori del dispositivo: nessuna simulazione.
          </p>
        </div>

        <MobButton position={position} />
        <ChartplotterGauges position={position} gpsError={gpsError} />
        <XteCard position={position} />
        <ChartplotterMap position={position} />

        {footerMeta && (
          <DataSourcesFooter
            sources={[
              "Posizione, velocità e rotta sul fondo (SOG/COG): GPS del dispositivo",
              "Bussola e inclinometro: magnetometro/giroscopio del dispositivo (Sensor API)",
              "Cross Track Error: calcolo geodetico locale sull'ultima Traversata calcolata",
              "Layer AIS: nessuna sorgente configurata in questa build",
            ]}
            generatedAtISO={footerMeta.nowISO}
            utcOffsetSeconds={footerMeta.utcOffsetSeconds}
          />
        )}
      </main>
    </div>
  );
}
