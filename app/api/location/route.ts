import { NextRequest, NextResponse } from "next/server";
import { geocodeCity } from "@/services/nominatimService";

export async function GET(req: NextRequest) {
  const city = req.nextUrl.searchParams.get("city");

  if (!city) {
    return NextResponse.json({ error: "city param required" }, { status: 400 });
  }

  const result = await geocodeCity(city);

  if (!result) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  return NextResponse.json(result);
}
