import { NextRequest, NextResponse } from "next/server";
import { lookupSeabedType } from "@/lib/seabedLookup";

/** Stima automatica (beta) del tipo di fondale: GET /api/seabed?lat=..&lng=.. */
export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lng = Number(req.nextUrl.searchParams.get("lng"));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ seabedType: null });
  }

  const seabedType = await lookupSeabedType(lat, lng);
  return NextResponse.json({ seabedType });
}
