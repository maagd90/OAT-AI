"use client";
import { useState, useEffect } from "react";
import type { ParsedTrip, LocationResult } from "@/types/trip";
import { format, differenceInDays, parseISO } from "date-fns";

interface TripSummaryCardProps {
  parsedTrip: ParsedTrip;
  location?: LocationResult;
  onDatesChange?: (startDate: string, endDate: string, duration: number) => void;
  onTravelersChange?: (travelers: ParsedTrip["travelers"]) => void;
  onBudgetChange?: (budget: number, currency: string) => void;
}

type EditPanel = "dates" | "travelers" | "budget" | null;

export default function TripSummaryCard({
  parsedTrip,
  location,
  onDatesChange,
  onTravelersChange,
  onBudgetChange,
}: TripSummaryCardProps) {
  const { destination, origin } = parsedTrip;

  const [startDate, setStartDate] = useState(parsedTrip.startDate || "");
  const [endDate, setEndDate] = useState(parsedTrip.endDate || "");
  const [adults, setAdults] = useState(parsedTrip.travelers.adults || 1);
  const [children, setChildren] = useState(parsedTrip.travelers.children || 0);
  const [infants, setInfants] = useState(parsedTrip.travelers.infants || 0);
  const [budget, setBudget] = useState(parsedTrip.budget ?? "");
  const [currency, setCurrency] = useState(parsedTrip.currency || "USD");
  const [activePanel, setActivePanel] = useState<EditPanel>(null);

  // Sync if parent prop changes (e.g. fresh plan)
  useEffect(() => {
    setStartDate(parsedTrip.startDate || "");
    setEndDate(parsedTrip.endDate || "");
    setAdults(parsedTrip.travelers.adults || 1);
    setChildren(parsedTrip.travelers.children || 0);
    setInfants(parsedTrip.travelers.infants || 0);
    setBudget(parsedTrip.budget ?? "");
    setCurrency(parsedTrip.currency || "USD");
  }, [parsedTrip]);

  const calcDuration = (s: string, e: string): number => {
    if (!s || !e) return parsedTrip.duration || 0;
    try {
      const diff = differenceInDays(parseISO(e), parseISO(s));
      return diff >= 0 ? diff + 1 : 0;
    } catch { return parsedTrip.duration || 0; }
  };

  const duration = calcDuration(startDate, endDate);

  const formatDate = (d?: string) => {
    if (!d) return "—";
    try { return format(parseISO(d), "MMM d, yyyy"); } catch { return d; }
  };

  const handleStartChange = (val: string) => {
    setStartDate(val);
    const newEnd = endDate && val > endDate ? val : endDate;
    if (newEnd !== endDate) setEndDate(newEnd);
  };

  const applyDates = () => {
    setActivePanel(null);
    const newDuration = calcDuration(startDate, endDate);
    onDatesChange?.(startDate, endDate, newDuration);
  };

  const applyTravelers = () => {
    setActivePanel(null);
    onTravelersChange?.({ adults, children, infants });
  };

  const applyBudget = () => {
    setActivePanel(null);
    const num = Number(budget);
    if (!isNaN(num) && num > 0) onBudgetChange?.(num, currency);
  };

  const travelerStr = [
    adults > 0 ? `${adults} adult${adults > 1 ? "s" : ""}` : "",
    children > 0 ? `${children} child${children > 1 ? "ren" : ""}` : "",
    infants > 0 ? `${infants} infant${infants > 1 ? "s" : ""}` : "",
  ].filter(Boolean).join(", ");

  const tileClass = "bg-white/10 rounded-xl p-3 cursor-pointer hover:bg-white/20 transition-colors";

  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl p-6 shadow-lg">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">{destination || "Unknown Destination"}</h2>
          {location && (
            <p className="text-blue-100 text-sm mt-0.5">{location.displayName || `${location.name}, ${location.country}`}</p>
          )}
          {origin && <p className="text-blue-200 text-sm mt-1">From: {origin}</p>}
        </div>
        <span className="text-4xl">🌍</span>
      </div>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Dates */}
        <div className={tileClass} onClick={() => setActivePanel(activePanel === "dates" ? null : "dates")}>
          <p className="text-xs text-blue-200 uppercase tracking-wide flex items-center gap-1">
            Dates <span className="text-[10px]">✏️</span>
          </p>
          <p className="text-sm font-semibold mt-0.5">
            {startDate && endDate ? `${formatDate(startDate)} – ${formatDate(endDate)}` : startDate ? formatDate(startDate) : "Set dates"}
          </p>
        </div>

        {/* Duration (read-only, derived) */}
        <div className="bg-white/10 rounded-xl p-3">
          <p className="text-xs text-blue-200 uppercase tracking-wide">Duration</p>
          <p className="text-sm font-semibold mt-0.5">{duration > 0 ? `${duration} day${duration !== 1 ? "s" : ""}` : "—"}</p>
        </div>

        {/* Travelers */}
        <div className={tileClass} onClick={() => setActivePanel(activePanel === "travelers" ? null : "travelers")}>
          <p className="text-xs text-blue-200 uppercase tracking-wide flex items-center gap-1">
            Travelers <span className="text-[10px]">✏️</span>
          </p>
          <p className="text-sm font-semibold mt-0.5">{travelerStr || "1 adult"}</p>
        </div>

        {/* Budget */}
        <div className={tileClass} onClick={() => setActivePanel(activePanel === "budget" ? null : "budget")}>
          <p className="text-xs text-blue-200 uppercase tracking-wide flex items-center gap-1">
            Budget <span className="text-[10px]">✏️</span>
          </p>
          <p className="text-sm font-semibold mt-0.5">
            {budget ? `${currency} ${Number(budget).toLocaleString()}` : "Set budget"}
          </p>
        </div>
      </div>

      {/* ── Dates panel ── */}
      {activePanel === "dates" && (
        <div className="mt-4 bg-white rounded-xl p-4 shadow-xl">
          <p className="text-gray-700 text-sm font-semibold mb-3">Select Travel Dates</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleStartChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">End Date</label>
              <input
                type="date"
                value={endDate}
                min={startDate || undefined}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>
          {startDate && endDate && duration > 0 && (
            <p className="text-xs text-gray-500 mt-2">📅 {duration} day{duration !== 1 ? "s" : ""} selected</p>
          )}
          <div className="flex gap-2 mt-3">
            <button onClick={applyDates} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 rounded-lg transition-colors">Apply</button>
            <button onClick={() => setActivePanel(null)} className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold py-2 rounded-lg transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* ── Travelers panel ── */}
      {activePanel === "travelers" && (
        <div className="mt-4 bg-white rounded-xl p-4 shadow-xl">
          <p className="text-gray-700 text-sm font-semibold mb-3">Edit Travelers</p>
          <div className="flex flex-col gap-3">
            {(["Adults", "Children", "Infants"] as const).map((label) => {
              const val = label === "Adults" ? adults : label === "Children" ? children : infants;
              const setter = label === "Adults" ? setAdults : label === "Children" ? setChildren : setInfants;
              const min = label === "Adults" ? 1 : 0;
              return (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-gray-700 text-sm font-medium">{label}</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setter(Math.max(min, val - 1))}
                      className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-lg flex items-center justify-center transition-colors"
                    >−</button>
                    <span className="text-gray-800 font-semibold w-5 text-center">{val}</span>
                    <button
                      onClick={() => setter(val + 1)}
                      className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-lg flex items-center justify-center transition-colors"
                    >+</button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={applyTravelers} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 rounded-lg transition-colors">Apply</button>
            <button onClick={() => setActivePanel(null)} className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold py-2 rounded-lg transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* ── Budget panel ── */}
      {activePanel === "budget" && (
        <div className="mt-4 bg-white rounded-xl p-4 shadow-xl">
          <p className="text-gray-700 text-sm font-semibold mb-3">Edit Budget</p>
          <div className="flex gap-2">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-2 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {["USD", "EUR", "GBP", "AED", "PKR", "INR", "CAD", "AUD"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="Enter budget amount"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={applyBudget} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2 rounded-lg transition-colors">Apply</button>
            <button onClick={() => setActivePanel(null)} className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold py-2 rounded-lg transition-colors">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
