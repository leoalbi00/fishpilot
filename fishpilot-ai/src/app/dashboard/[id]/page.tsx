import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import ScoreGauge from "@/components/ScoreGauge";
import ConditionsCard from "@/components/ConditionsCard";
import FavoriteButton from "@/components/FavoriteButton";
import DashboardModeView from "@/components/DashboardModeView";
import { createClient } from "@/lib/supabase/server";
import { computeSolunar } from "@/lib/solunar";
import { computeTide } from "@/lib/tides";
import type {
  ConditionsSummary,
  FishingTechnique,
  RecommendationsResult,
  SpeciesResult,
  ZonePoint,
} from "@/types/fishing";

const TECHNIQUE_LABELS: Record<string, string> = {
  traina: "Traina",
  bolentino: "Bolentino",
  spinning: "Spinning",
  jigging: "Jigging",
  drifting: "Drifting",
};

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
  const report = data as unknown as FishingReportRow | null;

  if (!report) {
    notFound();
  }

  const trip = report.trips;
  // In modalità Spot c'è un solo punto (indice 0), in modalità Tratta il
  // punto medio (indice 1) rappresenta la zona di pesca principale.
  const primaryZone = report.zones?.[Math.floor((report.zones?.length ?? 1) / 2)];
  const utcOffsetSeconds = report.conditions.utcOffsetSeconds ?? 0;

  // Tabelle solunari e marea: pura astronomia (nessuna chiamata di rete),
  // calcolate qui a partire da data/posizione dello spot.
  const referenceDate = trip ? new Date(trip.date) : new Date();
  const spotLatitude = trip?.start_lat ?? primaryZone?.latitude ?? 0;
  const spotLongitude = trip?.start_lng ?? primaryZone?.longitude ?? 0;
  const solunar = computeSolunar(referenceDate, spotLatitude, spotLongitude);
  const tide = computeTide(referenceDate, spotLongitude);

  const formattedDate = trip
    ? new Date(trip.date).toLocaleString("it-IT", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="chart-texture min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 px-6 py-10 sm:py-14 max-w-4xl mx-auto w-full space-y-8">
        <div className="space-y-3">
          <p className="font-mono text-xs tracking-[0.3em] text-tide uppercase">
            Rapporto di pesca
          </p>
          {trip && (
            <h1 className="font-display text-2xl sm:text-3xl text-foam font-semibold">
              {trip.start_location}
              {trip.destination && (
                <>
                  {" "}
                  <span className="text-foam/40">→</span> {trip.destination}
                </>
              )}
            </h1>
          )}
          {trip && (
            <p className="text-foam/60 text-sm">
              {TECHNIQUE_LABELS[trip.technique] ?? trip.technique} ·{" "}
              {formattedDate}
            </p>
          )}
          {trip && (
            <FavoriteButton
              name={trip.start_location}
              latitude={trip.start_lat}
              longitude={trip.start_lng}
              technique={trip.technique as FishingTechnique}
            />
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8 items-start">
          <div className="flex justify-center lg:sticky lg:top-10">
            <ScoreGauge score={report.score} />
          </div>

          <div className="space-y-6 w-full">
            <ConditionsCard conditions={report.conditions} zone={primaryZone} />

            <DashboardModeView
              species={report.species}
              recommendations={report.recommendations}
              technique={trip?.technique ?? ""}
              primaryZone={primaryZone}
              spotLatitude={spotLatitude}
              spotLongitude={spotLongitude}
              solunar={solunar}
              tide={tide}
              utcOffsetSeconds={utcOffsetSeconds}
            />
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <Link
            href={`/map/${report.id}`}
            className="inline-flex items-center gap-2 rounded-lg border border-tide/50 text-tide px-5 py-3 font-body text-sm hover:bg-tide/10 transition-colors"
          >
            Vedi la rotta sulla mappa →
          </Link>
        </div>
      </main>
    </div>
  );
}
