export function parseBudget(message: string): {
  budget?: number;
  currency?: string;
  preferences?: string[];
} {
  const prefs: string[] = [];
  const lower = message.toLowerCase();

  if (/luxury|premium|5[\s-]?star/i.test(lower)) prefs.push("luxury");
  if (/budget[\s-](?:friendly|trip|travel|hotel|option|stay)|budget\s+\w*\s*trip|cheap|affordable|low.?cost/i.test(lower)) prefs.push("budget");

  const tokenToCurrency = (token?: string): string | undefined => {
    if (!token) return undefined;
    const t = token.toLowerCase().trim();
    if (t === "$" || /usd|dollar|doller|dolar|dollr|us\$/i.test(t)) return "USD";
    if (t === "eur" || /euro|eurs?/i.test(t)) return "EUR";
    if (t === "gbp" || /pound|ponds?|punds?|sterling/i.test(t)) return "GBP";
    if (t === "aed" || /dirham/i.test(t)) return "AED";
    if (t === "pkr" || /pakistani\s+rupee|pak\s+rupee/i.test(t)) return "PKR";
    if (t === "inr" || /^rs\.?$/.test(t) || /indian\s+rupee/i.test(t)) return "INR";
    if (t === "cad" || /canadian\s+dollar/i.test(t)) return "CAD";
    if (t === "aud" || /australian\s+dollar/i.test(t)) return "AUD";
    return undefined;
  };

  const detectCurrencyHint = (): string => {
    const checks: Array<[RegExp, string]> = [
      [/\bcad\b|\bcanadian\s+dollars?\b/i, "CAD"],
      [/\baud\b|\baustralian\s+dollars?\b/i, "AUD"],
      [/\beur\b|\beuros?\b/i, "EUR"],
      [/\bgbp\b|(?:^|\s|\d)pounds?(?:\s|$)|(?:^|\s|\d)ponds?(?:\s|$)|(?:^|\s|\d)punds?(?:\s|$)|\bsterling\b/i, "GBP"],
      [/\baed\b|\bdirhams?\b/i, "AED"],
      [/\bpkr\b|\bpakistani\s+rupees?\b|\bpak\s+rupees?\b/i, "PKR"],
      [/\binr\b|\bindian\s+rupees?\b|\brs\.?\b/i, "INR"],
      [/\$|\busd\b|\bdollars?\b/i, "USD"],
    ];

    for (const [pattern, code] of checks) {
      if (pattern.test(message)) return code;
    }
    return "USD";
  };

  const parseAmount = (numPart: string, suffix?: string): number | undefined => {
    const cleaned = numPart.replace(/,/g, "");
    const base = parseFloat(cleaned);
    if (isNaN(base)) return undefined;
    const s = (suffix || "").toLowerCase();
    if (s === "k") return base * 1000;
    if (s === "m") return base * 1000000;
    return base;
  };

  const patterns: RegExp[] = [
    /(?:under|less\s+than|below|max(?:imum)?|budget\s+(?:is\s+|of\s+)?)\s*(\$|usd|eur|gbp|aed|pkr|inr|cad|aud|rs\.?)?\s*(\d[\d,]*(?:\.\d+)?)\s*([kKmM])?\s*(\$|usd|eur|gbp|aed|pkr|inr|cad|aud|rs\.?|dollars?|dollers?|dolars?|euros?|eurs?|pounds?|ponds?|punds?|dirhams?|rupees?)?/i,
    /(\$|usd|eur|gbp|aed|pkr|inr|cad|aud|rs\.?)\s*(\d[\d,]*(?:\.\d+)?)\s*([kKmM])?/i,
    /(\d[\d,]*(?:\.\d+)?)\s*([kKmM])?\s*(\$|usd|eur|gbp|aed|pkr|inr|cad|aud|dollars?|dollers?|dolars?|euros?|eurs?|pounds?|ponds?|punds?|dirhams?|rupees?|rs\.?)/i,
    /budget\s+(?:is\s+|of\s+)?(\d[\d,]*(?:\.\d+)?)\s*([kKmM])?/i,
  ];

  for (const p of patterns) {
    const m = message.match(p);
    if (!m) continue;

    // Pattern-specific group mapping
    let amountStr = "";
    let suffix = "";
    let currencyToken = "";

    if (p === patterns[0]) {
      currencyToken = m[1] || m[4] || "";
      amountStr = m[2] || "";
      suffix = m[3] || "";
    } else if (p === patterns[1]) {
      currencyToken = m[1] || "";
      amountStr = m[2] || "";
      suffix = m[3] || "";
    } else if (p === patterns[2]) {
      amountStr = m[1] || "";
      suffix = m[2] || "";
      currencyToken = m[3] || "";
    } else {
      amountStr = m[1] || "";
      suffix = m[2] || "";
    }

    const amount = parseAmount(amountStr, suffix);
    if (amount === undefined) continue;

    const currency = tokenToCurrency(currencyToken) || detectCurrencyHint();
    return { budget: amount, currency, preferences: prefs };
  }

  return { preferences: prefs };
}
