import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import RouteResultsView from "@/components/RouteResultsView";
import { createClient } from "@/lib/supabase/server";
import type { RefugePort, RouteLeg, RoutePlanResult, RouteWaypoint } from "@/types/fishing";

interface RoutePlanRow {
  id: string;
  cruise_speed_kn: number;
  fuel_l_per_hour: number | null;
  waypoints: RouteWaypoint[];
  legs: RouteLeg[];
  refuge_ports: RefugePort[];
  total_distance_nm: number;
  total_duration_hours: number;
  fuel_liters_estimate: number | null;
  departure: string;
  utc_offset_seconds: number;
}

export default async function TraversataPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase.from("route_plans").select("*").eq("id", id).single();
  const route = data as unknown as RoutePlanRow | null;

  if (!route) {
    notFound();
  }

  const plan: RoutePlanResult = {
    waypoints: route.waypoints,
    legs: route.legs,
    refugePorts: route.refuge_ports,
    totalDistanceNm: route.total_distance_nm,
    totalDurationHours: route.total_duration_hours,
    cruiseSpeedKn: route.cruise_speed_kn,
    fuelLPerHour: route.fuel_l_per_hour ?? undefined,
    fuelLitersEstimate: route.fuel_liters_estimate ?? undefined,
    departureISO: route.departure,
    etaFinalISO: route.legs[route.legs.length - 1]?.etaISO ?? route.departure,
    utcOffsetSeconds: route.utc_offset_seconds ?? 0,
    persisted: true,
  };

  return (
    <div className="chart-texture min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 px-6 py-10 sm:py-14 max-w-4xl mx-auto w-full">
        <RouteResultsView plan={plan} />
      </main>
    </div>
  );
}
