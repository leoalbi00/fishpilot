import { NextRequest, NextResponse } from "next/server";
import { analyzeTrip } from "@/lib/tripAnalysis";
import { createClient } from "@/lib/supabase/server";
import type { FishingTechnique } from "@/types/fishing";

const VALID_TECHNIQUES: FishingTechnique[] = [
  "traina",
  "bolentino",
  "spinning",
  "jigging",
  "drifting",
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { startLocation, destination, technique, date, time } = body as {
      startLocation?: string;
      destination?: string;
      technique?: string;
      date?: string;
      time?: string;
    };

    if (!startLocation || !destination || !technique || !date || !time) {
      return NextResponse.json(
        { error: "Compila tutti i campi del viaggio (partenza, destinazione, tecnica, data, ora)." },
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

    // 1) Geocoding + meteo/mare + algoritmo di scoring
    const analysis = await analyzeTrip({
      startLocationRaw: startLocation,
      destinationRaw: destination,
      technique: technique as FishingTechnique,
      dateISO: date,
      hour,
      minute,
    });

    // 2) Salvataggio su Supabase: trip (viaggio) + fishing_report (risultato)
    const supabase = await createClient();

    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .insert({
        start_location: analysis.start.displayName,
        destination: analysis.destination.displayName,
        technique,
        date: `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`,
        start_lat: analysis.start.latitude,
        start_lng: analysis.start.longitude,
        dest_lat: analysis.destination.latitude,
        dest_lng: analysis.destination.longitude,
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
