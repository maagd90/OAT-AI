import type { WeatherDay } from "@/types/trip";

interface WeatherPanelProps {
  weather: WeatherDay[];
}

const WEATHER_EMOJI: Record<string, string> = {
  "Very Hot": "🥵",
  "Hot": "☀️",
  "Warm": "🌤",
  "Mild": "⛅",
  "Cloudy": "☁️",
  "Rainy": "🌧",
  "Showers": "🌦",
  "Snowy": "❄️",
  "Clear": "☀️",
};

export default function WeatherPanel({ weather }: WeatherPanelProps) {
  if (!weather || weather.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p className="text-2xl mb-2">🌤</p>
        <p className="text-sm">No weather data available for these dates.</p>
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {weather.map((day) => {
        const dateObj = new Date(day.date + "T00:00:00");
        const dayLabel = dateObj.toLocaleDateString("en-US", { weekday: "short" });
        const dateLabel = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const emoji = day.summary ? WEATHER_EMOJI[day.summary] || "🌤" : "🌤";

        return (
          <div key={day.date} className="flex-shrink-0 bg-blue-50 rounded-xl p-4 text-center min-w-[80px]">
            <p className="text-xs text-gray-500 font-medium">{dayLabel}</p>
            <p className="text-xs text-gray-400">{dateLabel}</p>
            <p className="text-2xl my-2">{emoji}</p>
            <p className="text-sm font-bold text-gray-800">{day.tempMax}°</p>
            <p className="text-xs text-gray-500">{day.tempMin}°</p>
            {day.summary && <p className="text-xs text-blue-600 mt-1">{day.summary}</p>}
          </div>
        );
      })}
    </div>
  );
}
