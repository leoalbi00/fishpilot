import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import FishingMap from "@/components/FishingMap";
import { createClient } from "@/lib/supabase/server";
import { findSeamarkFeatures } from "@/lib/seamarkFeatures";
import type { SeamarkFeature, ZonePoint } from "@/types/fishing";

interface MapReportRow {
  id: string;
  zones: ZonePoint[];
  trips: {
    start_location: string;
    destination: string | null;
  } | null;
}

export default async function MapPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("fishing_reports")
    .select("id, zones, trips(start_location, destination)")
    .eq("id", id)
    .single();

  // Cast esplicito (vedi stessa nota nella dashboard page).
  const report = data as unknown as MapReportRow | null;

  if (!report || !report.zones || report.zones.length === 0) {
    notFound();
  }

  const trip = report.trips;

  // Secche/scogli/relitti (OSM, best-effort — findSeamarkFeatures gestisce
  // già internamente ogni errore restituendo un elenco vuoto): centro sulla
  // media delle zone campionate.
  const centerLat = report.zones.reduce((sum, z) => sum + z.latitude, 0) / report.zones.length;
  const centerLng = report.zones.reduce((sum, z) => sum + z.longitude, 0) / report.zones.length;
  const hazards: SeamarkFeature[] = await findSeamarkFeatures(centerLat, centerLng);

  return (
    <div className="min-h-screen flex flex-col bg-abyss">
      <Navbar />

      <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 max-w-6xl mx-auto w-full">
        <div>
          <p className="font-mono text-xs tracking-[0.3em] text-tide uppercase">
            {trip?.destination ? "Rotta e zone di pesca" : "Zona di pesca"}
          </p>
          {trip && (
            <h1 className="font-display text-xl sm:text-2xl text-foam font-semibold">
              {trip.start_location}
              {trip.destination && (
                <>
                  {" "}
                  <span className="text-foam/40">→</span> {trip.destination}
                </>
              )}
            </h1>
          )}
        </div>

        <Link
          href={`/dashboard/${report.id}`}
          className="min-h-[44px] inline-flex items-center gap-2 text-sm text-foam/70 hover:text-tide transition-colors"
        >
          ← Torna al rapporto
        </Link>
      </div>

      <div className="flex-1 px-6 pb-8 max-w-6xl mx-auto w-full">
        <FishingMap zones={report.zones} hazards={hazards} />

        <div className="flex flex-wrap gap-4 mt-4 text-xs font-mono text-foam/60">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-danger inline-block" />
            Score &lt; 40 — sconsigliato
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-signal inline-block" />
            Score 40-69 — discreto
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-tide inline-block" />
            Score ≥ 70 — ottimo
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden>☠️🪨⚠️🔺</span>
            Relitti / Scogli / Ostruzioni / Secche (OSM)
          </span>
        </div>

        <p className="text-xs text-foam/40 mt-3 font-body">
          {trip?.destination
            ? "Nota: nell'MVP il percorso è tracciato come linea diretta tra i punti campionati (partenza, metà rotta, destinazione); non usa ancora un'API di navigazione marina reale."
            : "Nota: modalità Spot Singolo, un solo punto campionato."}
          {" "}Punti di interesse per la pesca da OpenStreetMap: censimento non ufficiale, verifica
          sempre con ecoscandaglio e carta nautica.
        </p>
      </div>
    </div>
  );
}
