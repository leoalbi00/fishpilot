import { NextRequest, NextResponse } from "next/server";
import { fetchMarineConditions, fetchWeatherConditions } from "@/lib/weather";
import type { LogbookWeatherSnapshot } from "@/types/fishing";

/** Istantanea meteo-mare attuale per il Diario di Bordo:
 * GET /api/weather-snapshot?lat=..&lng=.. */
export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lng = Number(req.nextUrl.searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ snapshot: null });
  }

  const now = new Date();
  const dateISO = now.toISOString().slice(0, 10);
  const hour = now.getUTCHours();

  try {
    const [weather, marine] = await Promise.all([
      fetchWeatherConditions(lat, lng, dateISO, hour),
      fetchMarineConditions(lat, lng, dateISO, hour),
    ]);

    const snapshot: LogbookWeatherSnapshot = {
      windSpeedKmh: weather.windSpeedKmh,
      windDirectionDeg: weather.windDirectionDeg,
      waveHeightM: marine.waveHeightM,
      airTempC: weather.airTempC,
      seaSurfaceTempC: marine.seaSurfaceTempC,
    };

    return NextResponse.json({ snapshot });
  } catch {
    return NextResponse.json({ snapshot: null });
  }
}
