import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">About AI Travel Planner</h1>
        <p className="text-gray-500 mb-8">An open-data MVP for intelligent travel planning</p>

        <div className="prose prose-gray max-w-none">
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-3">What is this?</h2>
            <p className="text-gray-600 leading-relaxed">
              AI Travel Planner is a free, open-data travel planning application. It lets you describe your trip in natural language and generates a complete structured travel plan — including hotel recommendations, top attractions, weather forecasts, a day-by-day itinerary, and an estimated cost breakdown.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-3">MVP Limitations</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              <ul className="space-y-1.5">
                <li>⚠️ This is <strong>not</strong> a real booking engine</li>
                <li>⚠️ Hotel and attraction suggestions come from open data — not confirmed inventory</li>
                <li>⚠️ All cost estimates are approximate heuristics, not live pricing</li>
                <li>⚠️ Flights, car rentals, and payments are <strong>not</strong> supported in this MVP</li>
                <li>⚠️ Trip parsing is rule-based, not AI/LLM — complex requests may not parse perfectly</li>
              </ul>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-3">APIs &amp; Data Sources</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: "OpenStreetMap / Nominatim", use: "Geocoding city names to coordinates", link: "https://nominatim.openstreetmap.org" },
                { name: "Overpass API", use: "Finding hotels and accommodations", link: "https://overpass-api.de" },
                { name: "OpenTripMap", use: "Attractions and places of interest", link: "https://opentripmap.io" },
                { name: "Open-Meteo", use: "Weather forecasts for trip dates", link: "https://open-meteo.com" },
              ].map((api) => (
                <div key={api.name} className="border border-gray-100 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-800 text-sm">{api.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{api.use}</p>
                  <a href={api.link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline mt-1 block">
                    {api.link}
                  </a>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-3">Future Roadmap</h2>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">→</span> Integration with real hotel booking APIs (Booking.com, Yalago)</li>
              <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">→</span> Real-time flight search (Amadeus, Duffel)</li>
              <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">→</span> Car rental integration</li>
              <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">→</span> AI/LLM-powered natural language parsing (OpenAI, Ollama)</li>
              <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">→</span> User accounts and cloud trip storage (Supabase)</li>
              <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">→</span> Shareable trip links</li>
              <li className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">→</span> Payment processing</li>
            </ul>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
