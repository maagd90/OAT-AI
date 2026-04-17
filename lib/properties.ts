import fs from "node:fs";
import path from "node:path";

export type DemoDataMode = "live" | "mock" | "fallback";

export interface DemoProperties {
  dataMode: DemoDataMode;
  destination: string;
  country: string;
  lat: number;
  lon: number;
  currency: string;
  hotelsCount: number;
  attractionsCount: number;
  weatherDaysDefault: number;
  itineraryAiMode: "oss-ai" | "rule-based";
  itineraryAiModel: string;
  strictCityValidation: boolean;
  maxDistanceKm: number;
  autoFallbackOnValidation: boolean;
}

const defaultProperties: DemoProperties = {
  dataMode: "fallback",
  destination: "Dubai",
  country: "United Arab Emirates",
  lat: 25.2048,
  lon: 55.2708,
  currency: "USD",
  hotelsCount: 8,
  attractionsCount: 10,
  weatherDaysDefault: 7,
  itineraryAiMode: "oss-ai",
  itineraryAiModel: "gemini-2.0-flash",
  strictCityValidation: true,
  maxDistanceKm: 60,
  autoFallbackOnValidation: true,
};

let cached: DemoProperties | null = null;

function toNumber(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeMode(value: string | undefined): DemoDataMode {
  if (value === "live" || value === "mock" || value === "fallback") {
    return value;
  }
  return defaultProperties.dataMode;
}

function normalizeItineraryMode(value: string | undefined): "oss-ai" | "rule-based" {
  if (value === "oss-ai" || value === "rule-based") {
    return value;
  }
  return defaultProperties.itineraryAiMode;
}

function toBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  const v = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(v)) return true;
  if (["0", "false", "no", "off"].includes(v)) return false;
  return fallback;
}

function parsePropertiesFile(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx <= 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    out[key] = value;
  }
  return out;
}

export function getDemoProperties(): DemoProperties {
  if (cached) return cached;

  const propertiesPath = path.join(process.cwd(), "config", "demo.properties");
  let parsed: Record<string, string> = {};

  try {
    const content = fs.readFileSync(propertiesPath, "utf8");
    parsed = parsePropertiesFile(content);
  } catch {
    // If file is missing/unreadable, keep defaults so app still runs.
  }

  cached = {
    dataMode: normalizeMode(parsed["demo.dataMode"]),
    destination: parsed["demo.mock.destination"] || defaultProperties.destination,
    country: parsed["demo.mock.country"] || defaultProperties.country,
    lat: toNumber(parsed["demo.mock.lat"], defaultProperties.lat),
    lon: toNumber(parsed["demo.mock.lon"], defaultProperties.lon),
    currency: parsed["demo.mock.currency"] || defaultProperties.currency,
    hotelsCount: Math.max(1, Math.floor(toNumber(parsed["demo.mock.hotelsCount"], defaultProperties.hotelsCount))),
    attractionsCount: Math.max(1, Math.floor(toNumber(parsed["demo.mock.attractionsCount"], defaultProperties.attractionsCount))),
    weatherDaysDefault: Math.max(1, Math.floor(toNumber(parsed["demo.mock.weatherDaysDefault"], defaultProperties.weatherDaysDefault))),
    itineraryAiMode: normalizeItineraryMode(parsed["demo.itinerary.mode"]),
    itineraryAiModel: parsed["demo.itinerary.model"] || defaultProperties.itineraryAiModel,
    strictCityValidation: toBool(parsed["demo.strictCityValidation"], defaultProperties.strictCityValidation),
    maxDistanceKm: Math.max(5, toNumber(parsed["demo.maxDistanceKm"], defaultProperties.maxDistanceKm)),
    autoFallbackOnValidation: toBool(parsed["demo.autoFallbackOnValidation"], defaultProperties.autoFallbackOnValidation),
  };

  return cached;
}
