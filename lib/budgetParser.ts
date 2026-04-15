export function parseBudget(message: string): {
  budget?: number;
  currency?: string;
  preferences?: string[];
} {
  const prefs: string[] = [];
  const lower = message.toLowerCase();

  if (/luxury|premium|5[\s-]?star/i.test(lower)) prefs.push("luxury");
  if (/budget|cheap|affordable|low.?cost/i.test(lower)) prefs.push("budget");

  const patterns = [
    /(?:under|less\s+than|below|max(?:imum)?|budget\s+of?)\s*\$\s*(\d+(?:[.,]\d+)?)/i,
    /\$\s*(\d+(?:[.,]\d+)?)/i,
    /(?:under|less\s+than|below)\s+(\d+(?:[.,]\d+)?)\s*(?:USD|usd|dollars?)/i,
    /(\d+(?:[.,]\d+)?)\s*(?:USD|usd|dollars?)/i,
    /(?:USD|usd)\s*(\d+(?:[.,]\d+)?)/i,
    /budget\s+(?:of\s+)?(\d+(?:[.,]\d+)?)/i,
  ];

  for (const p of patterns) {
    const m = message.match(p);
    if (m) {
      const amount = parseFloat(m[1].replace(",", ""));
      if (!isNaN(amount)) {
        return { budget: amount, currency: "USD", preferences: prefs };
      }
    }
  }

  return { preferences: prefs };
}
