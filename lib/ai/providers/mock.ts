/**
 * Mock AI provider for unit testing.
 *
 * Returns configurable canned responses without making any network calls.
 * Implements the full AIProvider interface so it can be injected anywhere.
 */

import type { AIProvider, AIRequestOptions, AIResponse, AIStructuredResponse } from "../types";

export interface MockProviderOptions {
  /** Canned text response. Default: '{"mock":true}'. */
  responseText?: string;
  /** Simulated latency in ms. Default: 10. */
  latencyMs?: number;
  /** If set, the provider will throw this error instead of returning. */
  throwError?: Error;
}

export class MockProvider implements AIProvider {
  readonly name = "gemini" as const; // impersonates gemini by default

  private responseText: string;
  private latencyMs: number;
  private throwError?: Error;

  /** Track all prompts received for test assertions. */
  readonly calls: Array<{ prompt: string; options?: AIRequestOptions }> = [];

  constructor(opts?: MockProviderOptions) {
    this.responseText = opts?.responseText ?? '{"mock":true}';
    this.latencyMs = opts?.latencyMs ?? 10;
    this.throwError = opts?.throwError;
  }

  /** Update the canned response between calls. */
  setResponse(text: string): void {
    this.responseText = text;
  }

  /** Configure the mock to throw on next call. */
  setError(err: Error): void {
    this.throwError = err;
  }

  /** Clear recorded calls. */
  reset(): void {
    this.calls.length = 0;
    this.throwError = undefined;
  }

  async generateResponse(prompt: string, options?: AIRequestOptions): Promise<AIResponse> {
    this.calls.push({ prompt, options });
    if (this.throwError) throw this.throwError;
    await delay(this.latencyMs);
    return {
      text: this.responseText,
      provider: this.name,
      model: "mock-model",
      latencyMs: this.latencyMs,
    };
  }

  async generateStructuredResponse<T = unknown>(
    prompt: string,
    options?: AIRequestOptions,
  ): Promise<AIStructuredResponse<T>> {
    this.calls.push({ prompt, options });
    if (this.throwError) throw this.throwError;
    await delay(this.latencyMs);
    return {
      data: JSON.parse(this.responseText) as T,
      rawText: this.responseText,
      provider: this.name,
      model: "mock-model",
      latencyMs: this.latencyMs,
    };
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
