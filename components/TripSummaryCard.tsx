import type { ParsedTrip, LocationResult } from "@/types/trip";
import { format } from "date-fns";

interface TripSummaryCardProps {
  parsedTrip: ParsedTrip;
  location?: LocationResult;
}

export default function TripSummaryCard({ parsedTrip, location }: TripSummaryCardProps) {
  const { destination, origin, startDate, endDate, duration, travelers, budget, currency } = parsedTrip;

  const formatDate = (d?: string) => {
    if (!d) return "—";
    try { return format(new Date(d + "T00:00:00"), "MMM d, yyyy"); } catch { return d; }
  };

  const travelerStr = [
    travelers.adults > 0 ? `${travelers.adults} adult${travelers.adults > 1 ? "s" : ""}` : "",
    travelers.children > 0 ? `${travelers.children} child${travelers.children > 1 ? "ren" : ""}` : "",
    travelers.infants > 0 ? `${travelers.infants} infant${travelers.infants > 1 ? "s" : ""}` : "",
  ].filter(Boolean).join(", ");

  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl p-6 shadow-lg">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {destination || "Unknown Destination"}
          </h2>
          {location && (
            <p className="text-blue-100 text-sm mt-0.5">{location.displayName || `${location.name}, ${location.country}`}</p>
          )}
          {origin && (
            <p className="text-blue-200 text-sm mt-1">From: {origin}</p>
          )}
        </div>
        <span className="text-4xl">🌍</span>
      </div>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white/10 rounded-xl p-3">
          <p className="text-xs text-blue-200 uppercase tracking-wide">Dates</p>
          <p className="text-sm font-semibold mt-0.5">{formatDate(startDate)} – {formatDate(endDate)}</p>
        </div>
        <div className="bg-white/10 rounded-xl p-3">
          <p className="text-xs text-blue-200 uppercase tracking-wide">Duration</p>
          <p className="text-sm font-semibold mt-0.5">{duration ? `${duration} days` : "—"}</p>
        </div>
        <div className="bg-white/10 rounded-xl p-3">
          <p className="text-xs text-blue-200 uppercase tracking-wide">Travelers</p>
          <p className="text-sm font-semibold mt-0.5">{travelerStr || "1 adult"}</p>
        </div>
        <div className="bg-white/10 rounded-xl p-3">
          <p className="text-xs text-blue-200 uppercase tracking-wide">Budget</p>
          <p className="text-sm font-semibold mt-0.5">{budget ? `${currency || "USD"} ${budget.toLocaleString()}` : "—"}</p>
        </div>
      </div>
    </div>
  );
}
