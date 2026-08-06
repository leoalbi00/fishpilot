"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppPreferences } from "@/components/AppPreferencesProvider";
import { saveReuseSpot } from "@/lib/crossEcosystem";
import ScoreGauge from "@/components/ScoreGauge";
import ConditionsCard from "@/components/ConditionsCard";
import FavoriteButton from "@/components/FavoriteButton";
import ShelterCard from "@/components/ShelterCard";
import BayDiscoveryCard from "@/components/BayDiscoveryCard";
import SeabedCard from "@/components/SeabedCard";
import AnchorWatch from "@/components/AnchorWatch";
import NightForecastCard from "@/components/NightForecastCard";
import SpeciesList from "@/components/SpeciesList";
import RecommendationsCard from "@/components/RecommendationsCard";
import SolunarCard from "@/components/SolunarCard";
import TideChart from "@/components/TideChart";
import AtAnchorTechniquesCard from "@/components/AtAnchorTechniquesCard";
import DataSourcesFooter from "@/components/DataSourcesFooter";
import type { SpotReportResult } from "@/types/fishing";

const TECHNIQUE_LABELS: Record<string, string> = {
  traina: "Traina",
  bolentino: "Bolentino",
  spinning: "Spinning",
  jigging: "Jigging",
  drifting: "Drifting",
};

/** Vista dei risultati di uno spot (⚓ Rada / 🎣 Pesca): un solo componente,
 * ma con contenuti rigorosamente segregati per ecosistema — nessuna scheda
 * di pesca (tecnica, specie, esche, solunari) è visibile fuori da 🎣 Pesca,
 * nessun contenuto di ancoraggio fuori da ⚓ Rada. Usato sia dalla pagina
 * persistita (/dashboard/[id], dati da Supabase) sia dal fallback locale
 * (/dashboard/local, quando il salvataggio su Supabase non è riuscito). */
export default function SpotResultsView({ report }: { report: SpotReportResult }) {
  const { mode, setMode } = useAppPreferences();
  const router = useRouter();

  function useForTraversata() {
    saveReuseSpot({
      label: report.trip.startLocation,
      latitude: report.trip.latitude,
      longitude: report.trip.longitude,
    });
    setMode("traversata");
    router.push("/");
  }

  const formattedDate = new Date(report.trip.date).toLocaleString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <p className="font-mono text-xs tracking-[0.3em] text-tide uppercase">
          {mode === "rada" ? "Rapporto Rada" : mode === "pesca" ? "Rapporto di pesca" : "Rapporto spot"}
        </p>
        <h1 className="font-display text-2xl sm:text-3xl text-foam font-semibold">
          {report.trip.startLocation}
        </h1>
        <p className="text-foam/60 text-sm">
          {mode === "pesca" && `${TECHNIQUE_LABELS[report.trip.technique] ?? report.trip.technique} · `}
          {formattedDate}
        </p>

        <FavoriteButton
          name={report.trip.startLocation}
          latitude={report.trip.latitude}
          longitude={report.trip.longitude}
          technique={report.trip.technique}
        />

        {!report.persisted && (
          <p className="text-xs text-signal/90 bg-signal/10 border border-signal/30 rounded-lg px-3 py-2 inline-block">
            Rapporto calcolato ma non salvato: questo link non è condivisibile e andrà perso
            ricaricando la pagina. Ricalcola quando serve.
          </p>
        )}

        {mode !== "traversata" && (
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => setMode(mode === "rada" ? "pesca" : "rada")}
              className="text-xs font-body rounded-full border border-hull/50 text-foam/60 px-3 py-1.5 hover:border-tide/60 hover:text-foam transition-colors"
            >
              {mode === "rada" ? "🎣 Usa questo spot per Pesca" : "⚓ Usa questo spot per Rada"}
            </button>
            <button
              type="button"
              onClick={useForTraversata}
              className="text-xs font-body rounded-full border border-hull/50 text-foam/60 px-3 py-1.5 hover:border-tide/60 hover:text-foam transition-colors"
            >
              ⛵ Usa questo spot per Traversata
            </button>
          </div>
        )}
      </div>

      {mode === "traversata" ? (
        <div className="rounded-xl border border-hull/40 bg-depth/60 p-6 text-center space-y-3">
          <p className="text-foam/70 font-body">
            Questo spot appartiene agli ecosistemi ⚓ Rada e 🎣 Pesca. Passa a una di queste
            modalità dal selettore in alto per vederne i dettagli.
          </p>
          <button
            type="button"
            onClick={() => setMode("pesca")}
            className="inline-flex items-center gap-2 rounded-lg border border-tide/50 text-tide px-5 py-3 font-body text-sm hover:bg-tide/10 transition-colors"
          >
            🎣 Passa a Pesca →
          </button>
        </div>
      ) : mode === "pesca" ? (
        <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8 items-start">
          <div className="flex justify-center lg:sticky lg:top-10">
            <ScoreGauge score={report.score} />
          </div>

          <div className="space-y-6 w-full">
            <ConditionsCard conditions={report.conditions} zone={report.primaryZone} />

            <div>
              <h2 className="font-display text-foam text-lg mb-3">Specie probabili</h2>
              <SpeciesList species={report.species} />
            </div>

            <RecommendationsCard
              recommendations={report.recommendations}
              species={report.species}
              technique={report.trip.technique}
            />

            <SolunarCard solunar={report.solunar} utcOffsetSeconds={report.utcOffsetSeconds} />
            <TideChart tide={report.tide} utcOffsetSeconds={report.utcOffsetSeconds} />
            <AtAnchorTechniquesCard />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <ConditionsCard conditions={report.conditions} zone={report.primaryZone} />

          {report.primaryZone && (
            <ShelterCard
              windDirectionDeg={report.primaryZone.windDirectionDeg}
              windSpeedKmh={report.primaryZone.windSpeedKmh}
              waveDirectionDeg={report.primaryZone.waveDirectionDeg}
              waveHeightM={report.primaryZone.waveHeightM}
            />
          )}

          <SeabedCard latitude={report.trip.latitude} longitude={report.trip.longitude} />
          <BayDiscoveryCard bays={report.nearbyBays} />
          <NightForecastCard forecast={report.nightForecast} utcOffsetSeconds={report.utcOffsetSeconds} />
          <AnchorWatch />
        </div>
      )}

      {report.persisted && report.id && mode !== "traversata" && (
        <div className="flex justify-center pt-2">
          <Link
            href={`/map/${report.id}`}
            className="inline-flex items-center gap-2 rounded-lg border border-tide/50 text-tide px-5 py-3 font-body text-sm hover:bg-tide/10 transition-colors"
          >
            Vedi la rotta sulla mappa →
          </Link>
        </div>
      )}

      {mode !== "traversata" && (
        <DataSourcesFooter
          sources={
            mode === "rada"
              ? [
                  "Baie/spiagge vicine: OpenStreetMap (Overpass API)",
                  "Meteo/mare: Open-Meteo Forecast + Marine API (ECMWF/ICON-EU live)",
                  "Fondale e mappa substrato (sabbia/roccia/posidonia): EMODnet Geology (beta)",
                ]
              : [
                  "Meteo/mare: Open-Meteo Forecast + Marine API (ECMWF/ICON-EU live)",
                  "Fishing Score, specie e tecniche: algoritmo interno FishPilot (euristica)",
                  "Secche/scogli/relitti (mappa): OpenStreetMap (Overpass API)",
                ]
          }
          generatedAtISO={report.generatedAtISO}
          utcOffsetSeconds={report.utcOffsetSeconds}
        />
      )}
    </div>
  );
}
