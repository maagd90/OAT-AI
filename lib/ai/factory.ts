/**
 * Factory that creates AIProvider instances based on configuration.
 *
 * Reads ai.provider from AIConfig and instantiates the corresponding
 * provider class. New providers are added here without changing business logic.
 * Caches the singleton provider instance.
 */

import type { AIProvider, AIConfig } from "./types";
import { UnsupportedProviderError } from "./exceptions";
import { getAIConfig } from "./config";
import { GeminiProvider } from "./providers/gemini";
import { OpenAIProvider } from "./providers/openai";

let cachedProvider: AIProvider | null = null;
let cachedProviderType: string | null = null;

/**
 * Create an AIProvider for the given configuration.
 *
 * @param config - Full AIConfig (provider type + credentials + defaults).
 * @returns A concrete AIProvider implementation.
 * @throws UnsupportedProviderError if the provider is not recognized.
 */
export function createProvider(config: AIConfig): AIProvider {
  switch (config.provider) {
    case "gemini":
      return new GeminiProvider(config);
    case "openai":
      return new OpenAIProvider(config);
    default:
      throw new UnsupportedProviderError(config.provider);
  }
}

/**
 * Get the singleton AIProvider instance.
 *
 * On first call, reads AIConfig and creates the appropriate provider.
 * Subsequent calls return the cached instance.
 *
 * @param forceReload - Recreate provider (e.g. after config change).
 * @throws MissingAPIKeyError if the selected provider has no API key.
 * @throws UnsupportedProviderError if the provider is not recognized.
 */
export function getAIProvider(forceReload = false): AIProvider {
  const config = getAIConfig(forceReload);

  if (cachedProvider && cachedProviderType === config.provider && !forceReload) {
    return cachedProvider;
  }

  cachedProvider = createProvider(config);
  cachedProviderType = config.provider;

  console.log(`[AIProviderFactory] Created ${config.provider} provider`);
  return cachedProvider;
}

/**
 * Try to get the singleton AIProvider. Returns null if config is invalid
 * (missing key, unsupported provider). Useful for optional AI features.
 */
export function getAIProviderSafe(): AIProvider | null {
  try {
    return getAIProvider();
  } catch (err) {
    console.warn(`[AIProviderFactory] ${(err as Error).message}`);
    return null;
  }
}

/** Reset cached provider (useful in tests). */
export function resetProviderCache(): void {
  cachedProvider = null;
  cachedProviderType = null;
}
