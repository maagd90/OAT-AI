import { NextRequest, NextResponse } from "next/server";
import { parseMessage } from "@/lib/parser";
import { parseWithAI } from "@/lib/aiParser";

const MAX_MESSAGE_LENGTH = 500;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body?.message;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const trimmed = message.trim().slice(0, MAX_MESSAGE_LENGTH);

    // Try AI parser first (handles typos, grammar mistakes, any city)
    const aiParsed = await parseWithAI(trimmed);
    if (aiParsed?.destination) {
      console.log(`[Parse] AI parser succeeded: ${aiParsed.destination}`);
      return NextResponse.json(aiParsed);
    }

    // Fallback to regex parser when AI is unavailable or fails
    console.log("[Parse] Falling back to regex parser");
    const parsed = parseMessage(trimmed);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Parse error:", err);
    return NextResponse.json({ error: "Failed to parse message" }, { status: 500 });
  }
}
