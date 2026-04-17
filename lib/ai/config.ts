/**
 * AI Configuration loader.
 *
 * Reads settings from `config/ai.properties` and environment variables.
 * Resolves API keys via SecretDecryptor (encrypted props → env var fallback).
 * Cached as a singleton after first load.
 */

import fs from "node:fs";
import path from "node:path";
import type { AIConfig, AIProviderType } from "./types";
import { resolveApiKey } from "./crypto";
import { MissingAPIKeyError, UnsupportedProviderError } from "./exceptions";

const SUPPORTED_PROVIDERS: AIProviderType[] = ["gemini", "openai"];

/** Default configuration values. */
const DEFAULTS = {
  provider: "gemini" as AIProviderType,
  timeout: 30_000,
  temperature: 0.7,
  maxTokens: 2000,
  geminiModel: "gemini-2.0-flash",
  openaiModel: "gpt-4o-mini",
};

let cached: AIConfig | null = null;

/** Parse a Java-style .properties file into a key-value map. */
function parseProperties(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx <= 0) continue;
    out[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
  }
  return out;
}

function toNumber(val: string | undefined, fallback: number): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeProvider(val: string | undefined): AIProviderType {
  const lower = (val || "").toLowerCase().trim();
  if (SUPPORTED_PROVIDERS.includes(lower as AIProviderType)) {
    return lower as AIProviderType;
  }
  if (val) {
    throw new UnsupportedProviderError(val);
  }
  return DEFAULTS.provider;
}

/**
 * Load AI configuration. Reads `config/ai.properties`, merges with env vars,
 * resolves API keys, and caches the result.
 *
 * @param forceReload - Skip cache and re-read from disk.
 * @throws UnsupportedProviderError if an unknown provider is specified.
 * @throws MissingAPIKeyError if the selected provider has no API key.
 */
export function getAIConfig(forceReload = false): AIConfig {
  if (cached && !forceReload) return cached;

  const propsPath = path.join(process.cwd(), "config", "ai.properties");
  let props: Record<string, string> = {};

  try {
    const raw = fs.readFileSync(propsPath, "utf8");
    props = parseProperties(raw);
  } catch {
    // File missing is fine — defaults + env vars will be used.
    console.warn("[AIConfig] config/ai.properties not found — using defaults and env vars");
  }

  const provider = normalizeProvider(props["ai.provider"] || process.env.AI_PROVIDER);

  // Resolve API keys via encrypted property → env var fallback
  const geminiKey = resolveApiKey(props["ai.gemini.api.key.enc"], "GEMINI_API_KEY");
  const openaiKey = resolveApiKey(props["ai.openai.api.key.enc"], "OPENAI_API_KEY");

  // Validate that the selected provider has a key
  if (provider === "gemini" && !geminiKey) {
    throw new MissingAPIKeyError("gemini");
  }
  if (provider === "openai" && !openaiKey) {
    throw new MissingAPIKeyError("openai");
  }

  cached = {
    provider,
    timeout: toNumber(props["ai.timeout"], DEFAULTS.timeout),
    temperature: toNumber(props["ai.temperature"], DEFAULTS.temperature),
    maxTokens: toNumber(props["ai.maxTokens"], DEFAULTS.maxTokens),
    gemini: {
      model: props["ai.gemini.model"] || DEFAULTS.geminiModel,
      apiKey: geminiKey || "",
    },
    openai: {
      model: props["ai.openai.model"] || DEFAULTS.openaiModel,
      apiKey: openaiKey || "",
    },
  };

  console.log(
    `[AIConfig] Loaded: provider=${cached.provider}, model=${
      cached.provider === "gemini" ? cached.gemini.model : cached.openai.model
    }, timeout=${cached.timeout}ms`
  );

  return cached;
}

/**
 * Try to load AI config. Returns null instead of throwing if a key is missing.
 * Useful for optional AI features that should degrade gracefully.
 */
export function getAIConfigSafe(): AIConfig | null {
  try {
    return getAIConfig();
  } catch (err) {
    if (err instanceof MissingAPIKeyError || err instanceof UnsupportedProviderError) {
      console.warn(`[AIConfig] ${(err as Error).message}`);
      return null;
    }
    throw err;
  }
}

/** Reset cached config (useful in tests). */
export function resetAIConfigCache(): void {
  cached = null;
}
