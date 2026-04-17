/**
 * Core types and interfaces for the provider-agnostic AI integration module.
 * All provider implementations conform to the AIProvider interface.
 */

/** Supported AI provider identifiers. */
export type AIProviderType = "gemini" | "openai";

/** Configuration for a single AI request. Overrides global defaults per-call. */
export interface AIRequestOptions {
  /** Model temperature (0.0–2.0). Lower = more deterministic. */
  temperature?: number;
  /** Maximum tokens in the response. */
  maxTokens?: number;
  /** Timeout in milliseconds. */
  timeout?: number;
}

/** Raw text response from an AI provider. */
export interface AIResponse {
  /** The generated text content. */
  text: string;
  /** Which provider produced this response. */
  provider: AIProviderType;
  /** Which model was used. */
  model: string;
  /** Latency in milliseconds. */
  latencyMs: number;
}

/** Structured (JSON-parsed) response from an AI provider. */
export interface AIStructuredResponse<T = unknown> {
  /** The parsed data. */
  data: T;
  /** The raw text before parsing. */
  rawText: string;
  /** Which provider produced this response. */
  provider: AIProviderType;
  /** Which model was used. */
  model: string;
  /** Latency in milliseconds. */
  latencyMs: number;
}

/**
 * Common interface that all AI providers must implement.
 * Business logic depends only on this interface — never on concrete providers.
 */
export interface AIProvider {
  /** Human-readable provider name. */
  readonly name: AIProviderType;

  /**
   * Generate a free-text response from the given prompt.
   * @param prompt - The prompt text.
   * @param options - Optional per-request overrides.
   */
  generateResponse(prompt: string, options?: AIRequestOptions): Promise<AIResponse>;

  /**
   * Generate a response and parse it as JSON of type T.
   * @param prompt - The prompt text (should instruct the model to output JSON).
   * @param options - Optional per-request overrides.
   */
  generateStructuredResponse<T = unknown>(prompt: string, options?: AIRequestOptions): Promise<AIStructuredResponse<T>>;
}

/** Global AI configuration read from properties / environment. */
export interface AIConfig {
  /** Which provider to use. */
  provider: AIProviderType;
  /** Default timeout in ms. */
  timeout: number;
  /** Default temperature. */
  temperature: number;
  /** Default max tokens. */
  maxTokens: number;

  /** Gemini-specific settings. */
  gemini: {
    model: string;
    apiKey: string;
  };

  /** OpenAI-specific settings. */
  openai: {
    model: string;
    apiKey: string;
  };
}
