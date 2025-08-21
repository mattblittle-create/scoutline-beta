// lib/auth-tokens.ts
// Lightweight HMAC-signed, time-limited tokens (no DB lookup needed)

type Purpose = "verify" | "reset";

export type SignedPayload = {
  email: string;
  purpose: Purpose;
  exp: number; // unix seconds
};

const APP_SECRET = process.env.APP_SECRET || "";
if (!APP_SECRET) {
  // Fail fast in build/runtime if not configured
  // (Vercel: set in Project Settings → Environment Variables)
  throw new Error("Missing APP_SECRET env var");
}

/** base64url helpers */
function b64urlEncode(buffer: Buffer | string) {
  return Buffer.from(buffer)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
function b64urlDecode(str: string) {
  const pad = 4 - (str.length % 4 || 4);
  const base64 = str.replace(/-/g, "+").replace(/_/g, "_") + "=".repeat(pad);
  return Buffer.from(base64, "base64");
}

function sign(data: string) {
  const crypto = require("crypto") as typeof import("crypto");
  return b64urlEncode(
    crypto.createHmac("sha256", APP_SECRET).update(data).digest()
  );
}

/** Create a compact token: payload.signature (both base64url) */
export function createToken(
  payload: Omit<SignedPayload, "exp"> & { ttlSeconds: number }
): string {
  const { email, purpose, ttlSeconds } = payload;
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;

  const toSign: SignedPayload = { email, purpose, exp };
  const body = b64urlEncode(JSON.stringify(toSign));
  const sig = sign(body);
  return `${body}.${sig}`;
}

/** Verify token signature & expiry; optionally enforce purpose */
export function verifyToken(
  token: string,
  expectedPurpose?: Purpose
): SignedPayload {
  const [body, sig] = token.split(".");
  if (!body || !sig) {
    throw new Error("Invalid token format");
  }
  const goodSig = sign(body);
  if (sig !== goodSig) {
    throw new Error("Invalid token signature");
  }

  const payload = JSON.parse(b64urlDecode(body).toString("utf8")) as SignedPayload;

  if (expectedPurpose && payload.purpose !== expectedPurpose) {
    throw new Error("Invalid token purpose");
  }
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    throw new Error("Token expired");
  }
  return payload;
}

/** Convenience creators */
export function createEmailVerificationToken(email: string, ttlSeconds = 60 * 60 * 24) {
  // default: 24h
  return createToken({ email, purpose: "verify", ttlSeconds });
}
export function createPasswordResetToken(email: string, ttlSeconds = 60 * 30) {
  // default: 30m
  return createToken({ email, purpose: "reset", ttlSeconds });
}
