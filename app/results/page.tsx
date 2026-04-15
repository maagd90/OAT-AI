"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import TripSummaryCard from "@/components/TripSummaryCard";
import HotelsList from "@/components/HotelsList";
import AttractionsList from "@/components/AttractionsList";
import WeatherPanel from "@/components/WeatherPanel";
import ItineraryTimeline from "@/components/ItineraryTimeline";
import CostBreakdownCard from "@/components/CostBreakdownCard";
import LoadingState from "@/components/LoadingState";
import ErrorState from "@/components/ErrorState";
import type {
  ParsedTrip,
  LocationResult,
  HotelResult,
  AttractionResult,
  WeatherDay,
  ItineraryDay,
  CostEstimate,
} from "@/types/trip";
import { saveTrip } from "@/lib/storage";
import dynamic from "next/dynamic";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

interface ResultsState {
  parsed?: ParsedTrip;
  location?: LocationResult;
  hotels?: HotelResult[];
  attractions?: AttractionResult[];
  weather?: WeatherDay[];
  itinerary?: ItineraryDay[];
  estimate?: CostEstimate;
}

interface LoadingFlags {
  parsing: boolean;
  location: boolean;
  hotels: boolean;
  attractions: boolean;
  weather: boolean;
  itinerary: boolean;
  estimate: boolean;
}

interface ErrorsState {
  parse?: string;
  location?: string;
  hotels?: string;
  attractions?: string;
  weather?: string;
  itinerary?: string;
  estimate?: string;
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") || "";

  const [results, setResults] = useState<ResultsState>({});
  const [loading, setLoading] = useState<LoadingFlags>({
    parsing: true,
    location: false,
    hotels: false,
    attractions: false,
    weather: false,
    itinerary: false,
    estimate: false,
  });
  const [errors, setErrors] = useState<ErrorsState>({});
  const [saved, setSaved] = useState(false);
  const [editQuery, setEditQuery] = useState(query);

  const runPlan = useCallback(async (message: string) => {
    if (!message) return;

    setResults({});
    setErrors({});
    setSaved(false);
    setLoading({ parsing: true, location: false, hotels: false, attractions: false, weather: false, itinerary: false, estimate: false });

    // Step 1: Parse
    let parsed: ParsedTrip | null = null;
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      parsed = await res.json();
      setResults((r) => ({ ...r, parsed: parsed! }));
    } catch {
      setErrors((e) => ({ ...e, parse: "Failed to parse your request" }));
    } finally {
      setLoading((l) => ({ ...l, parsing: false }));
    }

    if (!parsed?.destination) return;

    // Step 2: Location
    setLoading((l) => ({ ...l, location: true }));
    let location: LocationResult | null = null;
    try {
      const res = await fetch(`/api/location?city=${encodeURIComponent(parsed.destination)}`);
      if (res.ok) {
        location = await res.json();
        setResults((r) => ({ ...r, location: location! }));
      }
    } catch {
      setErrors((e) => ({ ...e, location: "Could not find location" }));
    } finally {
      setLoading((l) => ({ ...l, location: false }));
    }

    if (!location) return;

    // Step 3: Parallel fetch hotels, attractions, weather
    setLoading((l) => ({ ...l, hotels: true, attractions: true, weather: true }));

    let hotels: HotelResult[] = [];
    let attractions: AttractionResult[] = [];
    let weather: WeatherDay[] = [];

    const [hotelsResult, attractionsResult, weatherResult] = await Promise.allSettled([
      fetch(`/api/hotels?lat=${location.lat}&lon=${location.lon}`).then((r) => r.json()),
      fetch(`/api/attractions?lat=${location.lat}&lon=${location.lon}`).then((r) => r.json()),
      fetch(`/api/weather?lat=${location.lat}&lon=${location.lon}&start=${parsed.startDate || ""}&end=${parsed.endDate || ""}`).then((r) => r.json()),
    ]);

    if (hotelsResult.status === "fulfilled" && Array.isArray(hotelsResult.value)) {
      hotels = hotelsResult.value;
      setResults((r) => ({ ...r, hotels }));
    } else {
      setErrors((e) => ({ ...e, hotels: "Could not load hotels" }));
    }

    if (attractionsResult.status === "fulfilled" && Array.isArray(attractionsResult.value)) {
      attractions = attractionsResult.value;
      setResults((r) => ({ ...r, attractions }));
    } else {
      setErrors((e) => ({ ...e, attractions: "Could not load attractions" }));
    }

    if (weatherResult.status === "fulfilled" && weatherResult.value?.daily) {
      weather = weatherResult.value.daily;
      setResults((r) => ({ ...r, weather }));
    } else {
      setErrors((e) => ({ ...e, weather: "Could not load weather" }));
    }

    setLoading((l) => ({ ...l, hotels: false, attractions: false, weather: false }));

    // Step 4: Itinerary
    setLoading((l) => ({ ...l, itinerary: true }));
    let itinerary: ItineraryDay[] = [];
    try {
      const res = await fetch("/api/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: parsed.destination,
          duration: parsed.duration || 3,
          attractions,
          weather,
          preferences: parsed.preferences,
        }),
      });
      const data = await res.json();
      itinerary = data.days || [];
      setResults((r) => ({ ...r, itinerary }));
    } catch {
      setErrors((e) => ({ ...e, itinerary: "Could not build itinerary" }));
    } finally {
      setLoading((l) => ({ ...l, itinerary: false }));
    }

    // Step 5: Cost estimate
    setLoading((l) => ({ ...l, estimate: true }));
    try {
      const res = await fetch("/api/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: parsed.destination,
          duration: parsed.duration || 3,
          travelers: parsed.travelers,
          budget: parsed.budget,
          preferences: parsed.preferences,
        }),
      });
      const estimate = await res.json();
      setResults((r) => ({ ...r, estimate }));

      // Save trip
      saveTrip(message, parsed, {
        parsedTrip: parsed,
        location: location || undefined,
        hotels,
        attractions,
        weather,
        itinerary,
        estimate,
      });
      setSaved(true);
    } catch {
      setErrors((e) => ({ ...e, estimate: "Could not estimate cost" }));
    } finally {
      setLoading((l) => ({ ...l, estimate: false }));
    }
  }, []);

  useEffect(() => {
    if (query) {
      runPlan(query);
    }
  }, [query, runPlan]);

  const handleRerun = (e: React.FormEvent) => {
    e.preventDefault();
    if (editQuery.trim()) {
      router.push(`/results?q=${encodeURIComponent(editQuery.trim())}`);
    }
  };

  const isAnyLoading = Object.values(loading).some(Boolean);

  if (loading.parsing) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <LoadingState message="Parsing your travel request..." />
        </main>
        <Footer />
      </div>
    );
  }

  if (errors.parse && !results.parsed) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <ErrorState title="Could not parse request" message={errors.parse} onRetry={() => runPlan(query)} />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        {/* Edit Search */}
        <div className="mb-6">
          <form onSubmit={handleRerun} className="flex gap-2">
            <input
              type="text"
              value={editQuery}
              onChange={(e) => setEditQuery(e.target.value)}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="Edit your trip request..."
            />
            <button type="submit" className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
              Re-plan
            </button>
          </form>
          {saved && <p className="text-xs text-green-600 mt-1.5">✓ Trip saved to your recent plans</p>}
        </div>

        {/* Trip Summary */}
        {results.parsed && (
          <div className="mb-6">
            <TripSummaryCard parsedTrip={results.parsed} location={results.location} />
          </div>
        )}

        {/* Missing fields warning */}
        {results.parsed?.missingFields && results.parsed.missingFields.length > 0 && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-800 font-medium">
              ⚠️ Some trip details were not detected: {results.parsed.missingFields.join(", ")}.
              The plan below is based on best estimates.
            </p>
          </div>
        )}

        {/* Disclaimer */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs text-blue-700">
            ℹ️ <strong>Important:</strong> This is an AI-generated travel recommendation plan, not a confirmed booking. All prices are estimates only. Hotels and attractions are suggested based on open data from OpenStreetMap and OpenTripMap.
          </p>
        </div>

        {/* Map */}
        {results.location && (
          <section className="mb-8">
            <h2 className="text-lg font-bold text-gray-800 mb-3">📍 Destination Map</h2>
            {loading.location ? (
              <LoadingState message="Loading map..." />
            ) : (
              <MapView
                location={results.location}
                hotels={results.hotels}
                attractions={results.attractions}
              />
            )}
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Hotels */}
          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">🏨 Recommended Hotels &amp; Areas</h2>
            {loading.hotels ? (
              <LoadingState message="Finding hotels..." />
            ) : errors.hotels ? (
              <ErrorState message={errors.hotels} />
            ) : (
              <HotelsList hotels={results.hotels || []} />
            )}
          </section>

          {/* Attractions */}
          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-3">🗺️ Top Attractions</h2>
            {loading.attractions ? (
              <LoadingState message="Loading attractions..." />
            ) : errors.attractions ? (
              <ErrorState message={errors.attractions} />
            ) : (
              <AttractionsList attractions={results.attractions || []} />
            )}
          </section>
        </div>

        {/* Weather */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-800 mb-3">🌤 Weather Forecast</h2>
          {loading.weather ? (
            <LoadingState message="Fetching weather..." />
          ) : errors.weather ? (
            <ErrorState message={errors.weather} />
          ) : (
            <WeatherPanel weather={results.weather || []} />
          )}
        </section>

        {/* Itinerary */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-800 mb-3">📅 Day-by-Day Itinerary</h2>
          {loading.itinerary ? (
            <LoadingState message="Building itinerary..." />
          ) : errors.itinerary ? (
            <ErrorState message={errors.itinerary} />
          ) : (
            <ItineraryTimeline itinerary={results.itinerary || []} />
          )}
        </section>

        {/* Cost Estimate */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-gray-800 mb-3">💰 Estimated Cost Breakdown</h2>
          {loading.estimate ? (
            <LoadingState message="Calculating costs..." />
          ) : errors.estimate ? (
            <ErrorState message={errors.estimate} />
          ) : results.estimate ? (
            <CostBreakdownCard
              estimate={results.estimate}
              budget={results.parsed?.budget}
              currency={results.parsed?.currency}
            />
          ) : null}
        </section>

        {isAnyLoading && (
          <div className="fixed bottom-4 right-4 bg-blue-700 text-white px-4 py-2 rounded-xl shadow-lg text-sm">
            ⏳ Still loading more data...
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState message="Loading results..." />
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}
