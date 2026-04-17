/**
 * AES-256-GCM encryption/decryption utility for API keys.
 *
 * Encrypted values are stored as `ENC(base64)` in properties files.
 * The base64 payload is: iv (12 bytes) + authTag (16 bytes) + ciphertext.
 * The master secret comes exclusively from the AI_MASTER_SECRET environment variable.
 *
 * For local development, plain-text env vars (GEMINI_API_KEY, OPENAI_API_KEY) are
 * supported as fallback — see AIConfiguration.
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";
import { DecryptionError } from "./exceptions";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const ENC_PREFIX = "ENC(";
const ENC_SUFFIX = ")";

/**
 * Derive a 256-bit key from the master secret using SHA-256.
 * This keeps the API simple — the caller provides any-length passphrase.
 */
function deriveKey(masterSecret: string): Buffer {
  return createHash("sha256").update(masterSecret).digest();
}

/**
 * Check whether a property value is wrapped in ENC(...).
 * @param value - The raw property string.
 */
export function isEncrypted(value: string | undefined): boolean {
  return !!value && value.startsWith(ENC_PREFIX) && value.endsWith(ENC_SUFFIX);
}

/**
 * Encrypt a plain-text value with AES-256-GCM.
 * Returns an `ENC(base64)` string suitable for storing in properties files.
 *
 * @param plainText - The secret to encrypt.
 * @param masterSecret - The master passphrase (from AI_MASTER_SECRET env).
 */
export function encrypt(plainText: string, masterSecret: string): string {
  const key = deriveKey(masterSecret);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Pack: iv + authTag + ciphertext
  const payload = Buffer.concat([iv, authTag, encrypted]);
  return `${ENC_PREFIX}${payload.toString("base64")}${ENC_SUFFIX}`;
}

/**
 * Decrypt an `ENC(base64)` value back to plain text.
 *
 * @param encValue - The `ENC(...)` wrapped value from properties.
 * @param masterSecret - The master passphrase (from AI_MASTER_SECRET env).
 * @throws DecryptionError if the value format is invalid or decryption fails.
 */
export function decrypt(encValue: string, masterSecret: string): string {
  if (!isEncrypted(encValue)) {
    throw new DecryptionError("Value is not in ENC(...) format");
  }

  const base64 = encValue.slice(ENC_PREFIX.length, -ENC_SUFFIX.length);
  let payload: Buffer;
  try {
    payload = Buffer.from(base64, "base64");
  } catch {
    throw new DecryptionError("Invalid base64 in ENC(...) wrapper");
  }

  if (payload.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new DecryptionError("Encrypted payload too short");
  }

  const iv = payload.subarray(0, IV_LENGTH);
  const authTag = payload.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = payload.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  try {
    const key = deriveKey(masterSecret);
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString("utf8");
  } catch (err) {
    throw new DecryptionError(
      err instanceof Error ? err.message : "Decryption failed — wrong master secret?"
    );
  }
}

/**
 * Resolve an API key from encrypted property, falling back to plain env var.
 *
 * Resolution order:
 * 1. If `encryptedValue` is set and AI_MASTER_SECRET is available → decrypt.
 * 2. If `envVarName` is set in environment → use it directly (dev mode).
 * 3. Return undefined (caller decides whether to throw).
 *
 * @param encryptedValue - The `ENC(...)` value from ai.properties (may be undefined).
 * @param envVarName - Fallback environment variable name (e.g. "GEMINI_API_KEY").
 */
export function resolveApiKey(
  encryptedValue: string | undefined,
  envVarName: string,
): string | undefined {
  // 1. Try encrypted property + master secret
  if (isEncrypted(encryptedValue)) {
    const masterSecret = process.env.AI_MASTER_SECRET;
    if (masterSecret) {
      return decrypt(encryptedValue!, masterSecret);
    }
    console.warn(
      `[SecretDecryptor] Encrypted key found but AI_MASTER_SECRET not set — falling back to env var ${envVarName}`
    );
  }

  // 2. Fallback to plain environment variable (local dev)
  const envValue = process.env[envVarName];
  if (envValue) {
    return envValue;
  }

  // 3. Not available
  return undefined;
}
