"use client";

import { useAppPreferences } from "@/components/AppPreferencesProvider";
import ShelterCard from "@/components/ShelterCard";
import SeabedCard from "@/components/SeabedCard";
import AnchorWatch from "@/components/AnchorWatch";
import SpeciesList from "@/components/SpeciesList";
import RecommendationsCard from "@/components/RecommendationsCard";
import SolunarCard from "@/components/SolunarCard";
import TideChart from "@/components/TideChart";
import AtAnchorTechniquesCard from "@/components/AtAnchorTechniquesCard";
import type {
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
  utcOffsetSeconds: number;
}

/** Sezioni della Dashboard che dipendono dalla modalità applicativa
 * (⚓ Rada / 🎣 Pesca / 📊 Combo), lette dal contesto globale. */
export default function DashboardModeView({
  species,
  recommendations,
  technique,
  primaryZone,
  spotLatitude,
  spotLongitude,
  solunar,
  tide,
  utcOffsetSeconds,
}: DashboardModeViewProps) {
  const { mode } = useAppPreferences();

  const showRada = mode === "rada" || mode === "combo";
  const showPesca = mode === "pesca" || mode === "combo";

  return (
    <div className="space-y-6">
      {showRada && (
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
          <AnchorWatch />
        </div>
      )}

      {showPesca && (
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
      )}
    </div>
  );
}
