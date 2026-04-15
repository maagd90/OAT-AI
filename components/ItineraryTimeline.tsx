import type { ItineraryDay } from "@/types/trip";

interface ItineraryTimelineProps {
  itinerary: ItineraryDay[];
}

export default function ItineraryTimeline({ itinerary }: ItineraryTimelineProps) {
  if (!itinerary || itinerary.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p className="text-2xl mb-2">📅</p>
        <p className="text-sm">No itinerary generated.</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-blue-100" />
      <div className="flex flex-col gap-6">
        {itinerary.map((day) => (
          <div key={day.day} className="flex gap-4 items-start">
            <div className="relative z-10 w-12 h-12 flex-shrink-0 bg-blue-600 text-white rounded-full flex flex-col items-center justify-center text-xs font-bold shadow">
              <span>Day</span>
              <span>{day.day}</span>
            </div>
            <div className="flex-1 bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <h4 className="font-semibold text-gray-800 text-sm mb-2">{day.title}</h4>
              <ul className="space-y-1.5">
                {day.activities.map((activity, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-blue-400 mt-0.5">•</span>
                    {activity}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
