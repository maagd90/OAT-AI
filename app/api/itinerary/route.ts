import { NextRequest, NextResponse } from "next/server";
import { buildItinerary } from "@/lib/itineraryBuilder";
import { getDemoProperties } from "@/lib/properties";
import { generateItineraryWithOpenSourceAI } from "@/services/openSourceItineraryService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { destination, duration, startDate, endDate, attractions = [], weather = [], preferences = [] } = body;
    const cfg = getDemoProperties();

    if (!destination) {
      return NextResponse.json({ error: "destination required" }, { status: 400 });
    }

    const tripDuration = duration || 3;

    let days = [];
    let provider: "oss-ai" | "rule-based" = "rule-based";
    let aiFailureReason: string | undefined;

    if (cfg.itineraryAiMode === "oss-ai") {
      const result = await generateItineraryWithOpenSourceAI({
        destination,
        duration: tripDuration,
        startDate,
        endDate,
        attractions,
        weather,
        preferences,
        model: cfg.itineraryAiModel,
      });

      if (result.days && result.days.length > 0) {
        days = result.days;
        provider = "oss-ai";
      } else {
        aiFailureReason = result.failureReason;
        console.warn(`[Itinerary Route] AI failed: ${aiFailureReason}. Falling back to rule-based.`);
      }
    }

    if (days.length === 0) {
      days = buildItinerary(destination, tripDuration, attractions, weather, preferences);
      provider = "rule-based";
    }

    return NextResponse.json({ days, provider, ...(aiFailureReason ? { aiFailureReason } : {}) });
  } catch (err) {
    console.error("Itinerary error:", err);
    return NextResponse.json({ error: "Failed to build itinerary" }, { status: 500 });
  }
}
