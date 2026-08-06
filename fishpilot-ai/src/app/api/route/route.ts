import { NextRequest, NextResponse } from "next/server";
import { geocodeLocation, reverseGeocode } from "@/lib/geocode";
import { planRoute } from "@/lib/routePlanning";
import { findRefugePorts, attachRouteWarnings } from "@/lib/refugePorts";
import { computePassageCalendar } from "@/lib/passageCalendar";
import { createClient } from "@/lib/supabase/server";
import type { GeocodedPlace, PassageCalendarResult, RoutePlanResult } from "@/types/fishing";

interface WaypointInput {
  location?: string;
  coords?: { lat?: number; lng?: number };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { waypoints, cruiseSpeedKn, fuelLPerHour, date, time } = body as {
      waypoints?: WaypointInput[];
      cruiseSpeedKn?: number;
      fuelLPerHour?: number;
      date?: string;
      time?: string;
    };

    if (!waypoints || waypoints.length < 2) {
      return NextResponse.json(
        { error: "Servono almeno due punti (partenza e arrivo)." },
        { status: 400 }
      );
    }

    if (!cruiseSpeedKn || cruiseSpeedKn <= 0) {
      return NextResponse.json(
        { error: "Indica una velocità di crociera valida (nodi)." },
        { status: 400 }
      );
    }

    if (!date || !time) {
      return NextResponse.json(
        { error: "Indica data e ora di partenza." },
        { status: 400 }
      );
    }

    const [hourStr, minuteStr] = String(time).split(":");
    const hour = Number(hourStr);
    const minute = Number(minuteStr ?? "0");

    if (!Number.isFinite(hour) || hour < 0 || hour > 23) {
      return NextResponse.json({ error: "Orario di partenza non valido." }, { status: 400 });
    }

    let geocoded: GeocodedPlace[];
    try {
      geocoded = await Promise.all(
        waypoints.map((wp, i) => {
          const hasCoords =
            wp.coords && typeof wp.coords.lat === "number" && typeof wp.coords.lng === "number";

          if (hasCoords) {
            const { lat, lng } = wp.coords as { lat: number; lng: number };
            return reverseGeocode(lat, lng);
          }
          if (!wp.location) {
            throw new Error(`Waypoint ${i + 1}: indica un nome o usa il GPS.`);
          }
          return geocodeLocation(wp.location);
        })
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Geocodifica dei waypoint non riuscita.";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const plan = await planRoute({
      waypoints: geocoded,
      cruiseSpeedKn,
      fuelLPerHour,
      departureDateISO: date,
      departureHour: hour,
      departureMinute: minute,
    });

    const refugePortsRaw = await findRefugePorts(plan.waypoints);
    const refugePorts = attachRouteWarnings(refugePortsRaw, plan.legs);

    // Calendario Traversata: mai bloccante, ricade su undefined se la rete
    // o i dati non sono disponibili (RouteResultsView gestisce l'assenza).
    let passageCalendar: PassageCalendarResult | undefined;
    try {
      passageCalendar = await computePassageCalendar(
        plan.waypoints[0].latitude,
        plan.waypoints[0].longitude,
        date
      );
    } catch (err) {
      console.error("Calendario Traversata non disponibile:", err);
    }

    // Il salvataggio su Supabase non deve mai bloccare la visualizzazione
    // della rotta: se fallisce (tabella non ancora creata, rete assente,
    // credenziali mancanti...) si continua con routeId null e il client
    // mostra comunque il risultato tramite il fallback locale.
    let routeId: string | null = null;
    try {
      const supabase = await createClient();
      const { data: routeRow, error } = await supabase
        .from("route_plans")
        .insert({
          cruise_speed_kn: plan.cruiseSpeedKn,
          fuel_l_per_hour: plan.fuelLPerHour ?? null,
          waypoints: plan.waypoints,
          legs: plan.legs,
          refuge_ports: refugePorts,
          total_distance_nm: plan.totalDistanceNm,
          total_duration_hours: plan.totalDurationHours,
          fuel_liters_estimate: plan.fuelLitersEstimate ?? null,
          departure: plan.departureISO,
          utc_offset_seconds: plan.utcOffsetSeconds,
        })
        .select()
        .single();

      if (error || !routeRow) {
        console.error("Salvataggio route_plan non riuscito, proseguo senza persistenza:", error);
      } else {
        routeId = routeRow.id;
      }
    } catch (err) {
      console.error("Supabase non raggiungibile per route_plans, proseguo senza persistenza:", err);
    }

    const result: RoutePlanResult = {
      ...plan,
      refugePorts,
      persisted: routeId !== null,
      passageCalendar,
    };

    return NextResponse.json({ routeId, plan: result });
  } catch (err) {
    console.error("Errore /api/route:", err);
    const message =
      err instanceof Error ? err.message : "Errore imprevisto durante il calcolo della rotta.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
