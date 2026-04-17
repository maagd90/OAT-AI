/**
 * AI Service layer — the single entry point for all AI operations.
 *
 * Depends only on the AIProvider interface, never on concrete providers.
 * Prompts are passed in from the business layer (no hardcoded prompts here).
 * Provides convenience methods for common operations (parse, itinerary).
 */

import type { AIProvider, AIRequestOptions, AIResponse, AIStructuredResponse } from "./types";
import { AIError } from "./exceptions";

export class AIService {
  private readonly provider: AIProvider;

  constructor(provider: AIProvider) {
    this.provider = provider;
  }

  /** Which provider is active. */
  get providerName(): string {
    return this.provider.name;
  }

  /**
   * Generate a free-text response.
   *
   * @param prompt - The full prompt text (built by the caller).
   * @param options - Optional per-request overrides.
   */
  async generateResponse(prompt: string, options?: AIRequestOptions): Promise<AIResponse> {
    try {
      return await this.provider.generateResponse(prompt, options);
    } catch (err) {
      this.logError("generateResponse", err);
      throw err;
    }
  }

  /**
   * Generate a structured (JSON) response.
   *
   * @param prompt - The full prompt text (should instruct model to output JSON).
   * @param options - Optional per-request overrides.
   */
  async generateStructuredResponse<T = unknown>(
    prompt: string,
    options?: AIRequestOptions,
  ): Promise<AIStructuredResponse<T>> {
    try {
      return await this.provider.generateStructuredResponse<T>(prompt, options);
    } catch (err) {
      this.logError("generateStructuredResponse", err);
      throw err;
    }
  }

  /**
   * Generate a response with graceful fallback.
   * Returns null instead of throwing on AI errors.
   *
   * @param prompt - The full prompt text.
   * @param options - Optional per-request overrides.
   */
  async generateResponseSafe(prompt: string, options?: AIRequestOptions): Promise<AIResponse | null> {
    try {
      return await this.provider.generateResponse(prompt, options);
    } catch (err) {
      this.logError("generateResponseSafe", err);
      return null;
    }
  }

  /**
   * Generate a structured response with graceful fallback.
   * Returns null instead of throwing on AI errors.
   *
   * @param prompt - The full prompt text.
   * @param options - Optional per-request overrides.
   */
  async generateStructuredResponseSafe<T = unknown>(
    prompt: string,
    options?: AIRequestOptions,
  ): Promise<AIStructuredResponse<T> | null> {
    try {
      return await this.provider.generateStructuredResponse<T>(prompt, options);
    } catch (err) {
      this.logError("generateStructuredResponseSafe", err);
      return null;
    }
  }

  /** Log errors without exposing secrets. */
  private logError(method: string, err: unknown): void {
    const msg = err instanceof Error ? err.message : String(err);
    const name = err instanceof AIError ? err.name : "UnknownError";
    console.error(`[AIService.${method}] ${name}: ${msg}`);
  }
}
