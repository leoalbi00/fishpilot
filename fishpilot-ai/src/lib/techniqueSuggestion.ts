// ============================================================
// /lib/techniqueSuggestion.ts — Pesca: tecnica Suggerita
//
// Euristica leggera lato client (data/ora, nessuna chiamata di rete): serve
// a proporre una tecnica di partenza PRIMA dell'analisi, quando meteo/mare
// reali non sono ancora noti. È volutamente semplice — una volta ottenuto
// il report, le condizioni reali guidano le raccomandazioni vere (vedi
// lib/fishingAlgorithm.ts). L'utente può sempre passare a scelta manuale.
// ============================================================

import { getSeason } from "@/lib/utils";
import type { FishingTechnique } from "@/types/fishing";

export interface TechniqueSuggestion {
  technique: FishingTechnique;
  reason: string;
}

export function suggestTechnique(dateISO: string, hour: number): TechniqueSuggestion {
  const season = getSeason(dateISO);
  const isDawnDuskWindow = hour <= 8 || hour >= 18;
  const isMidday = hour >= 11 && hour <= 15;

  if (isDawnDuskWindow && (season === "estate" || season === "autunno")) {
    return {
      technique: "traina",
      reason: "Alba/tramonto in stagione calda: pelagici probabilmente attivi in superficie.",
    };
  }

  if (isMidday) {
    return {
      technique: "jigging",
      reason: "Ore centrali, luce piena: meglio lavorare in profondità su strutture e secche.",
    };
  }

  if (season === "inverno") {
    return {
      technique: "bolentino",
      reason: "Stagione fredda: le specie di fondale sono in genere più attive vicino al fondo.",
    };
  }

  if (isDawnDuskWindow) {
    return {
      technique: "spinning",
      reason: "Alba/tramonto: buona finestra per lanciare sottocosta.",
    };
  }

  return {
    technique: "drifting",
    reason: "Condizioni generiche: tecnica versatile, esca naturale in deriva.",
  };
}
