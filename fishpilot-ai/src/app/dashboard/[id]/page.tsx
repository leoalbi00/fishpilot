import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import ScoreGauge from "@/components/ScoreGauge";
import SpeciesList from "@/components/SpeciesList";
import RecommendationsCard from "@/components/RecommendationsCard";
import ConditionsCard from "@/components/ConditionsCard";
import { createClient } from "@/lib/supabase/server";
import type {
  ConditionsSummary,
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
    destination: string;
    technique: string;
    date: string;
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
      "id, score, species, recommendations, conditions, zones, created_at, trips(start_location, destination, technique, date)"
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
  const midZone = report.zones?.[1];

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
        <div className="space-y-2">
          <p className="font-mono text-xs tracking-[0.3em] text-tide uppercase">
            Rapporto di pesca
          </p>
          {trip && (
            <h1 className="font-display text-2xl sm:text-3xl text-foam font-semibold">
              {trip.start_location} <span className="text-foam/40">→</span>{" "}
              {trip.destination}
            </h1>
          )}
          {trip && (
            <p className="text-foam/60 text-sm">
              {TECHNIQUE_LABELS[trip.technique] ?? trip.technique} ·{" "}
              {formattedDate}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8 items-start">
          <div className="flex justify-center lg:sticky lg:top-10">
            <ScoreGauge score={report.score} />
          </div>

          <div className="space-y-6 w-full">
            <ConditionsCard
              conditions={report.conditions}
              seaSurfaceTempC={midZone?.seaSurfaceTempC}
              waveHeightM={midZone?.waveHeightM}
              windSpeedKmh={midZone?.windSpeedKmh}
            />

            <div>
              <h2 className="font-display text-foam text-lg mb-3">
                Specie probabili
              </h2>
              <SpeciesList species={report.species} />
            </div>

            <RecommendationsCard recommendations={report.recommendations} />
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
