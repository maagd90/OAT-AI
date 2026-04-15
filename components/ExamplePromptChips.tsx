interface ExamplePromptChipsProps {
  onSelect: (prompt: string) => void;
}

const EXAMPLES = [
  "Trip to Dubai under $900",
  "3 days in Paris",
  "Family trip to Istanbul",
  "I want to go to Dubai from Karachi from 4 July to 10 July with my wife and child under $900",
  "Budget beach trip to Bali for a week",
  "Romantic trip to Paris next month",
];

export default function ExamplePromptChips({ onSelect }: ExamplePromptChipsProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {EXAMPLES.map((prompt) => (
        <button
          key={prompt}
          onClick={() => onSelect(prompt)}
          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full text-xs font-medium border border-blue-200 transition-colors cursor-pointer"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
