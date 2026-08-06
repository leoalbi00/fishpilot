import { NextRequest, NextResponse } from "next/server";
import { analyzeTrip } from "@/lib/tripAnalysis";
import { geocodeLocation, reverseGeocode } from "@/lib/geocode";
import { createClient } from "@/lib/supabase/server";
import type { FishingTechnique, GeocodedPlace } from "@/types/fishing";

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

    // 2) Salvataggio su Supabase: trip (spot) + fishing_report (risultato)
    const supabase = await createClient();

    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .insert({
        start_location: analysis.start.displayName,
        destination: null,
        technique,
        date: `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`,
        start_lat: analysis.start.latitude,
        start_lng: analysis.start.longitude,
        dest_lat: null,
        dest_lng: null,
      })
      .select()
      .single();

    if (tripError || !trip) {
      console.error("Errore inserimento trip:", tripError);
      return NextResponse.json(
        { error: "Errore nel salvataggio del viaggio su Supabase. Controlla di aver eseguito supabase/schema.sql e le variabili in .env.local." },
        { status: 500 }
      );
    }

    const { data: report, error: reportError } = await supabase
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

    if (reportError || !report) {
      console.error("Errore inserimento fishing_report:", reportError);
      return NextResponse.json(
        { error: "Errore nel salvataggio del report di pesca." },
        { status: 500 }
      );
    }

    return NextResponse.json({ reportId: report.id, tripId: trip.id });
  } catch (err) {
    console.error("Errore /api/analyze:", err);
    const message =
      err instanceof Error ? err.message : "Errore imprevisto durante l'analisi.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
