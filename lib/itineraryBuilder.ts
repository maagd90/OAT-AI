import type { AttractionResult, ItineraryDay, WeatherDay } from "@/types/trip";

function isHotDay(weather: WeatherDay): boolean {
  return weather.tempMax > 38;
}

export function buildItinerary(
  destination: string,
  duration: number,
  attractions: AttractionResult[],
  weather: WeatherDay[],
  preferences: string[]
): ItineraryDay[] {
  const isFamilyFriendly = preferences.includes("family-friendly");
  const isBudget = preferences.includes("budget");
  const days: ItineraryDay[] = [];

  const remaining = [...attractions];

  for (let i = 1; i <= duration; i++) {
    const dayWeather = weather[i - 1];
    const hot = dayWeather ? isHotDay(dayWeather) : false;

    if (i === 1) {
      days.push({
        day: i,
        title: `Arrival in ${destination}`,
        activities: [
          "Arrive and check in to your accommodation",
          "Freshen up and get settled",
          hot ? "Visit a nearby air-conditioned mall or café" : `Take a short walk around the ${destination} neighborhood`,
          "Dinner at a local restaurant",
        ],
      });
    } else if (i === duration) {
      const lastActivity = remaining.shift();
      days.push({
        day: i,
        title: `Departure Day`,
        activities: [
          "Enjoy a relaxed breakfast",
          lastActivity ? `Quick visit to ${lastActivity.name}` : "Last-minute souvenir shopping",
          "Hotel checkout",
          "Head to the airport/station for departure",
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

      if (hot) {
        activities.push("Morning: Visit indoor attractions (museums, malls, aquariums)");
      } else {
        activities.push(`Morning: Explore ${destination} city center`);
      }

      dayAttractions.forEach((attr) => {
        activities.push(`Visit ${attr.name}${attr.kind ? ` (${attr.kind})` : ""}`);
      });

      if (isBudget) {
        activities.push("Enjoy a budget-friendly local meal");
        activities.push("Explore free public spaces or markets");
      } else {
        activities.push("Lunch at a recommended local restaurant");
        if (i % 2 === 0) activities.push("Evening: Sunset viewpoint or rooftop bar");
      }

      if (dayAttractions.length === 0) {
        activities.push(`Explore the streets and local markets of ${destination}`);
      }

      days.push({
        day: i,
        title: `Day ${i}: Exploring ${destination}`,
        activities,
      });
    }
  }

  return days;
}
