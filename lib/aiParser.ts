import type { ParsedTrip } from "@/types/trip";
import { format, addDays } from "date-fns";
import { getAIService } from "@/lib/ai";

const AI_PARSE_TIMEOUT_MS = 15_000;

/**
 * Use AI to parse a natural language travel query (provider-agnostic).
 * Handles typos, grammar mistakes, misspellings, wrong date formats, etc.
 * Falls back to null if AI is unavailable — caller should use regex parser.
 */
export async function parseWithAI(message: string): Promise<ParsedTrip | null> {
  const ai = getAIService();
  if (!ai) return null;

  const today = format(new Date(), "yyyy-MM-dd");

  const prompt = [
    `You are a travel query parser. Today's date is ${today}.`,
    `Parse the following user travel request and extract structured data.`,
    `Handle typos, misspellings, and grammar mistakes intelligently.`,
    `For example: "Bakku" means "Baku", "Parris" means "Paris", "Instanbul" means "Istanbul", "loandon" means "London".`,
    `Currency misspellings: "ponds" or "punds" means "pounds" (GBP), "doller" or "dolar" means "dollars" (USD), "eurs" means "euros" (EUR).`,
    ``,
    `Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):`,
    `{`,
    `  "destination": "corrected city name or null",`,
    `  "origin": "origin city if mentioned or null",`,
    `  "startDate": "YYYY-MM-DD or null",`,
    `  "endDate": "YYYY-MM-DD or null",`,
    `  "duration": number_of_days_or_null,`,
    `  "adults": number (default 1),`,
    `  "children": number (default 0),`,
    `  "infants": number (default 0),`,
    `  "budget": number_or_null,`,
    `  "currency": "USD/EUR/GBP/etc or USD as default",`,
    `  "preferences": ["luxury","budget","family-friendly","romantic","beach","adventure","downtown","solo","near airport"] (only matching ones),`,
    `  "hotelStarPreference": number_or_null (e.g. 5 if they say "5 star hotel")`,
    `}`,
    ``,
    `Rules:`,
    `- If user says "for N days" and no specific dates, set startDate to today (${today}) and endDate = startDate + (N-1) days`,
    `- If user says "next week", "next month", "next weekend", calculate the actual dates from today`,
    `- Fix any obviously misspelled city names to the correct spelling`,
    `- "5 star hotel" or "luxury hotel" → preferences should include "luxury", hotelStarPreference: 5`,
    `- Budget amounts like "600$", "$600", "600 dollars", "600 USD", "400ponds" (=400 GBP), "500eurs" (=500 EUR) should all be parsed correctly`,
    `- Handle misspelled currencies: "ponds/punds" = GBP, "doller/dolar/dollr" = USD, "eurs/euroes" = EUR`,
    `- If duration is mentioned but no dates, start from today`,
    `- "budget is 600$" means budget: 600, NOT a "budget" travel style preference`,
    ``,
    `User query: "${message}"`,
  ].join("\n");

  try {
    const response = await ai.generateResponseSafe(prompt, {
      temperature: 0.1,
      maxTokens: 512,
      timeout: AI_PARSE_TIMEOUT_MS,
    });

    if (!response) {
      console.warn("[AI-Parser] No response from AI service");
      return null;
    }

    const text = response.text;

    if (!text) {
      console.warn("[AI-Parser] Empty response");
      return null;
    }

    console.log(`[AI-Parser] Raw: ${text.slice(0, 500)}`);

    // Extract JSON from response
    const parsed = extractJson(text);
    if (!parsed) {
      console.warn("[AI-Parser] Could not extract JSON");
      return null;
    }

    // Build ParsedTrip from AI response
    const destination = parsed.destination || undefined;
    const origin = parsed.origin || undefined;
    let startDate = parsed.startDate || undefined;
    let endDate = parsed.endDate || undefined;
    let duration = parsed.duration ? Number(parsed.duration) : undefined;

    // If duration but no dates, compute from today
    if (duration && !startDate) {
      const start = new Date();
      startDate = format(start, "yyyy-MM-dd");
      endDate = format(addDays(start, duration - 1), "yyyy-MM-dd");
    }

    // If dates but no duration, calculate
    if (startDate && endDate && !duration) {
      const d = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000) + 1;
      if (d > 0) duration = d;
    }

    const budget = parsed.budget ? Number(parsed.budget) : undefined;
    const currency = parsed.currency || "USD";
    const preferences: string[] = Array.isArray(parsed.preferences) ? parsed.preferences : [];
    const hotelStarPreference = parsed.hotelStarPreference ? Number(parsed.hotelStarPreference) : undefined;

    // Store hotel star preference in preferences for downstream use
    if (hotelStarPreference && !preferences.includes("luxury") && hotelStarPreference >= 4) {
      preferences.push("luxury");
    }

    const travelers = {
      adults: Number(parsed.adults) || 1,
      children: Number(parsed.children) || 0,
      infants: Number(parsed.infants) || 0,
    };

    const services = ["hotel", "attractions", "weather"];

    const missingFields: string[] = [];
    if (!destination) missingFields.push("destination");
    if (!startDate) missingFields.push("startDate");
    if (!endDate) missingFields.push("endDate");
    if (!budget) missingFields.push("budget");

    let score = 0;
    if (destination) score += 0.3;
    if (startDate) score += 0.2;
    if (endDate) score += 0.1;
    if (duration) score += 0.1;
    if (budget) score += 0.15;
    if (travelers.adults > 0) score += 0.1;
    if (origin) score += 0.05;

    const result: ParsedTrip & { hotelStarPreference?: number } = {
      intent: "PLAN_TRIP",
      origin,
      destination,
      startDate,
      endDate,
      duration,
      travelers,
      budget,
      currency,
      preferences,
      services,
      missingFields,
      confidence: Math.min(score, 1.0),
    };

    if (hotelStarPreference) {
      (result as Record<string, unknown>).hotelStarPreference = hotelStarPreference;
    }

    console.log(`[AI-Parser] Parsed: dest=${destination}, budget=${budget}, duration=${duration}, prefs=${preferences}`);
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[AI-Parser] Error: ${msg}`);
    return null;
  }
}

function extractJson(text: string): Record<string, unknown> | null {
  // Try direct parse
  try {
    return JSON.parse(text);
  } catch { /* continue */ }

  // Try fenced code block
  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    try { return JSON.parse(fenced[1]); } catch { /* continue */ }
  }

  // Try extracting { ... }
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch { /* continue */ }
  }

  return null;
}
