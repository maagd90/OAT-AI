/**
 * Unit tests for the AI integration module.
 *
 * Run: npx vitest run lib/ai/__tests__/
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MockProvider } from "../providers/mock";
import { AIService } from "../service";
import { createProvider, resetProviderCache } from "../factory";
import {
  encrypt,
  decrypt,
  isEncrypted,
  resolveApiKey,
} from "../crypto";
import {
  UnsupportedProviderError,
  MissingAPIKeyError,
  AIRequestError,
  AIParseError,
} from "../exceptions";
import type { AIConfig } from "../types";

// ─── Helpers ───────────────────────────────────────────────────────

function makeConfig(overrides?: Partial<AIConfig>): AIConfig {
  return {
    provider: "gemini",
    timeout: 30_000,
    temperature: 0.7,
    maxTokens: 2000,
    gemini: { model: "gemini-2.0-flash", apiKey: "test-gemini-key" },
    openai: { model: "gpt-4o-mini", apiKey: "test-openai-key" },
    ...overrides,
  };
}

// ─── MockProvider Tests ────────────────────────────────────────────

describe("MockProvider", () => {
  let mock: MockProvider;

  beforeEach(() => {
    mock = new MockProvider({ responseText: '{"city":"Paris"}' });
  });

  it("returns canned text response", async () => {
    const res = await mock.generateResponse("test prompt");
    expect(res.text).toBe('{"city":"Paris"}');
    expect(res.provider).toBe("gemini");
    expect(res.model).toBe("mock-model");
  });

  it("returns canned structured response", async () => {
    const res = await mock.generateStructuredResponse<{ city: string }>("test prompt");
    expect(res.data.city).toBe("Paris");
    expect(res.rawText).toBe('{"city":"Paris"}');
  });

  it("records all calls", async () => {
    await mock.generateResponse("prompt 1");
    await mock.generateResponse("prompt 2", { temperature: 0.5 });
    expect(mock.calls).toHaveLength(2);
    expect(mock.calls[0].prompt).toBe("prompt 1");
    expect(mock.calls[1].options?.temperature).toBe(0.5);
  });

  it("throws configured error", async () => {
    mock.setError(new AIRequestError("gemini", 500, "Server error"));
    await expect(mock.generateResponse("test")).rejects.toThrow("Server error");
  });

  it("updates response between calls", async () => {
    mock.setResponse('{"city":"London"}');
    const res = await mock.generateStructuredResponse<{ city: string }>("test");
    expect(res.data.city).toBe("London");
  });

  it("reset clears calls and error", async () => {
    mock.setError(new Error("boom"));
    mock.calls.push({ prompt: "x" });
    mock.reset();
    expect(mock.calls).toHaveLength(0);
    const res = await mock.generateResponse("test");
    expect(res.text).toBe('{"city":"Paris"}');
  });
});

// ─── AIService Tests ───────────────────────────────────────────────

describe("AIService", () => {
  let mock: MockProvider;
  let service: AIService;

  beforeEach(() => {
    mock = new MockProvider({ responseText: '{"days":[]}' });
    service = new AIService(mock);
  });

  it("delegates generateResponse to provider", async () => {
    const res = await service.generateResponse("build itinerary");
    expect(res.text).toBe('{"days":[]}');
    expect(mock.calls).toHaveLength(1);
    expect(mock.calls[0].prompt).toBe("build itinerary");
  });

  it("delegates generateStructuredResponse to provider", async () => {
    const res = await service.generateStructuredResponse<{ days: unknown[] }>("test");
    expect(res.data.days).toEqual([]);
  });

  it("generateResponseSafe returns null on error", async () => {
    mock.setError(new AIRequestError("gemini", 500, "fail"));
    const res = await service.generateResponseSafe("test");
    expect(res).toBeNull();
  });

  it("generateStructuredResponseSafe returns null on error", async () => {
    mock.setError(new AIRequestError("gemini", 500, "fail"));
    const res = await service.generateStructuredResponseSafe("test");
    expect(res).toBeNull();
  });

  it("exposes provider name", () => {
    expect(service.providerName).toBe("gemini");
  });
});

// ─── Factory Tests ─────────────────────────────────────────────────

describe("createProvider", () => {
  beforeEach(() => resetProviderCache());

  it("creates GeminiProvider for gemini config", () => {
    const provider = createProvider(makeConfig({ provider: "gemini" }));
    expect(provider.name).toBe("gemini");
  });

  it("creates OpenAIProvider for openai config", () => {
    const provider = createProvider(makeConfig({ provider: "openai" }));
    expect(provider.name).toBe("openai");
  });

  it("throws UnsupportedProviderError for unknown provider", () => {
    expect(() =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createProvider(makeConfig({ provider: "anthropic" as any }))
    ).toThrow(UnsupportedProviderError);
  });
});

// ─── Crypto Tests ──────────────────────────────────────────────────

describe("crypto", () => {
  const secret = "my-test-master-secret-123";

  describe("isEncrypted", () => {
    it("returns true for ENC(...) values", () => {
      expect(isEncrypted("ENC(abc123)")).toBe(true);
    });

    it("returns false for plain values", () => {
      expect(isEncrypted("plain-key")).toBe(false);
      expect(isEncrypted(undefined)).toBe(false);
      expect(isEncrypted("")).toBe(false);
    });
  });

  describe("encrypt / decrypt round-trip", () => {
    it("encrypts and decrypts back to original", () => {
      const original = "AIzaSyAuxO7DmtMith3NYjNrgjBBV3IhWDu13Yc";
      const encrypted = encrypt(original, secret);

      expect(encrypted).toMatch(/^ENC\(.+\)$/);
      expect(isEncrypted(encrypted)).toBe(true);

      const decrypted = decrypt(encrypted, secret);
      expect(decrypted).toBe(original);
    });

    it("produces different ciphertexts (random IV)", () => {
      const e1 = encrypt("same-key", secret);
      const e2 = encrypt("same-key", secret);
      expect(e1).not.toBe(e2); // different IVs
      expect(decrypt(e1, secret)).toBe("same-key");
      expect(decrypt(e2, secret)).toBe("same-key");
    });

    it("fails with wrong master secret", () => {
      const encrypted = encrypt("my-api-key", secret);
      expect(() => decrypt(encrypted, "wrong-secret")).toThrow();
    });
  });

  describe("resolveApiKey", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    it("returns undefined when no encrypted value and no env var", () => {
      delete process.env.GEMINI_API_KEY;
      expect(resolveApiKey(undefined, "GEMINI_API_KEY")).toBeUndefined();
    });

    it("falls back to env var when no encrypted value", () => {
      process.env.GEMINI_API_KEY = "env-key-123";
      expect(resolveApiKey(undefined, "GEMINI_API_KEY")).toBe("env-key-123");
    });

    it("decrypts when encrypted value and master secret are present", () => {
      const encrypted = encrypt("decrypted-key", secret);
      process.env.AI_MASTER_SECRET = secret;
      expect(resolveApiKey(encrypted, "GEMINI_API_KEY")).toBe("decrypted-key");
    });

    it("falls back to env var when encrypted value present but no master secret", () => {
      const encrypted = encrypt("decrypted-key", secret);
      delete process.env.AI_MASTER_SECRET;
      process.env.GEMINI_API_KEY = "fallback-key";
      expect(resolveApiKey(encrypted, "GEMINI_API_KEY")).toBe("fallback-key");
    });

    afterEach(() => {
      process.env = originalEnv;
    });
  });
});

// ─── Exception Tests ───────────────────────────────────────────────

describe("exceptions", () => {
  it("UnsupportedProviderError has descriptive message", () => {
    const err = new UnsupportedProviderError("anthropic");
    expect(err.message).toContain("anthropic");
    expect(err.message).toContain("Supported");
    expect(err.name).toBe("UnsupportedProviderError");
  });

  it("MissingAPIKeyError includes provider name", () => {
    const err = new MissingAPIKeyError("openai");
    expect(err.message).toContain("openai");
    expect(err.name).toBe("MissingAPIKeyError");
  });

  it("AIRequestError includes status code", () => {
    const err = new AIRequestError("gemini", 429, "Rate limited");
    expect(err.statusCode).toBe(429);
    expect(err.message).toContain("429");
  });

  it("AIParseError includes detail", () => {
    const err = new AIParseError("invalid json");
    expect(err.message).toContain("invalid json");
  });
});
