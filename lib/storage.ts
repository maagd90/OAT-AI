import type { TripPlan, ParsedTrip } from "@/types/trip";

export interface SavedTrip {
  id: string;
  message: string;
  parsedTrip: ParsedTrip;
  timestamp: string;
  plan?: TripPlan;
}

const STORAGE_KEY = "ai_travel_planner_trips";
const MAX_TRIPS = 10;

export function saveTrip(message: string, parsedTrip: ParsedTrip, plan?: TripPlan): SavedTrip {
  const newTrip: SavedTrip = {
    id: Date.now().toString(),
    message,
    parsedTrip,
    timestamp: new Date().toISOString(),
    plan,
  };

  const existing = getTrips();
  const updated = [newTrip, ...existing].slice(0, MAX_TRIPS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage not available (SSR)
  }
  return newTrip;
}

export function getTrips(): SavedTrip[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data) as SavedTrip[];
  } catch {
    return [];
  }
}

export function deleteTrip(id: string): void {
  const existing = getTrips();
  const updated = existing.filter((t) => t.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage not available
  }
}

export function clearTrips(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage not available
  }
}
