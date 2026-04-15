export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-8 mt-12">
      <div className="max-w-6xl mx-auto px-4 text-center">
        <p className="text-sm">
          ✈️ <span className="text-white font-semibold">AI Travel Planner</span> — Open-data travel planning MVP
        </p>
        <p className="text-xs mt-2">
          Using OpenStreetMap, Open-Meteo, OpenTripMap &amp; Nominatim. Not a booking engine.
        </p>
        <p className="text-xs mt-1">All prices are estimates only. Not affiliated with any travel provider.</p>
      </div>
    </footer>
  );
}
