import { parseDateRange } from "./dateParser";
import { parseBudget } from "./budgetParser";
import { parseTravelers } from "./travelerParser";
import type { ParsedTrip } from "@/types/trip";

const KNOWN_CITIES = [
  "Dubai", "Paris", "Istanbul", "London", "New York", "Tokyo", "Bangkok",
  "Singapore", "Barcelona", "Rome", "Amsterdam", "Prague", "Vienna",
  "Bali", "Phuket", "Maldives", "Karachi", "Lahore", "Islamabad",
  "Mumbai", "Delhi", "Colombo", "Kathmandu", "Cairo", "Nairobi",
  "Cape Town", "Johannesburg", "Sydney", "Melbourne", "Toronto",
  "Vancouver", "Los Angeles", "Miami", "Las Vegas", "Chicago",
  "Madrid", "Lisbon", "Athens", "Berlin", "Munich", "Frankfurt",
  "Zurich", "Geneva", "Brussels", "Stockholm", "Copenhagen",
  "Helsinki", "Oslo", "Warsaw", "Budapest", "Bucharest", "Kyiv",
  "Moscow", "Beijing", "Shanghai", "Hong Kong", "Seoul", "Taipei",
  "Kuala Lumpur", "Jakarta", "Manila", "Ho Chi Minh City", "Hanoi",
  "Doha", "Abu Dhabi", "Riyadh", "Muscat", "Kuwait City", "Amman",
  "Beirut", "Tel Aviv", "Casablanca", "Tunis", "Algiers",
  "Accra", "Lagos", "Dar es Salaam", "Addis Ababa",
  "Mexico City", "Cancun", "Buenos Aires", "Bogota", "Lima", "Santiago",
];

function extractDestination(message: string): string | undefined {
  const toPattern = /(?:to|visit(?:ing)?|in|explore?|going\s+to|trip\s+to|travel\s+to|holiday\s+(?:in|to)|vacation\s+(?:in|to))\s+([A-Z][a-zA-Z\s]+?)(?:\s+from|\s+on|\s+for|\s+with|\s+under|\s+between|\s+in|\s+this|\s+next|[,.]|$)/i;
  const toMatch = message.match(toPattern);
  if (toMatch) {
    const candidate = toMatch[1].trim();
    if (candidate.length > 2 && !/^(my|the|a|an|our|this|next|last)$/i.test(candidate)) {
      return candidate;
    }
  }

  for (const city of KNOWN_CITIES) {
    const pattern = new RegExp(`\\b${city}\\b`, "i");
    if (pattern.test(message)) {
      return city;
    }
  }

  return undefined;
}

function extractOrigin(message: string): string | undefined {
  const fromPattern = /\bfrom\s+([A-Z][a-zA-Z\s]+?)(?:\s+to|\s+on|\s+for|\s+with|\s+under|[,.]|$)/i;
  const fromMatch = message.match(fromPattern);
  if (fromMatch) {
    const candidate = fromMatch[1].trim();
    if (candidate.length > 2 && !/^(my|the|a|an|our|this|next|last|\d)/.test(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

function extractPreferences(message: string): string[] {
  const lower = message.toLowerCase();
  const prefs: string[] = [];

  if (/luxury|5[\s-]?star|premium/.test(lower)) prefs.push("luxury");
  if (/budget|cheap|afford|low[\s-]cost/.test(lower)) prefs.push("budget");
  if (/family[\s-]friendly|family/.test(lower)) prefs.push("family-friendly");
  if (/romantic|honeymoon|couple/.test(lower)) prefs.push("romantic");
  if (/beach|seaside|coastal|ocean/.test(lower)) prefs.push("beach");
  if (/downtown|city\s+center|city\s+centre|central/.test(lower)) prefs.push("downtown");
  if (/near\s+airport/.test(lower)) prefs.push("near airport");
  if (/adventure|hiking|trekking/.test(lower)) prefs.push("adventure");
  if (/solo/.test(lower)) prefs.push("solo");

  return prefs;
}

function extractServices(message: string): string[] {
  const lower = message.toLowerCase();
  const services = ["hotel", "attractions", "weather"];

  if (/flight|fly|airline/.test(lower)) services.push("flights");
  if (/car|rental|drive/.test(lower)) services.push("car");
  if (/restaurant|food|eat|dining/.test(lower)) services.push("dining");

  return services;
}

export function parseMessage(message: string): ParsedTrip {
  const destination = extractDestination(message);
  const origin = extractOrigin(message);
  const { startDate, endDate, duration } = parseDateRange(message);
  const { budget, currency = "USD", preferences: budgetPrefs = [] } = parseBudget(message);
  const travelers = parseTravelers(message);
  const preferences = [...new Set([...extractPreferences(message), ...budgetPrefs])];
  const services = extractServices(message);

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
  const confidence = Math.min(score, 1.0);

  return {
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
    confidence,
  };
}
