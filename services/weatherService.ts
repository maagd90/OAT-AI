import type { WeatherDay } from "@/types/trip";

const WEATHER_BASE = "https://api.open-meteo.com/v1";

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
  try {
    const url = `${WEATHER_BASE}/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&start_date=${startDate}&end_date=${endDate}&timezone=auto`;
    const res = await fetch(url);

    if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
    const data = await res.json();

    if (!data.daily) return [];

    const { time, temperature_2m_max, temperature_2m_min, weathercode } = data.daily;

    return (time as string[]).map((date: string, i: number) => ({
      date,
      tempMax: Math.round(temperature_2m_max[i]),
      tempMin: Math.round(temperature_2m_min[i]),
      summary: getWeatherSummary(weathercode[i], temperature_2m_max[i]),
    }));
  } catch (err) {
    console.error("Weather fetch failed:", err);
    return [];
  }
}
