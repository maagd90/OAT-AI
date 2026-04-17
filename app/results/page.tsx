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
  itineraryProvider?: "oss-ai" | "rule-based";
  aiFailureReason?: string;
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
      fetch(`/api/hotels?lat=${location.lat}&lon=${location.lon}&destination=${encodeURIComponent(parsed.destination || "")}&duration=${parsed.duration || 3}&preferences=${encodeURIComponent((parsed.preferences || []).join(","))}`).then((r) => r.json()),
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

    // Step 4 + 5: Build itinerary and estimate in parallel
    setLoading((l) => ({ ...l, itinerary: true, estimate: true }));
    let itinerary: ItineraryDay[] = [];
    let estimate: CostEstimate | undefined;

    const [itineraryResult, estimateResult] = await Promise.allSettled([
      fetch("/api/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: parsed.destination,
          duration: parsed.duration || 3,
          startDate: parsed.startDate,
          endDate: parsed.endDate,
          attractions,
          weather,
          preferences: parsed.preferences,
        }),
      }).then((r) => r.json()),
      fetch("/api/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: parsed.destination,
          duration: parsed.duration || 3,
          travelers: parsed.travelers,
          budget: parsed.budget,
          preferences: parsed.preferences,
        }),
      }).then((r) => r.json()),
    ]);

    if (itineraryResult.status === "fulfilled" && Array.isArray(itineraryResult.value?.days)) {
      itinerary = itineraryResult.value.days;
      setResults((r) => ({ ...r, itinerary, itineraryProvider: itineraryResult.value.provider || "rule-based", aiFailureReason: itineraryResult.value.aiFailureReason }));
    } else {
      setErrors((e) => ({ ...e, itinerary: "Could not build itinerary" }));
    }

    if (estimateResult.status === "fulfilled" && typeof estimateResult.value?.totalEstimate === "number") {
      estimate = estimateResult.value as CostEstimate;
      setResults((r) => ({ ...r, estimate }));
    } else {
      setErrors((e) => ({ ...e, estimate: "Could not estimate cost" }));
    }

    setLoading((l) => ({ ...l, itinerary: false, estimate: false }));

    if (estimate) {
      // Save trip when estimate is available
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
    }
  }, []);

  useEffect(() => {
    if (query) {
      runPlan(query);
    }
  }, [query, runPlan]);

  const refreshEstimate = useCallback(async (nextParsed: ParsedTrip) => {
    if (!nextParsed.destination) return;

    setSaved(false);
    setErrors((e) => ({ ...e, estimate: undefined }));
    setLoading((l) => ({ ...l, estimate: true }));

    try {
      const res = await fetch("/api/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: nextParsed.destination,
          duration: nextParsed.duration || 3,
          travelers: nextParsed.travelers,
          budget: nextParsed.budget,
          preferences: nextParsed.preferences,
        }),
      });

      const estimateData = await res.json();
      if (res.ok) {
        setResults((r) => ({ ...r, estimate: estimateData }));
      } else {
        setErrors((e) => ({ ...e, estimate: "Could not refresh cost estimate" }));
      }
    } catch {
      setErrors((e) => ({ ...e, estimate: "Could not refresh cost estimate" }));
    } finally {
      setLoading((l) => ({ ...l, estimate: false }));
    }
  }, []);

  const refreshWeather = useCallback(async () => {
    if (!results.location || !results.parsed) return;

    setErrors((e) => ({ ...e, weather: undefined }));
    setLoading((l) => ({ ...l, weather: true }));

    try {
      const weatherRes = await fetch(
        `/api/weather?lat=${results.location.lat}&lon=${results.location.lon}&start=${results.parsed.startDate || ""}&end=${results.parsed.endDate || ""}`
      );
      const weatherData = await weatherRes.json();
      if (weatherRes.ok && Array.isArray(weatherData.daily)) {
        setResults((r) => ({ ...r, weather: weatherData.daily }));
      } else {
        setErrors((e) => ({ ...e, weather: "Unable to fetch weather data. This may be a temporary service issue. Please try again." }));
      }
    } catch {
      setErrors((e) => ({ ...e, weather: "Unable to fetch weather data. This may be a temporary service issue. Please try again." }));
    } finally {
      setLoading((l) => ({ ...l, weather: false }));
    }
  }, [results.location, results.parsed]);

  const refreshAfterDateChange = useCallback(async (nextParsed: ParsedTrip) => {
    if (!results.location || !nextParsed.destination) return;

    setErrors((e) => ({ ...e, weather: undefined, itinerary: undefined }));
    setLoading((l) => ({ ...l, weather: true, itinerary: true }));

    let nextWeather: WeatherDay[] = results.weather || [];

    try {
      const weatherRes = await fetch(
        `/api/weather?lat=${results.location.lat}&lon=${results.location.lon}&start=${nextParsed.startDate || ""}&end=${nextParsed.endDate || ""}`
      );
      const weatherData = await weatherRes.json();
      if (weatherRes.ok && Array.isArray(weatherData.daily)) {
        nextWeather = weatherData.daily;
        setResults((r) => ({ ...r, weather: nextWeather }));
      } else {
        setErrors((e) => ({ ...e, weather: "Unable to fetch weather for selected dates. Please try adjusting your dates." }));
      }
    } catch {
      setErrors((e) => ({ ...e, weather: "Unable to fetch weather for selected dates. Please try adjusting your dates." }));
    } finally {
      setLoading((l) => ({ ...l, weather: false }));
    }

    try {
      const itineraryRes = await fetch("/api/itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: nextParsed.destination,
          duration: nextParsed.duration || 3,
          startDate: nextParsed.startDate,
          endDate: nextParsed.endDate,
          attractions: results.attractions || [],
          weather: nextWeather,
          preferences: nextParsed.preferences,
        }),
      });

      const itineraryData = await itineraryRes.json();
      if (itineraryRes.ok && Array.isArray(itineraryData.days)) {
        setResults((r) => ({ ...r, itinerary: itineraryData.days, itineraryProvider: itineraryData.provider || "rule-based", aiFailureReason: itineraryData.aiFailureReason }));
      } else {
        setErrors((e) => ({ ...e, itinerary: "Could not refresh itinerary for selected dates" }));
      }
    } catch {
      setErrors((e) => ({ ...e, itinerary: "Could not refresh itinerary for selected dates" }));
    } finally {
      setLoading((l) => ({ ...l, itinerary: false }));
    }

    await refreshEstimate(nextParsed);
  }, [results.location, results.weather, results.attractions, refreshEstimate]);

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
            <TripSummaryCard
              parsedTrip={results.parsed}
              location={results.location}
              onDatesChange={(startDate, endDate, duration) => {
                if (!results.parsed) return;
                const nextParsed: ParsedTrip = { ...results.parsed, startDate, endDate, duration };
                setResults((r) => ({ ...r, parsed: nextParsed }));
                void refreshAfterDateChange(nextParsed);
              }}
              onTravelersChange={(travelers) => {
                if (!results.parsed) return;
                const nextParsed: ParsedTrip = { ...results.parsed, travelers };
                setResults((r) => ({ ...r, parsed: nextParsed }));
                void refreshEstimate(nextParsed);
              }}
              onBudgetChange={(budget, currency) => {
                if (!results.parsed) return;
                const nextParsed: ParsedTrip = { ...results.parsed, budget, currency };
                setResults((r) => ({ ...r, parsed: nextParsed }));
                void refreshEstimate(nextParsed);
              }}
            />
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

        {/* Budget Warning Banner */}
        {results.estimate && results.parsed?.budget && !results.estimate.withinBudget && (
          <div className="mb-6 bg-red-50 border border-red-300 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h3 className="text-sm font-bold text-red-800 mb-1">Budget Exceeded</h3>
                <p className="text-sm text-red-700">
                  Sorry, your budget of <strong>${results.parsed.budget.toLocaleString()} {results.parsed.currency || "USD"}</strong> is
                  not sufficient for this trip (estimated cost: <strong>${results.estimate.totalEstimate.toLocaleString()} {results.parsed.currency || "USD"}</strong>).
                  Please increase your budget to at least <strong>${Math.ceil(results.estimate.totalEstimate * 1.1).toLocaleString()} {results.parsed.currency || "USD"}</strong> so
                  we can create the best itinerary and show you the best hotels.
                </p>
                <div className="mt-2 text-xs text-red-600">
                  <p>💡 Tips to reduce costs:</p>
                  <ul className="list-disc ml-4 mt-1 space-y-0.5">
                    <li>Reduce the number of travel days</li>
                    <li>Choose budget-friendly accommodations instead of luxury</li>
                    <li>Travel during off-peak season for lower prices</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

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
            <ErrorState
              title="Weather data unavailable"
              message={errors.weather}
              onRetry={refreshWeather}
            />
          ) : (
            <WeatherPanel weather={results.weather || []} />
          )}
        </section>

        {/* Itinerary */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-bold text-gray-800">📅 Day-by-Day Itinerary</h2>
            {results.itineraryProvider === "oss-ai" ? (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">Open-source AI</span>
            ) : (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold" title={results.aiFailureReason || "AI unavailable"}>Rule-based fallback</span>
            )}
          </div>
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
