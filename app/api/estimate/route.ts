import { NextRequest, NextResponse } from "next/server";
import { estimateCost } from "@/lib/estimator";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      destination,
      duration,
      travelers = { adults: 1, children: 0, infants: 0 },
      budget,
      preferences = [],
    } = body;

    if (!destination) {
      return NextResponse.json({ error: "destination required" }, { status: 400 });
    }

    const estimate = estimateCost(destination, duration || 3, travelers, budget, preferences);
    return NextResponse.json(estimate);
  } catch (err) {
    console.error("Estimate error:", err);
    return NextResponse.json({ error: "Failed to estimate cost" }, { status: 500 });
  }
}
