export function parseTravelers(message: string): {
  adults: number;
  children: number;
  infants: number;
} {
  const lower = message.toLowerCase();

  let adults = 1;
  let children = 0;
  let infants = 0;

  const adultsMatch = lower.match(/(\d+)\s+adults?/);
  if (adultsMatch) adults = parseInt(adultsMatch[1], 10);

  const childrenMatch = lower.match(/(\d+)\s+(?:children|kids?|child)/);
  if (childrenMatch) children = parseInt(childrenMatch[1], 10);

  const infantsMatch = lower.match(/(\d+)\s+(?:infants?|babies|baby)/);
  if (infantsMatch) infants = parseInt(infantsMatch[1], 10);

  if (/with\s+(?:my\s+)?wife/.test(lower) && !adultsMatch) adults = Math.max(adults, 2);
  if (/with\s+(?:my\s+)?husband/.test(lower) && !adultsMatch) adults = Math.max(adults, 2);
  if (/with\s+(?:my\s+)?(?:partner|spouse|girlfriend|boyfriend)/.test(lower) && !adultsMatch) {
    adults = Math.max(adults, 2);
  }
  if (/wife\s+and\s+(?:a\s+)?child/.test(lower) && !adultsMatch) {
    adults = Math.max(adults, 2);
    if (!childrenMatch) children = Math.max(children, 1);
  }
  if (/me\s+and\s+(?:my\s+)?wife/.test(lower) && !adultsMatch) adults = Math.max(adults, 2);
  if (/family/.test(lower) && !adultsMatch) adults = Math.max(adults, 2);
  if (/couple/.test(lower) && !adultsMatch) adults = Math.max(adults, 2);
  if (/solo/.test(lower)) { adults = 1; children = 0; infants = 0; }

  const withKids = lower.match(/with\s+(\d+)\s+(?:kids?|children|child)/);
  if (withKids && !childrenMatch) children = parseInt(withKids[1], 10);

  if (/and\s+(?:a\s+)?child/.test(lower) && !childrenMatch && !withKids) {
    children = Math.max(children, 1);
  }

  return { adults, children, infants };
}
