import { NextRequest, NextResponse } from "next/server";
import { fetchAttractions } from "@/services/openTripMapService";
import { fetchAttractionsFromOSM } from "@/services/overpassService";
import { getDemoProperties } from "@/lib/properties";
import { getMockAttractions } from "@/lib/demoData";
import { filterByDistance } from "@/lib/geo";

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get("lat") || "");
  const lon = parseFloat(req.nextUrl.searchParams.get("lon") || "");
  const cfg = getDemoProperties();

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: "lat and lon params required" }, { status: 400 });
  }

  if (cfg.dataMode === "mock") {
    const mockAttractions = getMockAttractions(lat, lon);
    return NextResponse.json(
      cfg.strictCityValidation
        ? filterByDistance(mockAttractions, lat, lon, cfg.maxDistanceKm)
        : mockAttractions
    );
  }

  // Use OpenTripMap if API key is available, otherwise fall back to Overpass/OSM
  const hasOtmKey = !!process.env.OPENTRIPMAP_API_KEY;
  const attractions = hasOtmKey
    ? await fetchAttractions(lat, lon)
    : await fetchAttractionsFromOSM(lat, lon);

  const filteredAttractions = cfg.strictCityValidation
    ? filterByDistance(attractions, lat, lon, cfg.maxDistanceKm)
    : attractions;

  if (
    filteredAttractions.length === 0 &&
    (cfg.dataMode === "fallback" || cfg.autoFallbackOnValidation)
  ) {
    const mockAttractions = getMockAttractions(lat, lon);
    return NextResponse.json(
      cfg.strictCityValidation
        ? filterByDistance(mockAttractions, lat, lon, cfg.maxDistanceKm)
        : mockAttractions
    );
  }

  return NextResponse.json(filteredAttractions);
}
