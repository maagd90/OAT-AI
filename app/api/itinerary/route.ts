import { NextRequest, NextResponse } from "next/server";
import { buildItinerary } from "@/lib/itineraryBuilder";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { destination, duration, attractions = [], weather = [], preferences = [] } = body;

    if (!destination) {
      return NextResponse.json({ error: "destination required" }, { status: 400 });
    }

    const days = buildItinerary(
      destination,
      duration || 3,
      attractions,
      weather,
      preferences
    );

    return NextResponse.json({ days });
  } catch (err) {
    console.error("Itinerary error:", err);
    return NextResponse.json({ error: "Failed to build itinerary" }, { status: 500 });
  }
}
