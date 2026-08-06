import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import SpotResultsView from "@/components/SpotResultsView";
import { createClient } from "@/lib/supabase/server";
import { computeSolunar } from "@/lib/solunar";
import { computeTide } from "@/lib/tides";
import { computeNightForecast } from "@/lib/nightForecast";
import type {
  ConditionsSummary,
  NightForecastResult,
  RecommendationsResult,
  SpeciesResult,
  SpotReportResult,
  ZonePoint,
} from "@/types/fishing";

interface FishingReportRow {
  id: string;
  score: number;
  species: SpeciesResult[];
  recommendations: RecommendationsResult;
  conditions: ConditionsSummary;
  zones: ZonePoint[];
  created_at: string;
  trips: {
    start_location: string;
    destination: string | null;
    technique: string;
    date: string;
    start_lat: number;
    start_lng: number;
  } | null;
}

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("fishing_reports")
    .select(
      "id, score, species, recommendations, conditions, zones, created_at, trips(start_location, destination, technique, date, start_lat, start_lng)"
    )
    .eq("id", id)
    .single();

  // Cast esplicito: senza tipi generati da Supabase (supabase gen types),
  // l'inferenza automatica sulle relazioni annidate (trips(...)) non è
  // affidabile, quindi tipizziamo il risultato con l'interfaccia sopra.
  const row = data as unknown as FishingReportRow | null;

  if (!row || !row.trips) {
    notFound();
  }

  const trip = row.trips;
  // In modalità Spot c'è un solo punto (indice 0), in modalità Tratta il
  // punto medio (indice 1) rappresenta la zona di pesca principale.
  // Il punto primario è il centro/spot singolo (indice 0), tranne in
  // modalità Tratta (3 zone: partenza/metà/arrivo) dove è il punto medio.
  const primaryZone = row.zones?.[(row.zones?.length ?? 1) === 3 ? 1 : 0];
  const utcOffsetSeconds = row.conditions.utcOffsetSeconds ?? 0;

  // Tabelle solunari e marea: pura astronomia (nessuna chiamata di rete),
  // calcolate qui a partire da data/posizione dello spot.
  const referenceDate = new Date(trip.date);
  const solunar = computeSolunar(referenceDate, trip.start_lat, trip.start_lng);
  const tide = computeTide(referenceDate, trip.start_lng);

  // Previsione notturna: richiede rete (a differenza di solunari/maree, pura
  // astronomia); non deve mai far fallire il rendering dell'intera pagina.
  let nightForecast: NightForecastResult;
  try {
    nightForecast = await computeNightForecast(
      referenceDate.toISOString().slice(0, 10),
      trip.start_lat,
      trip.start_lng
    );
  } catch {
    nightForecast = {
      points: [],
      trend: "stabile",
      maxWindSpeedKmh: 0,
      maxWaveHeightM: 0,
      stormWarning: false,
      stormReasons: [],
    };
  }

  const report: SpotReportResult = {
    id: row.id,
    persisted: true,
    score: row.score,
    species: row.species,
    recommendations: row.recommendations,
    conditions: row.conditions,
    primaryZone,
    trip: {
      startLocation: trip.start_location,
      technique: trip.technique as SpotReportResult["trip"]["technique"],
      date: trip.date,
      latitude: trip.start_lat,
      longitude: trip.start_lng,
    },
    solunar,
    tide,
    nightForecast,
    utcOffsetSeconds,
  };

  return (
    <div className="chart-texture min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 px-6 py-10 sm:py-14 max-w-4xl mx-auto w-full">
        <SpotResultsView report={report} />
      </main>
    </div>
  );
}
