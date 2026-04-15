import type { AttractionResult } from "@/types/trip";

const OTM_BASE = "https://api.opentripmap.com/0.1/en";
const API_KEY = process.env.OPENTRIPMAP_API_KEY || "5ae2e3f221c38a28845f05b6a1c1c19f3db85e5af2c87e2c51d83b73";

export async function fetchAttractions(lat: number, lon: number, radius = 10000): Promise<AttractionResult[]> {
  try {
    const url = `${OTM_BASE}/places/radius?radius=${radius}&lon=${lon}&lat=${lat}&kinds=interesting_places,architecture,museums,natural,historic&limit=30&format=json&apikey=${API_KEY}`;
    const res = await fetch(url);

    if (!res.ok) throw new Error(`OpenTripMap error: ${res.status}`);
    const data = await res.json();

    if (!Array.isArray(data)) return [];

    return data
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
  } catch (err) {
    console.error("OpenTripMap fetch failed:", err);
    return [];
  }
}
