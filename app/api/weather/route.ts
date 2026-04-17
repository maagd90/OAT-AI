import { NextRequest, NextResponse } from "next/server";
import { fetchWeather } from "@/services/weatherService";
import { format, addDays } from "date-fns";
import { getDemoProperties } from "@/lib/properties";
import { getMockWeather } from "@/lib/demoData";

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get("lat") || "");
  const lon = parseFloat(req.nextUrl.searchParams.get("lon") || "");
  const start = req.nextUrl.searchParams.get("start");
  const end = req.nextUrl.searchParams.get("end");
  const cfg = getDemoProperties();

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: "lat and lon params required" }, { status: 400 });
  }

  const startDate = start || format(addDays(new Date(), 7), "yyyy-MM-dd");
  const endDate = end || format(addDays(new Date(), 14), "yyyy-MM-dd");

  if (cfg.dataMode === "mock") {
    return NextResponse.json({ daily: getMockWeather(startDate, endDate) });
  }

  const weather = await fetchWeather(lat, lon, startDate, endDate);
  if (cfg.dataMode === "fallback" && weather.length === 0) {
    return NextResponse.json({ daily: getMockWeather(startDate, endDate) });
  }

  return NextResponse.json({ daily: weather });
}
