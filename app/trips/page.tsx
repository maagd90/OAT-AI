"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getTrips, deleteTrip, clearTrips } from "@/lib/storage";
import type { SavedTrip } from "@/lib/storage";
import { format } from "date-fns";

export default function TripsPage() {
  const [trips, setTrips] = useState<SavedTrip[]>([]);

  useEffect(() => {
    setTrips(getTrips());
  }, []);

  const handleDelete = (id: string) => {
    deleteTrip(id);
    setTrips(getTrips());
  };

  const handleClear = () => {
    if (confirm("Clear all saved trips?")) {
      clearTrips();
      setTrips([]);
    }
  };

  const formatTs = (ts: string) => {
    try {
      return format(new Date(ts), "MMM d, yyyy · h:mm a");
    } catch {
      return ts;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">My Recent Trips</h1>
            <p className="text-sm text-gray-500 mt-0.5">Your last {trips.length} travel plans</p>
          </div>
          {trips.length > 0 && (
            <button
              onClick={handleClear}
              className="text-sm text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors"
            >
              Clear All
            </button>
          )}
        </div>

        {trips.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">✈️</p>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No saved trips yet</h2>
            <p className="text-gray-500 mb-6">Start by planning your first trip!</p>
            <Link href="/" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors">
              Plan a Trip
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {trips.map((trip) => (
              <div key={trip.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 mb-1">{formatTs(trip.timestamp)}</p>
                    <h3 className="font-semibold text-gray-800 mb-1 truncate">{trip.message}</h3>

                    <div className="flex flex-wrap gap-2 mt-2">
                      {trip.parsedTrip.destination && (
                        <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                          📍 {trip.parsedTrip.destination}
                        </span>
                      )}
                      {trip.parsedTrip.duration && (
                        <span className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full">
                          📅 {trip.parsedTrip.duration} days
                        </span>
                      )}
                      {trip.parsedTrip.budget && (
                        <span className="bg-amber-50 text-amber-700 text-xs px-2 py-0.5 rounded-full">
                          💰 {trip.parsedTrip.currency || "USD"} {trip.parsedTrip.budget.toLocaleString()}
                        </span>
                      )}
                      {trip.parsedTrip.travelers.adults > 0 && (
                        <span className="bg-purple-50 text-purple-700 text-xs px-2 py-0.5 rounded-full">
                          👥 {trip.parsedTrip.travelers.adults + trip.parsedTrip.travelers.children} people
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Link
                      href={`/results?q=${encodeURIComponent(trip.message)}`}
                      className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                    >
                      View Plan
                    </Link>
                    <button
                      onClick={() => handleDelete(trip.id)}
                      className="text-xs px-3 py-1.5 border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
