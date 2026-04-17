import { NextRequest, NextResponse } from "next/server";
import { geocodeCity } from "@/services/nominatimService";
import { getDemoProperties } from "@/lib/properties";
import { getMockLocation } from "@/lib/demoData";

export async function GET(req: NextRequest) {
  const city = req.nextUrl.searchParams.get("city");
  const cfg = getDemoProperties();

  if (!city) {
    return NextResponse.json({ error: "city param required" }, { status: 400 });
  }

  if (cfg.dataMode === "mock") {
    return NextResponse.json(getMockLocation(city));
  }

  const result = await geocodeCity(city);

  if (!result) {
    if (cfg.dataMode === "fallback") {
      return NextResponse.json(getMockLocation(city));
    }
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  return NextResponse.json(result);
}
