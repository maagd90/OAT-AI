/**
 * AI Integration Module — barrel export.
 *
 * Provides a clean, single-import entry point for the entire AI module.
 *
 * Usage:
 *   import { getAIService, AIService } from "@/lib/ai";
 *   const ai = getAIService();
 *   const response = await ai.generateResponse("...");
 */

// Core types
export type {
  AIProvider,
  AIProviderType,
  AIRequestOptions,
  AIResponse,
  AIStructuredResponse,
  AIConfig,
} from "./types";

// Exceptions
export {
  AIError,
  UnsupportedProviderError,
  MissingAPIKeyError,
  DecryptionError,
  AIRequestError,
  AIParseError,
  AITimeoutError,
} from "./exceptions";

// Crypto / secret management
export { encrypt, decrypt, isEncrypted, resolveApiKey } from "./crypto";

// Configuration
export { getAIConfig, getAIConfigSafe, resetAIConfigCache } from "./config";

// Factory
export { createProvider, getAIProvider, getAIProviderSafe, resetProviderCache } from "./factory";

// Service
export { AIService } from "./service";

// Providers (for direct use or testing)
export { GeminiProvider } from "./providers/gemini";
export { OpenAIProvider } from "./providers/openai";
export { MockProvider } from "./providers/mock";

// ─── Singleton convenience ───────────────────────────────────────────

import { AIService } from "./service";
import { getAIProviderSafe } from "./factory";

let cachedService: AIService | null = null;

/**
 * Get the singleton AIService instance.
 * Returns null if no provider can be created (missing key, etc.).
 * Safe for optional AI features that should degrade gracefully.
 */
export function getAIService(): AIService | null {
  if (cachedService) return cachedService;

  const provider = getAIProviderSafe();
  if (!provider) return null;

  cachedService = new AIService(provider);
  return cachedService;
}

/** Reset singleton (useful in tests). */
export function resetAIService(): void {
  cachedService = null;
}
