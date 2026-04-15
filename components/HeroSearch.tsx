"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ExamplePromptChips from "./ExamplePromptChips";

export default function HeroSearch() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    router.push(`/results?q=${encodeURIComponent(query.trim())}`);
  };

  const handleExampleSelect = (prompt: string) => {
    setQuery(prompt);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <form onSubmit={handleSubmit} className="w-full max-w-2xl">
        <div className="relative flex items-center bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          <span className="pl-4 text-gray-400 text-xl">✈️</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Where do you want to go? e.g. Trip to Dubai under $900..."
            className="flex-1 px-3 py-4 text-gray-800 placeholder-gray-400 outline-none text-sm md:text-base"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="m-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-xl font-semibold text-sm transition-colors"
          >
            {loading ? "Planning..." : "Plan Trip"}
          </button>
        </div>
      </form>

      <div className="w-full max-w-2xl">
        <p className="text-center text-xs text-gray-400 mb-3">Try an example:</p>
        <ExamplePromptChips onSelect={handleExampleSelect} />
      </div>
    </div>
  );
}
