// lib/hash.ts
import crypto from "crypto";

/**
 * Returns hex-encoded SHA-256 of the input string.
 * Used for verification tokens (set-password, reset-password, etc.)
 */
export function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}
