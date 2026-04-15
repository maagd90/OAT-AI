import type { AttractionResult } from "@/types/trip";

interface AttractionsListProps {
  attractions: AttractionResult[];
}

export default function AttractionsList({ attractions }: AttractionsListProps) {
  if (!attractions || attractions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p className="text-2xl mb-2">🗺️</p>
        <p className="text-sm">No attractions data available for this area.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {attractions.slice(0, 12).map((attr) => (
        <div key={attr.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow bg-white">
          <h4 className="font-semibold text-gray-800 text-sm">{attr.name}</h4>
          {attr.kind && (
            <p className="text-xs text-gray-500 capitalize mt-0.5">
              {attr.kind.replace(/_/g, " ")}
            </p>
          )}
          {attr.rating !== null && attr.rating !== undefined && (
            <div className="mt-1.5 flex items-center gap-1">
              <span className="text-yellow-400 text-xs">★</span>
              <span className="text-xs text-gray-600">{attr.rating}</span>
            </div>
          )}
          <p className="text-xs text-gray-400 mt-2">Source: {attr.source}</p>
        </div>
      ))}
    </div>
  );
}
