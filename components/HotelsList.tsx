import type { HotelResult } from "@/types/trip";

interface HotelsListProps {
  hotels: HotelResult[];
}

const TYPE_EMOJI: Record<string, string> = {
  hotel: "🏨",
  hostel: "🛏",
  guest_house: "🏠",
  apartment: "🏢",
  motel: "🏨",
};

export default function HotelsList({ hotels }: HotelsListProps) {
  if (!hotels || hotels.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p className="text-2xl mb-2">🏨</p>
        <p className="text-sm">No hotel data available for this area.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {hotels.slice(0, 10).map((hotel) => (
        <div key={hotel.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow bg-white">
          <div className="flex items-start gap-3">
            <span className="text-2xl">{TYPE_EMOJI[hotel.type] || "🏨"}</span>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-800 text-sm truncate">{hotel.name}</h4>
              <p className="text-xs text-gray-500 capitalize mt-0.5">{hotel.type.replace("_", " ")}</p>
              {hotel.stars && (
                <p className="text-xs text-yellow-500 mt-1">{"⭐".repeat(Math.min(hotel.stars, 5))}</p>
              )}
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-gray-400">Source: {hotel.source}</span>
            <span className="text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">Recommendation</span>
          </div>
        </div>
      ))}
    </div>
  );
}
