/**
 * OpenAI provider implementation.
 *
 * Uses the OpenAI Chat Completions API (api.openai.com/v1/chat/completions).
 * Supports both free-text and structured (JSON) responses.
 * Includes retry logic for 429 rate-limit errors.
 */

import type { AIProvider, AIRequestOptions, AIResponse, AIStructuredResponse, AIConfig } from "../types";
import { AIRequestError, AIParseError, AITimeoutError } from "../exceptions";

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2_000;
const BASE_URL = "https://api.openai.com/v1/chat/completions";

export class OpenAIProvider implements AIProvider {
  readonly name = "openai" as const;

  private readonly model: string;
  private readonly apiKey: string;
  private readonly defaultTimeout: number;
  private readonly defaultTemperature: number;
  private readonly defaultMaxTokens: number;

  constructor(config: AIConfig) {
    this.model = config.openai.model;
    this.apiKey = config.openai.apiKey;
    this.defaultTimeout = config.timeout;
    this.defaultTemperature = config.temperature;
    this.defaultMaxTokens = config.maxTokens;
  }

  /** @inheritdoc */
  async generateResponse(prompt: string, options?: AIRequestOptions): Promise<AIResponse> {
    const result = await this.callOpenAI(prompt, options);
    return {
      text: result.content,
      provider: this.name,
      model: this.model,
      latencyMs: result.latencyMs,
    };
  }

  /** @inheritdoc */
  async generateStructuredResponse<T = unknown>(
    prompt: string,
    options?: AIRequestOptions,
  ): Promise<AIStructuredResponse<T>> {
    const result = await this.callOpenAI(prompt, options);
    const parsed = this.extractJson<T>(result.content);
    return {
      data: parsed,
      rawText: result.content,
      provider: this.name,
      model: this.model,
      latencyMs: result.latencyMs,
    };
  }

  /** Call OpenAI Chat Completions API with retry logic. */
  private async callOpenAI(
    prompt: string,
    options?: AIRequestOptions,
  ): Promise<{ content: string; latencyMs: number }> {
    const timeout = options?.timeout ?? this.defaultTimeout;
    const temperature = options?.temperature ?? this.defaultTemperature;
    const maxTokens = options?.maxTokens ?? this.defaultMaxTokens;
    const startTime = Date.now();

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        console.log(`[OpenAI] Retry ${attempt}/${MAX_RETRIES}...`);
        await delay(RETRY_DELAY_MS * attempt);
      }

      try {
        const response = await fetch(BASE_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.apiKey}`,
          },
          signal: AbortSignal.timeout(timeout),
          body: JSON.stringify({
            model: this.model,
            messages: [{ role: "user", content: prompt }],
            temperature,
            max_tokens: maxTokens,
          }),
        });

        const elapsed = Date.now() - startTime;

        if (response.status === 429 && attempt < MAX_RETRIES) {
          console.warn(`[OpenAI] Rate limited (429) after ${elapsed}ms — retrying`);
          continue;
        }

        if (!response.ok) {
          const body = await response.text().catch(() => "(unreadable)");
          if (response.status === 429) {
            throw new AIRequestError("openai", 429, `Rate limited after ${MAX_RETRIES + 1} attempts`);
          }
          throw new AIRequestError("openai", response.status, body.slice(0, 300));
        }

        const raw = await response.json();
        const content = this.extractContent(raw);

        if (!content) {
          throw new AIRequestError("openai", response.status, "Empty response content");
        }

        console.log(`[OpenAI] Response received in ${elapsed}ms (${content.length} chars)`);
        return { content, latencyMs: elapsed };
      } catch (err) {
        if (err instanceof AIRequestError || err instanceof AITimeoutError) throw err;

        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("TimeoutError") || msg.includes("abort")) {
          throw new AITimeoutError("openai", timeout);
        }

        if (attempt >= MAX_RETRIES) {
          throw new AIRequestError("openai", undefined, `Network error: ${msg}`);
        }
        console.warn(`[OpenAI] Fetch error on attempt ${attempt + 1}: ${msg} — retrying`);
      }
    }

    throw new AIRequestError("openai", undefined, "Exhausted all retry attempts");
  }

  /** Extract message content from OpenAI Chat Completions response. */
  private extractContent(raw: Record<string, unknown>): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const choices = (raw as any)?.choices;
    if (!Array.isArray(choices) || choices.length === 0) return "";
    return choices[0]?.message?.content || "";
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

    throw new AIParseError(`Could not extract JSON from OpenAI response (${text.length} chars)`);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
