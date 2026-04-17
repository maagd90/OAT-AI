import { NextRequest, NextResponse } from "next/server";
import { fetchHotels } from "@/services/overpassService";
import { getDemoProperties } from "@/lib/properties";
import { getMockHotels } from "@/lib/demoData";
import { filterByDistance } from "@/lib/geo";
import type { HotelResult } from "@/types/trip";

// Destination cost tier: 1=budget, 2=mid, 3=expensive
const DEST_TIER: Record<string, number> = {
  dubai: 3, paris: 3, london: 3, "new york": 3, tokyo: 3, singapore: 3,
  zurich: 3, geneva: 3, sydney: 3, melbourne: 3,
  barcelona: 2, rome: 2, amsterdam: 2, istanbul: 2, bangkok: 2,
  baku: 2, tbilisi: 1, prague: 2, vienna: 2, budapest: 1, warsaw: 1,
  bali: 1, phuket: 1, karachi: 1, lahore: 1, delhi: 1, mumbai: 1,
  cairo: 1, nairobi: 1, "cape town": 1, casablanca: 1,
};

function getTier(dest: string): number {
  const key = dest.toLowerCase();
  for (const [city, tier] of Object.entries(DEST_TIER)) {
    if (key.includes(city)) return tier;
  }
  return 2;
}

function estimateHotelPrice(hotel: HotelResult, tier: number, isLuxury: boolean): number {
  const baseRates: Record<number, Record<string, number>> = {
    1: { hotel: 35, hostel: 12, guest_house: 20, apartment: 25, motel: 18 },
    2: { hotel: 80, hostel: 25, guest_house: 45, apartment: 55, motel: 40 },
    3: { hotel: 150, hostel: 40, guest_house: 80, apartment: 100, motel: 70 },
  };
  const rates = baseRates[tier] || baseRates[2];
  let base = rates[hotel.type] || rates.hotel;

  // Adjust for star rating
  if (hotel.stars) {
    if (hotel.stars >= 5) base *= 2.5;
    else if (hotel.stars >= 4) base *= 1.8;
    else if (hotel.stars >= 3) base *= 1.2;
    else if (hotel.stars <= 2) base *= 0.7;
  }

  if (isLuxury) base *= 1.3;

  // Add some variation to make prices look realistic
  const hash = hotel.name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const variation = 0.85 + (hash % 30) / 100; // 0.85 - 1.15 range
  return Math.round(base * variation);
}

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get("lat") || "");
  const lon = parseFloat(req.nextUrl.searchParams.get("lon") || "");
  const destination = req.nextUrl.searchParams.get("destination") || "";
  const duration = parseInt(req.nextUrl.searchParams.get("duration") || "3", 10);
  const preferences = req.nextUrl.searchParams.get("preferences") || "";
  const cfg = getDemoProperties();

  if (isNaN(lat) || isNaN(lon)) {
    return NextResponse.json({ error: "lat and lon params required" }, { status: 400 });
  }

  const tier = getTier(destination);
  const isLuxury = preferences.includes("luxury");
  const nights = Math.max(1, duration - 1) || 1;

  function attachPrices(hotels: HotelResult[]): HotelResult[] {
    return hotels.map((h) => {
      const pricePerNight = estimateHotelPrice(h, tier, isLuxury);
      return { ...h, pricePerNight, totalPrice: pricePerNight * nights };
    });
  }

  if (cfg.dataMode === "mock") {
    const mockHotels = getMockHotels(lat, lon);
    const filtered = cfg.strictCityValidation
      ? filterByDistance(mockHotels, lat, lon, cfg.maxDistanceKm)
      : mockHotels;
    return NextResponse.json(attachPrices(filtered));
  }

  const hotels = await fetchHotels(lat, lon);
  const filteredHotels = cfg.strictCityValidation
    ? filterByDistance(hotels, lat, lon, cfg.maxDistanceKm)
    : hotels;

  if (
    filteredHotels.length === 0 &&
    (cfg.dataMode === "fallback" || cfg.autoFallbackOnValidation)
  ) {
    const mockHotels = getMockHotels(lat, lon);
    const filtered = cfg.strictCityValidation
      ? filterByDistance(mockHotels, lat, lon, cfg.maxDistanceKm)
      : mockHotels;
    return NextResponse.json(attachPrices(filtered));
  }

  return NextResponse.json(attachPrices(filteredHotels));
}
