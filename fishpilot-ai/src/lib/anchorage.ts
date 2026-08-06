// ============================================================
// /lib/anchorage.ts
//
// Modulo Rada & Ancoraggio: Shelter Score (protezione della baia) e
// consigli di tenuta del fondale.
//
// Lo Shelter Score è un'EURISTICA (nessun dato batimetrico/costiero
// reale): incrocia intensità/direzione di vento e onda di fondo con
// l'"esposizione" della baia (la direzione verso cui si apre l'imbocco),
// impostabile manualmente dall'utente perché non esiste una sorgente
// gratuita di geometria costiera integrata. Se l'esposizione non è nota,
// il punteggio si basa solo sull'intensità di vento/mare ed è etichettato
// come tale: va sempre affiancato da carta nautica e buon senso marinaro,
// mai usato come unica fonte per la sicurezza dell'ormeggio.
// ============================================================

import type { SeabedHoldingType, ShelterAssessment } from "@/types/fishing";

const DEG = Math.PI / 180;

/** 0 (direzione opposta all'imbocco: baia riparata) .. 1 (direzione
 * allineata all'imbocco: baia in piena esposizione). */
function exposureFactor(fromDirectionDeg: number, bayExposureDeg: number): number {
  const diff = (fromDirectionDeg - bayExposureDeg) * DEG;
  return (1 + Math.cos(diff)) / 2;
}

export interface ShelterInput {
  windDirectionDeg: number;
  windSpeedKmh: number;
  waveDirectionDeg: number;
  waveHeightM: number;
  /** Direzione (gradi, da cui proviene mare/vento) verso cui si apre la
   * baia; null se non specificata dall'utente. */
  bayExposureDeg: number | null;
}

export function assessShelter(input: ShelterInput): ShelterAssessment {
  const windSeverity = Math.max(0, Math.min(1, input.windSpeedKmh / 40));
  const waveSeverity = Math.max(0, Math.min(1, input.waveHeightM / 2));
  const severity = Math.max(windSeverity, waveSeverity * 1.1); // il moto ondoso pesa un filo di più

  const exposureKnown = input.bayExposureDeg !== null;
  const windExposure = exposureKnown
    ? exposureFactor(input.windDirectionDeg, input.bayExposureDeg as number)
    : 0.5;
  const waveExposure = exposureKnown
    ? exposureFactor(input.waveDirectionDeg, input.bayExposureDeg as number)
    : 0.5;
  const combinedExposure = waveExposure * 0.6 + windExposure * 0.4;

  const penalty = Math.round(combinedExposure * severity * 100);
  const scorePct = Math.max(0, Math.min(100, 100 - penalty));

  let label: string;
  if (scorePct >= 80) label = "Baia Protetta";
  else if (scorePct >= 55) label = "Riparo Parziale";
  else if (scorePct >= 30) label = "Esposta";
  else label = "Molto Esposta";

  const warnings: string[] = [];

  if (!exposureKnown) {
    warnings.push(
      "Esposizione della baia non specificata: punteggio basato solo su intensità di vento/mare. Imposta la direzione dell'imbocco per una stima più utile."
    );
  }

  if (exposureKnown && waveExposure > 0.6 && input.waveHeightM >= 0.4) {
    warnings.push(
      "Rischio risacca notturna: l'onda di fondo entra nell'imbocco della baia, anche se il vento locale dovesse calare."
    );
  }

  if (exposureKnown && windExposure > 0.6 && input.windSpeedKmh >= 20) {
    warnings.push("Vento in ingresso diretto nella baia: aspettati raffiche e possibile orzata sull'ancora.");
  }

  if (severity > 0.7) {
    warnings.push("Condizioni già mosse al largo: verifica il bollettino meteo-marino prima di dare fondo.");
  }

  return { scorePct, label, warnings, exposureKnown };
}

export const SEABED_ADVICE: Record<
  SeabedHoldingType,
  { label: string; quality: string; advice: string }
> = {
  sabbia: {
    label: "Sabbia",
    quality: "Ottima",
    advice:
      "Ottima tenuta per la maggior parte delle ancore (Danforth, aratro, artiglio). Cala catena a sufficienza (rapporto scope minimo 5:1).",
  },
  posidonia: {
    label: "Posidonia oceanica",
    quality: "Rischio",
    advice:
      "Rischio incatenamento e tenuta scarsa; in molte aree la posidonia è protetta e l'ancoraggio è vietato o regolamentato. Verifica sempre le ordinanze locali.",
  },
  roccia: {
    label: "Roccia",
    quality: "Rischio",
    advice:
      "Rischio incatenamento e tenuta imprevedibile. Preferisci ancore tipo grapnel/artiglio e tieni pronta una boetta di recupero.",
  },
  fango: {
    label: "Fango",
    quality: "Buona",
    advice: "Buona tenuta se l'ancora affonda a sufficienza, ma sporca catena e ancora.",
  },
  misto: {
    label: "Misto sabbia/roccia",
    quality: "Variabile",
    advice: "Tenuta variabile: verifica con ecoscandaglio prima di dare fondo e ricontrolla l'ancora dopo la calata.",
  },
  sconosciuto: {
    label: "Sconosciuto",
    quality: "Da verificare",
    advice: "Nessun dato registrato per questo spot. Verifica sempre con ecoscandaglio/carta nautica prima di ancorare.",
  },
};
