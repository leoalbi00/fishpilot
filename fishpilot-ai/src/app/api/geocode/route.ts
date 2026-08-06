import { NextRequest, NextResponse } from "next/server";
import { searchLocations } from "@/lib/geocode";

/** Suggerimenti di autocompletamento per i campi località (GET /api/geocode?q=...). */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const results = await searchLocations(q);
  return NextResponse.json({ results });
}
