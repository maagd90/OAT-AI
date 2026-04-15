import { NextRequest, NextResponse } from "next/server";
import { parseMessage } from "@/lib/parser";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body?.message;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const parsed = parseMessage(message.trim());
    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Parse error:", err);
    return NextResponse.json({ error: "Failed to parse message" }, { status: 500 });
  }
}
