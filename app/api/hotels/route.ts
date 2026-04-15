import { NextRequest, NextResponse } from "next/server";
import { fetchHotels } from "@/services/overpassService";

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get("lat") || "");
  const lon = parseFloat(req.nextUrl.searchParams.get("lon") || "");

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: "lat and lon params required" }, { status: 400 });
  }

  const hotels = await fetchHotels(lat, lon);
  return NextResponse.json(hotels);
}
