/**
 * Custom exception classes for the AI integration module.
 * Each covers a distinct failure mode for clear error handling upstream.
 */

/** Base class for all AI module errors. */
export class AIError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "AIError";
  }
}

/** Thrown when a provider identifier is not recognized. */
export class UnsupportedProviderError extends AIError {
  constructor(provider: string) {
    super(`Unsupported AI provider: "${provider}". Supported: gemini, openai`);
    this.name = "UnsupportedProviderError";
  }
}

/** Thrown when an API key is missing for the selected provider. */
export class MissingAPIKeyError extends AIError {
  constructor(provider: string) {
    super(
      `API key for "${provider}" is not configured. ` +
      `Set it via encrypted property (ai.${provider}.api.key.enc), ` +
      `environment variable (${provider.toUpperCase()}_API_KEY), ` +
      `or AI_MASTER_SECRET for decryption.`
    );
    this.name = "MissingAPIKeyError";
  }
}

/** Thrown when encrypted API key decryption fails. */
export class DecryptionError extends AIError {
  constructor(detail: string) {
    super(`Failed to decrypt API key: ${detail}. Check AI_MASTER_SECRET environment variable.`);
    this.name = "DecryptionError";
  }
}

/** Thrown when the upstream AI API returns an error. */
export class AIRequestError extends AIError {
  constructor(
    provider: string,
    public readonly statusCode: number | undefined,
    detail: string,
  ) {
    super(`AI request to ${provider} failed (HTTP ${statusCode ?? "N/A"}): ${detail}`);
    this.name = "AIRequestError";
  }
}

/** Thrown when the AI response cannot be parsed as expected JSON. */
export class AIParseError extends AIError {
  constructor(detail: string) {
    super(`Failed to parse AI response as JSON: ${detail}`);
    this.name = "AIParseError";
  }
}

/** Thrown when the AI request times out. */
export class AITimeoutError extends AIError {
  constructor(provider: string, timeoutMs: number) {
    super(`AI request to ${provider} timed out after ${timeoutMs}ms`);
    this.name = "AITimeoutError";
  }
}
