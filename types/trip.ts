export interface TripRequest {
  message: string;
}

export interface ParsedTrip {
  intent: "PLAN_TRIP";
  origin?: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  duration?: number;
  travelers: {
    adults: number;
    children: number;
    infants: number;
  };
  budget?: number;
  currency?: string;
  preferences: string[];
  services: string[];
  missingFields: string[];
  confidence: number;
}

export interface LocationResult {
  name: string;
  lat: number;
  lon: number;
  country?: string;
  displayName?: string;
}

export interface HotelResult {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: string;
  stars?: number | null;
  source: string;
  pricePerNight?: number;
  totalPrice?: number;
  area?: string;
}

export interface AttractionResult {
  id: string;
  name: string;
  kind?: string;
  lat: number;
  lon: number;
  rating?: number | null;
  source: string;
}

export interface WeatherDay {
  date: string;
  tempMax: number;
  tempMin: number;
  summary?: string;
}

export interface ItineraryDay {
  day: number;
  title: string;
  activities: string[];
}

export interface CostEstimate {
  hotelEstimate: number;
  foodEstimate: number;
  transportEstimate: number;
  activitiesEstimate: number;
  totalEstimate: number;
  withinBudget: boolean;
  notes: string[];
}

export interface TripPlan {
  parsedTrip: ParsedTrip;
  location?: LocationResult;
  hotels: HotelResult[];
  attractions: AttractionResult[];
  weather: WeatherDay[];
  itinerary: ItineraryDay[];
  estimate: CostEstimate;
}
