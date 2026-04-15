import { NextRequest, NextResponse } from "next/server";
import { fetchAttractions } from "@/services/openTripMapService";

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get("lat") || "");
  const lon = parseFloat(req.nextUrl.searchParams.get("lon") || "");

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: "lat and lon params required" }, { status: 400 });
  }

  const attractions = await fetchAttractions(lat, lon);
  return NextResponse.json(attractions);
}
