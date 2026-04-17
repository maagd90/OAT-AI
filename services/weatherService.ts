import type { WeatherDay } from "@/types/trip";
import { differenceInDays, parseISO, subYears, format } from "date-fns";

const WEATHER_BASE = "https://api.open-meteo.com/v1";
const WEATHER_TTL_MS = 10 * 60 * 1000;
const WEATHER_TIMEOUT_MS = 5000;

const weatherCache = new Map<string, { ts: number; value: WeatherDay[] }>();

function getWeatherSummary(code: number, tempMax: number): string {
  if (tempMax > 38) return "Very Hot";
  if (tempMax > 32) return "Hot";
  if (tempMax > 24) return "Warm";
  if (tempMax > 16) return "Mild";
  if (code >= 61 && code <= 67) return "Rainy";
  if (code >= 71 && code <= 77) return "Snowy";
  if (code >= 80 && code <= 82) return "Showers";
  if (code === 0 || code === 1) return "Clear";
  if (code === 2 || code === 3) return "Cloudy";
  return "Mild";
}

export async function fetchWeather(
  lat: number,
  lon: number,
  startDate: string,
  endDate: string
): Promise<WeatherDay[]> {
  const cacheKey = `${lat.toFixed(4)}:${lon.toFixed(4)}:${startDate}:${endDate}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < WEATHER_TTL_MS) {
    return cached.value;
  }

  try {
    // Open-Meteo forecast supports max ~16 days ahead.
    // For trips further in the future, use historical data from the same period last year.
    const daysAhead = differenceInDays(parseISO(startDate), new Date());
    let fetchStart = startDate;
    let fetchEnd = endDate;
    let historical = false;

    if (daysAhead > 15) {
      fetchStart = format(subYears(parseISO(startDate), 1), "yyyy-MM-dd");
      fetchEnd = format(subYears(parseISO(endDate), 1), "yyyy-MM-dd");
      historical = true;
    }

    const endpoint = historical ? "archive" : "forecast";
    const url = `${WEATHER_BASE}/${endpoint}?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weather_code&start_date=${fetchStart}&end_date=${fetchEnd}&timezone=auto`;
    const res = await fetch(url, { signal: AbortSignal.timeout(WEATHER_TIMEOUT_MS) });

    if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
    const data = await res.json();

    if (!data.daily) return [];

    const { time, temperature_2m_max, temperature_2m_min, weather_code } = data.daily;

    // If using historical data, shift dates forward 1 year to align with the actual trip dates
    const weatherDays = (time as string[]).map((date: string, i: number) => ({
      date: historical ? format(subYears(parseISO(date), -1), "yyyy-MM-dd") : date,
      tempMax: Math.round(temperature_2m_max[i]),
      tempMin: Math.round(temperature_2m_min[i]),
      summary: getWeatherSummary(weather_code[i], temperature_2m_max[i]),
    }));
    weatherCache.set(cacheKey, { ts: Date.now(), value: weatherDays });
    return weatherDays;
  } catch (err) {
    console.error("Weather fetch failed:", err);
    return [];
  }
}
