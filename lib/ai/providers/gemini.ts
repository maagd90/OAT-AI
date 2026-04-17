/**
 * Google Gemini AI provider implementation.
 *
 * Uses the Gemini REST API (generativelanguage.googleapis.com).
 * Supports both free-text and structured (JSON) responses.
 * Includes retry logic for 429 rate-limit errors.
 */

import type { AIProvider, AIRequestOptions, AIResponse, AIStructuredResponse, AIConfig } from "../types";
import { AIRequestError, AIParseError, AITimeoutError } from "../exceptions";

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2_000;
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export class GeminiProvider implements AIProvider {
  readonly name = "gemini" as const;

  private readonly model: string;
  private readonly apiKey: string;
  private readonly defaultTimeout: number;
  private readonly defaultTemperature: number;
  private readonly defaultMaxTokens: number;

  constructor(config: AIConfig) {
    this.model = config.gemini.model;
    this.apiKey = config.gemini.apiKey;
    this.defaultTimeout = config.timeout;
    this.defaultTemperature = config.temperature;
    this.defaultMaxTokens = config.maxTokens;
  }

  /** @inheritdoc */
  async generateResponse(prompt: string, options?: AIRequestOptions): Promise<AIResponse> {
    const text = await this.callGemini(prompt, options);
    return {
      text: text.content,
      provider: this.name,
      model: this.model,
      latencyMs: text.latencyMs,
    };
  }

  /** @inheritdoc */
  async generateStructuredResponse<T = unknown>(
    prompt: string,
    options?: AIRequestOptions,
  ): Promise<AIStructuredResponse<T>> {
    const text = await this.callGemini(prompt, options);
    const parsed = this.extractJson<T>(text.content);
    return {
      data: parsed,
      rawText: text.content,
      provider: this.name,
      model: this.model,
      latencyMs: text.latencyMs,
    };
  }

  /** Call Gemini API with retry logic for 429 errors. */
  private async callGemini(
    prompt: string,
    options?: AIRequestOptions,
  ): Promise<{ content: string; latencyMs: number }> {
    const timeout = options?.timeout ?? this.defaultTimeout;
    const temperature = options?.temperature ?? this.defaultTemperature;
    const maxTokens = options?.maxTokens ?? this.defaultMaxTokens;
    const url = `${BASE_URL}/${this.model}:generateContent?key=${this.apiKey}`;
    const startTime = Date.now();

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        console.log(`[Gemini] Retry ${attempt}/${MAX_RETRIES}...`);
        await delay(RETRY_DELAY_MS * attempt);
      }

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(timeout),
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature, maxOutputTokens: maxTokens },
          }),
        });

        const elapsed = Date.now() - startTime;

        if (response.status === 429 && attempt < MAX_RETRIES) {
          console.warn(`[Gemini] Rate limited (429) after ${elapsed}ms — retrying`);
          continue;
        }

        if (!response.ok) {
          const body = await response.text().catch(() => "(unreadable)");
          if (response.status === 429) {
            throw new AIRequestError("gemini", 429, `Rate limited after ${MAX_RETRIES + 1} attempts`);
          }
          throw new AIRequestError("gemini", response.status, body.slice(0, 300));
        }

        const raw = await response.json();
        const content = this.extractText(raw);

        if (!content) {
          throw new AIRequestError("gemini", response.status, "Empty response text");
        }

        console.log(`[Gemini] Response received in ${elapsed}ms (${content.length} chars)`);
        return { content, latencyMs: elapsed };
      } catch (err) {
        if (err instanceof AIRequestError || err instanceof AITimeoutError) throw err;

        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("TimeoutError") || msg.includes("abort")) {
          throw new AITimeoutError("gemini", timeout);
        }

        if (attempt >= MAX_RETRIES) {
          throw new AIRequestError("gemini", undefined, `Network error: ${msg}`);
        }
        console.warn(`[Gemini] Fetch error on attempt ${attempt + 1}: ${msg} — retrying`);
      }
    }

    throw new AIRequestError("gemini", undefined, "Exhausted all retry attempts");
  }

  /** Extract generated text from Gemini REST response. */
  private extractText(raw: Record<string, unknown>): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const candidates = (raw as any)?.candidates;
    if (!Array.isArray(candidates) || candidates.length === 0) return "";

    const parts = candidates[0]?.content?.parts;
    if (!Array.isArray(parts)) return "";

    return parts.map((p: { text?: string }) => p.text || "").join("");
  }

  /** Extract JSON from text — handles fenced code blocks, raw JSON, etc. */
  private extractJson<T>(text: string): T {
    // Direct parse
    try { return JSON.parse(text) as T; } catch { /* continue */ }

    // Fenced code block
    const fenced = text.match(/```json\s*([\s\S]*?)\s*```/i);
    if (fenced?.[1]) {
      try { return JSON.parse(fenced[1]) as T; } catch { /* continue */ }
    }

    // Extract outermost { ... } or [ ... ]
    for (const [open, close] of [
      ["{", "}"],
      ["[", "]"],
    ]) {
      const start = text.indexOf(open);
      const end = text.lastIndexOf(close);
      if (start !== -1 && end > start) {
        try { return JSON.parse(text.slice(start, end + 1)) as T; } catch { /* continue */ }
      }
    }

    throw new AIParseError(`Could not extract JSON from Gemini response (${text.length} chars)`);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
