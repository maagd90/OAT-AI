import Header from "@/components/Header";
import Footer from "@/components/Footer";
import HeroSearch from "@/components/HeroSearch";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 text-white py-20 px-4">
          <div className="relative max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm mb-6">
              <span>✨</span>
              <span>AI-Powered Travel Planning — Free &amp; Open</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 leading-tight">
              Plan Your Perfect Trip
              <br />
              <span className="text-yellow-300">with AI</span>
            </h1>
            <p className="text-lg md:text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
              Just describe your dream trip in plain English. We&apos;ll build a complete itinerary with hotels, attractions, weather, and cost estimates — all for free.
            </p>
            <HeroSearch />
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 px-4 bg-white">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-10">What We Plan For You</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[
                { emoji: "📍", title: "Destination Map", desc: "Interactive map with hotels & attractions" },
                { emoji: "🏨", title: "Hotels & Areas", desc: "Accommodation recommendations from OpenStreetMap" },
                { emoji: "🗺️", title: "Top Attractions", desc: "Must-see places powered by OpenTripMap" },
                { emoji: "🌤", title: "Weather Forecast", desc: "Trip-date weather from Open-Meteo" },
                { emoji: "📅", title: "Day-by-Day Plan", desc: "Structured itinerary for your entire trip" },
                { emoji: "💰", title: "Cost Estimate", desc: "Approximate budget breakdown" },
                { emoji: "💾", title: "Save Trips", desc: "Revisit your recent travel plans anytime" },
                { emoji: "🆓", title: "Completely Free", desc: "No sign-up, no payments, no limits" },
              ].map((f) => (
                <div key={f.title} className="text-center p-4">
                  <div className="text-4xl mb-3">{f.emoji}</div>
                  <h3 className="font-semibold text-gray-800 text-sm mb-1">{f.title}</h3>
                  <p className="text-xs text-gray-500">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
