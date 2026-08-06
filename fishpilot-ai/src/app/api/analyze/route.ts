import { NextRequest, NextResponse } from "next/server";
import { analyzeTrip } from "@/lib/tripAnalysis";
import { geocodeLocation, reverseGeocode } from "@/lib/geocode";
import { createClient } from "@/lib/supabase/server";
import { computeSolunar } from "@/lib/solunar";
import { computeTide } from "@/lib/tides";
import { computeNightForecast } from "@/lib/nightForecast";
import type {
  FishingTechnique,
  GeocodedPlace,
  NightForecastResult,
  SpotReportResult,
} from "@/types/fishing";

const VALID_TECHNIQUES: FishingTechnique[] = [
  "traina",
  "bolentino",
  "spinning",
  "jigging",
  "drifting",
];

/** Analizza uno spot singolo (⚓ Rada / 🎣 Pesca): meteo-mare, Fishing
 * Score, specie e consigli. Le rotte multi-waypoint (⛵ Traversata) passano
 * invece da /api/route. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { location, coords, technique, date, time } = body as {
      location?: string;
      coords?: { lat?: number; lng?: number };
      technique?: string;
      date?: string;
      time?: string;
    };

    if (!technique || !date || !time) {
      return NextResponse.json(
        { error: "Compila tutti i campi richiesti (tecnica, data, ora)." },
        { status: 400 }
      );
    }

    if (!VALID_TECHNIQUES.includes(technique as FishingTechnique)) {
      return NextResponse.json(
        { error: "Tecnica di pesca non valida." },
        { status: 400 }
      );
    }

    const [hourStr, minuteStr] = String(time).split(":");
    const hour = Number(hourStr);
    const minute = Number(minuteStr ?? "0");

    if (!Number.isFinite(hour) || hour < 0 || hour > 23) {
      return NextResponse.json({ error: "Orario non valido." }, { status: 400 });
    }

    const hasCoords =
      coords && typeof coords.lat === "number" && typeof coords.lng === "number";

    if (!hasCoords && !location) {
      return NextResponse.json(
        { error: "Indica uno spot (testo) oppure usa la geolocalizzazione GPS." },
        { status: 400 }
      );
    }

    let start: GeocodedPlace;
    if (hasCoords) {
      const { lat, lng } = coords as { lat: number; lng: number };
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return NextResponse.json({ error: "Coordinate GPS non valide." }, { status: 400 });
      }
      start = await reverseGeocode(lat, lng);
    } else {
      start = await geocodeLocation(location as string);
    }

    // 1) Meteo/mare + algoritmo di scoring per lo spot
    const analysis = await analyzeTrip({
      start,
      technique: technique as FishingTechnique,
      dateISO: date,
      hour,
      minute,
    });

    const tripDateISO = `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;

    // 2) Salvataggio su Supabase: non deve mai bloccare la visualizzazione
    // del rapporto (stesso pattern non bloccante di /api/route). Se fallisce
    // (tabella non ancora creata, rete assente, credenziali mancanti...) si
    // prosegue con reportId null e si calcola qui tutto ciò che la
    // dashboard persistita calcolerebbe al render, restituendolo inline.
    let reportId: string | null = null;
    try {
      const supabase = await createClient();

      const { data: trip, error: tripError } = await supabase
        .from("trips")
        .insert({
          start_location: analysis.start.displayName,
          destination: null,
          technique,
          date: tripDateISO,
          start_lat: analysis.start.latitude,
          start_lng: analysis.start.longitude,
          dest_lat: null,
          dest_lng: null,
        })
        .select()
        .single();

      if (tripError || !trip) {
        console.error("Salvataggio trip non riuscito, proseguo senza persistenza:", tripError);
      } else {
        const { data: reportRow, error: reportError } = await supabase
          .from("fishing_reports")
          .insert({
            trip_id: trip.id,
            score: analysis.primary.score,
            species: analysis.primary.species,
            recommendations: analysis.primary.recommendations,
            conditions: analysis.primary.conditions,
            zones: analysis.zones,
          })
          .select()
          .single();

        if (reportError || !reportRow) {
          console.error(
            "Salvataggio fishing_report non riuscito, proseguo senza persistenza:",
            reportError
          );
        } else {
          reportId = reportRow.id;
        }
      }
    } catch (err) {
      console.error("Supabase non raggiungibile per l'analisi, proseguo senza persistenza:", err);
    }

    if (reportId) {
      return NextResponse.json({ reportId });
    }

    const referenceDate = new Date(`${tripDateISO}Z`);
    const solunar = computeSolunar(referenceDate, analysis.start.latitude, analysis.start.longitude);
    const tide = computeTide(referenceDate, analysis.start.longitude);

    let nightForecast: NightForecastResult;
    try {
      nightForecast = await computeNightForecast(date, analysis.start.latitude, analysis.start.longitude);
    } catch {
      nightForecast = { points: [], trend: "stabile", maxWindSpeedKmh: 0, maxWaveHeightM: 0 };
    }

    const report: SpotReportResult = {
      persisted: false,
      score: analysis.primary.score,
      species: analysis.primary.species,
      recommendations: analysis.primary.recommendations,
      conditions: analysis.primary.conditions,
      primaryZone: analysis.zones[Math.floor(analysis.zones.length / 2)],
      trip: {
        startLocation: analysis.start.displayName,
        technique: technique as FishingTechnique,
        date: referenceDate.toISOString(),
        latitude: analysis.start.latitude,
        longitude: analysis.start.longitude,
      },
      solunar,
      tide,
      nightForecast,
      utcOffsetSeconds: analysis.primary.conditions.utcOffsetSeconds ?? 0,
    };

    return NextResponse.json({ reportId: null, report });
  } catch (err) {
    console.error("Errore /api/analyze:", err);
    const message =
      err instanceof Error ? err.message : "Errore imprevisto durante l'analisi.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
