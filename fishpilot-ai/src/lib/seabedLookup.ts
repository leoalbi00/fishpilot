// ============================================================
// /lib/seabedLookup.ts — Fondale Automatico (Rada, beta)
//
// Stima il tipo di fondale marino alle coordinate indicate interrogando il
// WMS pubblico "Seabed Substrate" di EMODnet Geology (GetFeatureInfo). È un
// servizio esterno di terzi con copertura/risoluzione variabili (buona nel
// Mediterraneo, ma non garantita ovunque): usato come STIMA di partenza,
// mai come sostituto di ecoscandaglio/carta nautica — l'utente può sempre
// correggerla manualmente (vedi SeabedCard).
//
// Chiamata solo lato server (route handler): i WMS pubblici spesso non
// espongono CORS per l'uso diretto da browser.
// ============================================================

import type { SeabedHoldingType } from "@/types/fishing";

const WMS_URL = "https://drive.emodnet-geology.eu/geoserver/seabed_substrate/wms";
const LAYER = "seabed_substrate:seabed_substrate_250k";

function classifySubstrate(label: string): SeabedHoldingType {
  const l = label.toLowerCase();
  if (l.includes("sand")) return "sabbia";
  if (l.includes("mud") || l.includes("silt") || l.includes("clay")) return "fango";
  if (l.includes("rock") || l.includes("coarse") || l.includes("boulder")) return "roccia";
  if (l.includes("mixed")) return "misto";
  return "sconosciuto";
}

/** Best-effort: qualsiasi errore/timeout/risposta vuota restituisce null,
 * mai un'eccezione (il chiamante ricade sul default "sconosciuto"). */
export async function lookupSeabedType(
  latitude: number,
  longitude: number
): Promise<SeabedHoldingType | null> {
  const delta = 0.002;
  const bbox = `${longitude - delta},${latitude - delta},${longitude + delta},${latitude + delta}`;
  const url =
    `${WMS_URL}?service=WMS&version=1.1.1&request=GetFeatureInfo` +
    `&layers=${LAYER}&query_layers=${LAYER}&bbox=${bbox}&width=5&height=5&x=2&y=2` +
    `&srs=EPSG:4326&info_format=application/json&feature_count=1`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;

    const data = (await res.json()) as {
      features?: { properties?: Record<string, unknown> }[];
    };

    const props = data.features?.[0]?.properties;
    if (!props) return null;

    const label = props.folk_7 ?? props.folk_5 ?? props.substrate ?? props.SEDIMENT ?? props.Name;
    if (typeof label !== "string" || !label) return null;

    return classifySubstrate(label);
  } catch {
    return null;
  }
}
