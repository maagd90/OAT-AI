import type { AttractionResult } from "@/types/trip";

const OTM_BASE = "https://api.opentripmap.com/0.1/en";
const API_KEY = process.env.OPENTRIPMAP_API_KEY || "";
const OTM_TTL_MS = 10 * 60 * 1000;
const OTM_TIMEOUT_MS = 6000;

const otmCache = new Map<string, { ts: number; value: AttractionResult[] }>();

export async function fetchAttractions(lat: number, lon: number, radius = 10000): Promise<AttractionResult[]> {
  const key = `${lat.toFixed(4)}:${lon.toFixed(4)}:${radius}`;
  const cached = otmCache.get(key);
  if (cached && Date.now() - cached.ts < OTM_TTL_MS) {
    return cached.value;
  }

  try {
    const url = `${OTM_BASE}/places/radius?radius=${radius}&lon=${lon}&lat=${lat}&kinds=interesting_places,architecture,museums,natural,historic&limit=30&format=json&apikey=${API_KEY}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(OTM_TIMEOUT_MS) });

    if (!res.ok) throw new Error(`OpenTripMap error: ${res.status}`);
    const data = await res.json();

    if (!Array.isArray(data)) return [];

    const attractions = data
      .filter((item: Record<string, unknown>) => item.name && String(item.name).trim() !== "")
      .map((item: Record<string, unknown>) => ({
        id: `attr-${item.xid}`,
        name: String(item.name),
        kind: item.kinds ? String(item.kinds).split(",")[0] : undefined,
        lat: (item.point as Record<string, number>)?.lat ?? lat,
        lon: (item.point as Record<string, number>)?.lon ?? lon,
        rating: item.rate ? parseFloat(String(item.rate)) : null,
        source: "OpenTripMap",
      }))
      .slice(0, 15);
    otmCache.set(key, { ts: Date.now(), value: attractions });
    return attractions;
  } catch (err) {
    console.error("OpenTripMap fetch failed:", err);
    return [];
  }
}
