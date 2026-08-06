// ============================================================
// /lib/fishingAlgorithm.ts
//
// Algoritmo BASE (nessun machine learning) per calcolare il Fishing Score,
// le specie probabili e i consigli, a partire da:
//   weather, seaTemperature, wind, season, time  (+ technique)
//
// Sistema a punteggio: si parte da una base neutra (50) e si sommano o
// sottraggono punti in base a quanto le condizioni sono favorevoli.
// ============================================================

import { SPECIES_DATABASE } from "@/lib/species";
import type {
  FishingAlgorithmInput,
  FishingAlgorithmResult,
  FishingTechnique,
  RecommendationsResult,
  Season,
  SpeciesResult,
  TimeInput,
} from "@/types/fishing";

const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

// ------------------------------------------------------------
// Componenti del punteggio
// ------------------------------------------------------------

/** + punti se la temperatura del mare è nel range favorevole per la maggior
 * parte delle specie pelagiche mediterranee, - punti se è fuori range. */
function scoreSeaTemperature(tempC: number): number {
  if (tempC >= 21 && tempC <= 26) return 18; // range ottimale
  if (tempC >= 18 && tempC < 21) return 10;
  if (tempC > 26 && tempC <= 28) return 8;
  if (tempC >= 15 && tempC < 18) return 4;
  return -6; // troppo fredda o troppo calda
}

/** + punti se il vento è debole/assente, - punti (anche molti) se è forte. */
function scoreWind(speedKmh: number): { points: number; label: string } {
  if (speedKmh < 8) return { points: 16, label: "calmo" };
  if (speedKmh < 15) return { points: 12, label: "leggero" };
  if (speedKmh < 24) return { points: 4, label: "moderato" };
  if (speedKmh < 34) return { points: -12, label: "forte" };
  return { points: -28, label: "molto forte" };
}

/** + punti se il mare è calmo/poco mosso, - punti (molti) se è mosso/agitato. */
function scoreWaveHeight(heightM: number): { points: number; label: string } {
  if (heightM < 0.3) return { points: 14, label: "calmo" };
  if (heightM < 0.6) return { points: 12, label: "quasi calmo" };
  if (heightM < 1.0) return { points: 6, label: "poco mosso" };
  if (heightM < 1.5) return { points: -6, label: "mosso" };
  if (heightM < 2.5) return { points: -20, label: "molto mosso" };
  return { points: -35, label: "agitato" };
}

/** + punti nella finestra alba/tramonto (feeding time), leggero - a mezzogiorno pieno. */
function scoreTimeOfDay(time: TimeInput): number {
  if (time.isDawn || time.isDusk) return 16;
  if (time.hour >= 11 && time.hour <= 15) return -5;
  return 0;
}

/** + punti nella stagione "alta" per la pesca in mare aperto. */
function scoreSeason(season: Season): number {
  if (season === "estate" || season === "autunno") return 8;
  if (season === "primavera") return 4;
  return 0; // inverno: tecnicamente possibile, ma meno favorevole in media
}

// ------------------------------------------------------------
// Specie probabili
// ------------------------------------------------------------

function computeSpeciesProbabilities(
  input: FishingAlgorithmInput
): SpeciesResult[] {
  const { seaTemperature, season, technique, time } = input;
  const results: SpeciesResult[] = [];

  for (const sp of SPECIES_DATABASE) {
    if (!sp.techniques.includes(technique)) continue;

    let p = 40; // punteggio base di probabilità

    // Compatibilità temperatura
    if (
      seaTemperature.surfaceTempC >= sp.minTempC &&
      seaTemperature.surfaceTempC <= sp.maxTempC
    ) {
      p += 30;
    } else {
      const distance = Math.min(
        Math.abs(seaTemperature.surfaceTempC - sp.minTempC),
        Math.abs(seaTemperature.surfaceTempC - sp.maxTempC)
      );
      p -= Math.min(30, distance * 6);
    }

    // Compatibilità stagionale
    p += sp.seasons.includes(season) ? 20 : -15;

    // Le specie pelagiche amano alba/tramonto
    if ((time.isDawn || time.isDusk) && sp.habitat === "pelagic") {
      p += 10;
    }

    results.push({
      name: sp.name,
      scientificName: sp.scientificName,
      probability: clamp(Math.round(p), 2, 98),
    });
  }

  return results.sort((a, b) => b.probability - a.probability).slice(0, 6);
}

// ------------------------------------------------------------
// Consigli pratici
// ------------------------------------------------------------

function buildRecommendations(
  input: FishingAlgorithmInput,
  species: SpeciesResult[],
  score: number
): RecommendationsResult {
  const notes: string[] = [];
  const lures = new Set<string>();
  let depthM = "0-10 m (superficie)";
  let seabedType = "Colonna d'acqua libera, nessun fondale specifico";
  let rig = "Lenza madre + shock leader e piombo antitorsione";
  let trollingSpeedKn: string | undefined;

  const topNames = species.slice(0, 3).map((s) => s.name.toLowerCase());
  const wantsFast = topNames.some(
    (n) =>
      n.includes("tonnetto") || n.includes("palamita") || n.includes("alletterato")
  );
  const wantsSlow = topNames.some(
    (n) => n.includes("lampuga") || n.includes("ricciola")
  );

  switch (input.technique as FishingTechnique) {
    case "traina": {
      if (wantsFast && !wantsSlow) trollingSpeedKn = "6-8 nodi";
      else if (wantsSlow && !wantsFast) trollingSpeedKn = "3-5 nodi";
      else trollingSpeedKn = "4-6 nodi";

      lures.add("piume in scia (feather jig)");
      lures.add("octopus / squid skirt");
      rig = "Lenza madre in monofilo/treccia + piombo paravano e terminale in fluorocarbon";

      if (topNames.some((n) => n.includes("ricciola"))) {
        lures.add("minnow affondante");
        depthM = "15-40 m (vicino a strutture/secche)";
        seabedType = "Roccia / secche (strutture sommerse)";
      } else {
        depthM = "0-15 m (superficie/sub-superficie)";
        seabedType = "Pelagico, colonna d'acqua libera al largo";
      }
      break;
    }
    case "jigging": {
      lures.add("jig verticale 60-150 g");
      depthM = "30-80 m (su secche e strutture)";
      seabedType = "Roccia, secche e strutture sommerse";
      rig = "Treccia PE + shock leader in fluorocarbon, jig con assist hook";
      break;
    }
    case "spinning": {
      lures.add("minnow / popper di superficie");
      lures.add("esca siliconica");
      depthM = "0-5 m";
      seabedType = "Costa rocciosa o scogliera, acqua bassa";
      rig = "Treccia sottile + terminale in fluorocarbon, senza piombo (o piombino minimo)";
      break;
    }
    case "bolentino": {
      lures.add("esca naturale (bigattini, gamberetto, calamaro)");
      depthM = "20-60 m su fondale misto";
      seabedType = "Sabbia / fondale misto sabbia-roccia";
      rig = "Lenza con 2-3 ami a paternoster e piombo terminale";
      break;
    }
    case "drifting": {
      lures.add("esca naturale in deriva (sardina, alaccia)");
      depthM = "10-40 m";
      seabedType = "Fondale variabile, pesca in deriva a mezz'acqua";
      rig = "Amo singolo su lenza leggera, senza piombo (o piombo minimo) per lasciare scendere l'esca naturalmente";
      break;
    }
  }

  const bestTimeWindow =
    input.time.isDawn || input.time.isDusk
      ? "Sei già nella finestra migliore: 1h prima e dopo alba/tramonto"
      : "Meglio spostarsi verso l'alba (circa 1h prima/dopo il sorgere del sole) o il tramonto";

  if (score < 40) {
    notes.push(
      "Condizioni poco favorevoli nel complesso: valuta di rimandare o cambiare zona."
    );
  }
  if (input.wind.speedKmh > 24) {
    notes.push(
      "Vento sostenuto: controlla sempre il bollettino meteo-marino prima di uscire."
    );
  }
  if (input.weather.waveHeightM > 1.5) {
    notes.push(
      "Mare mosso/molto mosso: naviga con prudenza, valuta zone più riparate."
    );
  }

  return {
    trollingSpeedKn,
    depthM,
    seabedType,
    rig,
    lures: Array.from(lures),
    bestTimeWindow,
    notes,
  };
}

// ------------------------------------------------------------
// Funzione principale
// ------------------------------------------------------------

export function runFishingAlgorithm(
  input: FishingAlgorithmInput
): FishingAlgorithmResult {
  let score = 50; // base neutra

  score += scoreSeaTemperature(input.seaTemperature.surfaceTempC);

  const windScore = scoreWind(input.wind.speedKmh);
  score += windScore.points;

  const waveScore = scoreWaveHeight(input.weather.waveHeightM);
  score += waveScore.points;

  score += scoreTimeOfDay(input.time);
  score += scoreSeason(input.season);

  score = clamp(Math.round(score), 0, 100);

  const species = computeSpeciesProbabilities(input);
  const recommendations = buildRecommendations(input, species, score);

  const warnings: string[] = [];
  if (input.wind.speedKmh > 34) {
    warnings.push("Vento molto forte: uscita in mare sconsigliata.");
  }
  if (input.weather.waveHeightM > 2.5) {
    warnings.push("Mare agitato: condizioni potenzialmente pericolose.");
  }

  return {
    score,
    species,
    recommendations,
    conditions: {
      seaState: waveScore.label,
      windState: windScore.label,
      summary: `Mare ${waveScore.label}, vento ${windScore.label}, acqua a ${input.seaTemperature.surfaceTempC.toFixed(1)}°C`,
      warnings,
    },
  };
}
