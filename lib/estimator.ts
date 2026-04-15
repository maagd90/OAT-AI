import type { CostEstimate } from "@/types/trip";

const DESTINATION_TIER: Record<string, number> = {
  dubai: 3, paris: 3, london: 3, "new york": 3, tokyo: 3, singapore: 3,
  zurich: 3, geneva: 3, sydney: 3, melbourne: 3,
  barcelona: 2, rome: 2, amsterdam: 2, istanbul: 2, bangkok: 2,
  bali: 1, phuket: 1, karachi: 1, lahore: 1, delhi: 1, mumbai: 1,
  cairo: 1, nairobi: 1, "cape town": 1, casablanca: 1,
};

function getTier(destination: string): number {
  const key = destination.toLowerCase();
  for (const [city, tier] of Object.entries(DESTINATION_TIER)) {
    if (key.includes(city)) return tier;
  }
  return 2;
}

export function estimateCost(
  destination: string,
  duration: number,
  travelers: { adults: number; children: number; infants: number },
  budget: number | undefined,
  preferences: string[]
): CostEstimate {
  const tier = getTier(destination);
  const isLuxury = preferences.includes("luxury");
  const isBudget = preferences.includes("budget");
  const totalPeople = travelers.adults + travelers.children * 0.7;

  const rooms = Math.ceil(travelers.adults / 2) + (travelers.children > 0 ? 1 : 0);
  const hotelNightlyRates = { 1: 40, 2: 90, 3: 160 };
  const baseRate = hotelNightlyRates[tier as keyof typeof hotelNightlyRates] || 90;
  const rateMultiplier = isLuxury ? 2.5 : isBudget ? 0.6 : 1;
  const hotelEstimate = Math.round(baseRate * rateMultiplier * rooms * duration);

  const foodPerPersonPerDay = { 1: 15, 2: 35, 3: 55 };
  const foodBase = foodPerPersonPerDay[tier as keyof typeof foodPerPersonPerDay] || 35;
  const foodEstimate = Math.round(foodBase * (isLuxury ? 1.8 : isBudget ? 0.6 : 1) * totalPeople * duration);

  const transportPerDay = { 1: 10, 2: 20, 3: 30 };
  const transportBase = transportPerDay[tier as keyof typeof transportPerDay] || 20;
  const transportEstimate = Math.round(transportBase * (isLuxury ? 2 : isBudget ? 0.7 : 1) * duration);

  const activitiesPerDay = { 1: 10, 2: 25, 3: 40 };
  const actBase = activitiesPerDay[tier as keyof typeof activitiesPerDay] || 25;
  const activitiesEstimate = Math.round(actBase * (isLuxury ? 2 : isBudget ? 0.5 : 1) * duration);

  const totalEstimate = hotelEstimate + foodEstimate + transportEstimate + activitiesEstimate;
  const withinBudget = budget ? totalEstimate <= budget : true;

  const notes: string[] = [
    "Estimated planning cost only — not live supplier pricing",
    "Hotel costs based on destination tier and duration",
    "Flights not included in this estimate",
    "Actual prices may vary based on season and availability",
  ];

  if (!withinBudget && budget) {
    notes.push(`Estimated total ($${totalEstimate}) exceeds your budget ($${budget}). Consider reducing trip duration or choosing budget-friendly options.`);
  }

  return {
    hotelEstimate,
    foodEstimate,
    transportEstimate,
    activitiesEstimate,
    totalEstimate,
    withinBudget,
    notes,
  };
}
