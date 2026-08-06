"use client";

import { useAppPreferences } from "@/components/AppPreferencesProvider";
import ShelterCard from "@/components/ShelterCard";
import SeabedCard from "@/components/SeabedCard";
import AnchorWatch from "@/components/AnchorWatch";
import NightForecastCard from "@/components/NightForecastCard";
import SpeciesList from "@/components/SpeciesList";
import RecommendationsCard from "@/components/RecommendationsCard";
import SolunarCard from "@/components/SolunarCard";
import TideChart from "@/components/TideChart";
import AtAnchorTechniquesCard from "@/components/AtAnchorTechniquesCard";
import type {
  NightForecastResult,
  RecommendationsResult,
  SolunarResult,
  SpeciesResult,
  TideResult,
  ZonePoint,
} from "@/types/fishing";

interface DashboardModeViewProps {
  species: SpeciesResult[];
  recommendations: RecommendationsResult;
  technique: string;
  primaryZone?: ZonePoint;
  spotLatitude: number;
  spotLongitude: number;
  solunar: SolunarResult;
  tide: TideResult;
  nightForecast: NightForecastResult;
  utcOffsetSeconds: number;
}

/** Sezione della Dashboard specifica per l'ecosistema attivo (⛵/⚓/🎣),
 * letto dal contesto globale: ogni ecosistema è indipendente, uno alla volta. */
export default function DashboardModeView({
  species,
  recommendations,
  technique,
  primaryZone,
  spotLatitude,
  spotLongitude,
  solunar,
  tide,
  nightForecast,
  utcOffsetSeconds,
}: DashboardModeViewProps) {
  const { mode, setMode } = useAppPreferences();

  if (mode === "traversata") {
    return (
      <div className="rounded-xl border border-hull/40 bg-depth/60 p-6 text-center space-y-3">
        <p className="text-foam/70 font-body">
          Questo spot appartiene agli ecosistemi ⚓ Rada e 🎣 Pesca. Passa a una di queste
          modalità dal selettore in alto per vederne i dettagli.
        </p>
        <button
          type="button"
          onClick={() => {
            setMode("pesca");
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-tide/50 text-tide px-5 py-3 font-body text-sm hover:bg-tide/10 transition-colors"
        >
          🎣 Passa a Pesca →
        </button>
      </div>
    );
  }

  if (mode === "rada") {
    return (
      <div className="space-y-6">
        {primaryZone && (
          <ShelterCard
            windDirectionDeg={primaryZone.windDirectionDeg}
            windSpeedKmh={primaryZone.windSpeedKmh}
            waveDirectionDeg={primaryZone.waveDirectionDeg}
            waveHeightM={primaryZone.waveHeightM}
          />
        )}
        <SeabedCard latitude={spotLatitude} longitude={spotLongitude} />
        <NightForecastCard forecast={nightForecast} utcOffsetSeconds={utcOffsetSeconds} />
        <AnchorWatch />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-foam text-lg mb-3">Specie probabili</h2>
        <SpeciesList species={species} />
      </div>

      <RecommendationsCard
        recommendations={recommendations}
        species={species}
        technique={technique}
      />

      <SolunarCard solunar={solunar} utcOffsetSeconds={utcOffsetSeconds} />
      <TideChart tide={tide} utcOffsetSeconds={utcOffsetSeconds} />
      <AtAnchorTechniquesCard />
    </div>
  );
}
