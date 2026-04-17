import type { AttractionResult, ItineraryDay, WeatherDay } from "@/types/trip";
import { getAIService } from "@/lib/ai";

const AI_ITINERARY_TIMEOUT_MS = 45_000;

interface GenerateParams {
  destination: string;
  duration: number;
  startDate?: string;
  endDate?: string;
  preferences: string[];
  attractions: AttractionResult[];
  weather: WeatherDay[];
  model: string;
}

function normalizeDays(days: ItineraryDay[], duration: number): ItineraryDay[] {
  return days
    .map((d, idx) => ({
      day: Number.isFinite(d.day) ? d.day : idx + 1,
      title: d.title || `Day ${idx + 1}`,
      activities: Array.isArray(d.activities)
        ? d.activities.filter((a) => typeof a === "string" && a.trim().length > 0)
        : [],
    }))
    .filter((d) => d.activities.length > 0)
    .slice(0, Math.max(1, duration));
}

export interface AiItineraryResult {
  days: ItineraryDay[] | null;
  failureReason?: string;
}

export async function generateItineraryWithOpenSourceAI(params: GenerateParams): Promise<AiItineraryResult> {
  const ai = getAIService();

  if (!ai) {
    console.warn("[AI-Itinerary] AI service unavailable — no API key configured. Skipping.");
    return { days: null, failureReason: "AI service not configured (missing API key)" };
  }

  const attractionNames = params.attractions.slice(0, 20).map((a) => a.name);
  const weatherLines = params.weather.slice(0, params.duration).map((w) => `${w.date}: ${w.summary || "Mild"}, ${w.tempMin}-${w.tempMax}C`);

  const capDuration = Math.min(params.duration, 7);

  const prompt = [
    "You are a travel planner AI. You output ONLY valid JSON arrays, nothing else — no markdown fences, no explanation.",
    "",
    `Create a ${capDuration}-day itinerary for ${params.destination}.`,
    `Trip dates: ${params.startDate || "N/A"} to ${params.endDate || "N/A"}.`,
    `Preferences: ${params.preferences.join(", ") || "general sightseeing"}.`,
    `Top attractions: ${attractionNames.slice(0, 10).join(", ") || "explore the city"}.`,
    `Weather: ${weatherLines.slice(0, capDuration).join(" | ") || "pleasant"}.`,
    "",
    "Output a JSON array with this EXACT structure:",
    `[{"day":1,"title":"Day 1: Arrival","activities":["Morning: ...","Afternoon: ...","Evening: ..."]}]`,
    `Produce exactly ${capDuration} objects. 3-5 activities each, ordered morning/afternoon/evening.`,
  ].join("\n");

  console.log(`[AI-Itinerary] Calling ${ai.providerName}, destination=${params.destination}, duration=${capDuration}`);

  try {
    const result = await ai.generateStructuredResponse<ItineraryDay[]>(prompt, {
      temperature: 0.3,
      maxTokens: 2048,
      timeout: AI_ITINERARY_TIMEOUT_MS,
    });

    const parsed = result.data;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      console.error(`[AI-Itinerary] Parsed result is not a valid array`);
      return { days: null, failureReason: "AI returned invalid itinerary structure" };
    }

    const normalized = normalizeDays(parsed, capDuration);
    if (normalized.length === 0) {
      console.error(`[AI-Itinerary] Normalization produced 0 valid days from ${parsed.length} parsed entries`);
      return { days: null, failureReason: "AI JSON had no valid day entries" };
    }

    console.log(`[AI-Itinerary] Success: ${normalized.length} days generated in ${result.latencyMs}ms via ${result.provider}`);
    return { days: normalized };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[AI-Itinerary] Error: ${msg}`);
    return { days: null, failureReason: msg };
  }
}
