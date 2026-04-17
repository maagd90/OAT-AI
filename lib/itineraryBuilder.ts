import type { AttractionResult, ItineraryDay, WeatherDay } from "@/types/trip";

function isHotDay(weather: WeatherDay): boolean {
  return weather.tempMax > 38;
}

function isRainyDay(weather: WeatherDay): boolean {
  const s = (weather.summary || "").toLowerCase();
  return s.includes("rain") || s.includes("storm") || s.includes("shower");
}

function weatherNote(w: WeatherDay | undefined): string {
  if (!w) return "";
  if (isHotDay(w)) return ` (${w.tempMax}°C — stay hydrated, prefer indoor activities)`;
  if (isRainyDay(w)) return ` (rain expected — carry an umbrella)`;
  return "";
}

const EVENING_ACTIVITIES = [
  "Evening: Enjoy dinner at a popular local restaurant",
  "Evening: Take a sunset stroll through the old quarter",
  "Evening: Visit a rooftop café and enjoy the city lights",
  "Evening: Explore the night market for street food and crafts",
  "Evening: Attend a cultural show or live music performance",
  "Evening: Relax at a riverside or waterfront promenade",
  "Evening: Try the local dessert specialties at a sweet shop",
];

const BUDGET_EVENING = [
  "Evening: Explore free public parks or waterfront areas",
  "Evening: Street food tour — sample local favorites",
  "Evening: Walk through the historic district after dark",
  "Evening: Relax at a budget-friendly local café",
];

export function buildItinerary(
  destination: string,
  duration: number,
  attractions: AttractionResult[],
  weather: WeatherDay[],
  preferences: string[]
): ItineraryDay[] {
  const isFamilyFriendly = preferences.includes("family-friendly");
  const isBudget = preferences.includes("budget");
  const isRomantic = preferences.some((p) => p.includes("romantic") || p.includes("couple"));
  const days: ItineraryDay[] = [];

  const remaining = [...attractions];
  let eveningIdx = 0;

  for (let i = 1; i <= duration; i++) {
    const dayWeather = weather[i - 1];
    const hot = dayWeather ? isHotDay(dayWeather) : false;
    const rainy = dayWeather ? isRainyDay(dayWeather) : false;
    const indoorDay = hot || rainy;
    const wNote = weatherNote(dayWeather);

    if (i === 1) {
      const firstAttr = remaining.shift();
      days.push({
        day: i,
        title: `Day 1: Arrival in ${destination}`,
        activities: [
          `Morning: Arrive in ${destination} and check in to your accommodation`,
          "Afternoon: Freshen up, get settled, and exchange currency if needed",
          indoorDay
            ? `Afternoon: Visit a nearby air-conditioned mall or café${wNote}`
            : `Afternoon: Take a leisurely walk around the ${destination} neighborhood to get oriented${wNote}`,
          firstAttr
            ? `Evening: Light visit to ${firstAttr.name} if time permits, then dinner at a local restaurant`
            : `Evening: Dinner at a highly-rated local restaurant — ask the hotel for recommendations`,
        ],
      });
    } else if (i === duration) {
      const lastAttr = remaining.shift();
      days.push({
        day: i,
        title: `Day ${i}: Departure from ${destination}`,
        activities: [
          "Morning: Enjoy a relaxed breakfast at the hotel",
          lastAttr
            ? `Morning: Quick visit to ${lastAttr.name} nearby${wNote}`
            : `Morning: Last-minute souvenir shopping at a local market${wNote}`,
          "Afternoon: Pack up and complete hotel checkout",
          `Afternoon: Head to the airport/station for departure — safe travels from ${destination}!`,
        ],
      });
    } else {
      const maxAttractions = isFamilyFriendly ? 2 : 3;
      const dayAttractions: AttractionResult[] = [];

      for (let j = 0; j < maxAttractions && remaining.length > 0; j++) {
        const attr = remaining.shift();
        if (attr) dayAttractions.push(attr);
      }

      const activities: string[] = [];

      // Morning
      if (dayAttractions.length > 0) {
        const morningAttr = dayAttractions[0];
        activities.push(
          indoorDay
            ? `Morning: Visit ${morningAttr.name}${morningAttr.kind ? ` (${morningAttr.kind})` : ""} — great indoor activity${wNote}`
            : `Morning: Visit ${morningAttr.name}${morningAttr.kind ? ` (${morningAttr.kind})` : ""}${wNote}`
        );
      } else {
        activities.push(
          indoorDay
            ? `Morning: Explore indoor attractions like museums or galleries in ${destination}${wNote}`
            : `Morning: Explore ${destination}'s city center and historic streets${wNote}`
        );
      }

      // Late Morning / Afternoon attractions
      for (let j = 1; j < dayAttractions.length; j++) {
        const attr = dayAttractions[j];
        const timeLabel = j === 1 ? "Afternoon" : "Late afternoon";
        activities.push(`${timeLabel}: Visit ${attr.name}${attr.kind ? ` (${attr.kind})` : ""}`);
      }

      // Lunch
      if (isBudget) {
        activities.push("Lunch: Enjoy budget-friendly local street food");
      } else if (isRomantic) {
        activities.push(`Lunch: Dine at a charming local restaurant in ${destination}`);
      } else {
        activities.push("Lunch: Try a recommended local restaurant for authentic cuisine");
      }

      // Extra afternoon if no attractions
      if (dayAttractions.length === 0) {
        activities.push(`Afternoon: Explore the streets and local markets of ${destination}`);
      }

      // Evening
      const pool = isBudget ? BUDGET_EVENING : EVENING_ACTIVITIES;
      activities.push(pool[eveningIdx % pool.length]);
      eveningIdx++;

      const titleTheme = dayAttractions.length > 0
        ? dayAttractions.map((a) => a.name).join(" & ")
        : `Exploring ${destination}`;

      days.push({
        day: i,
        title: `Day ${i}: ${titleTheme}`,
        activities,
      });
    }
  }

  return days;
}
