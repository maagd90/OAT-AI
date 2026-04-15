import type { CostEstimate } from "@/types/trip";

interface CostBreakdownCardProps {
  estimate: CostEstimate;
  budget?: number;
  currency?: string;
}

export default function CostBreakdownCard({ estimate, budget, currency = "USD" }: CostBreakdownCardProps) {
  const items = [
    { label: "Accommodation", value: estimate.hotelEstimate, emoji: "🏨" },
    { label: "Food & Dining", value: estimate.foodEstimate, emoji: "🍽️" },
    { label: "Local Transport", value: estimate.transportEstimate, emoji: "🚖" },
    { label: "Activities & Attractions", value: estimate.activitiesEstimate, emoji: "🎡" },
  ];

  const maxVal = Math.max(...items.map((i) => i.value));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-800">Estimated Cost Breakdown</h3>
        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${estimate.withinBudget ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {estimate.withinBudget ? "Within Budget ✓" : "Over Budget ⚠️"}
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {items.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-600 flex items-center gap-2">
                <span>{item.emoji}</span>
                {item.label}
              </span>
              <span className="text-sm font-semibold text-gray-800">{currency} {item.value.toLocaleString()}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-400 rounded-full transition-all"
                style={{ width: maxVal > 0 ? `${(item.value / maxVal) * 100}%` : "0%" }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-100 pt-4 mt-4">
        <div className="flex items-center justify-between">
          <span className="font-bold text-gray-800">Total Estimate</span>
          <span className="font-bold text-xl text-blue-700">{currency} {estimate.totalEstimate.toLocaleString()}</span>
        </div>
        {budget && (
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm text-gray-500">Your Budget</span>
            <span className="text-sm text-gray-600">{currency} {budget.toLocaleString()}</span>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-1.5">
        {estimate.notes.map((note, i) => (
          <p key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
            <span>ℹ️</span>
            {note}
          </p>
        ))}
      </div>
    </div>
  );
}
