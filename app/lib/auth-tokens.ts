// lib/auth-tokens.ts
// Lightweight HMAC-signed tokens for email verification & set-password flows.
// No extra deps. Uses APP_SECRET. Works on serverless without DB storage.

import crypto from "node:crypto";

export type TokenType = "verify" | "set-password";

export type EmailTokenPayload = {
  email: string;
  type: TokenType;
  exp: number; // epoch ms
};

// ---- internals ----
function getSecret() {
  const secret = process.env.APP_SECRET;
  if (!secret) {
    throw new Error("APP_SECRET missing. Add APP_SECRET to your environment.");
  }
  return secret;
}

function hmac(input: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(input).digest("base64url");
}

function encode(payload: EmailTokenPayload) {
  const json = JSON.stringify(payload);
  return Buffer.from(json).toString("base64url");
}

function decode<T>(b64: string): T {
  const json = Buffer.from(b64, "base64url").toString("utf8");
  return JSON.parse(json) as T;
}

// ---- public API ----
export function createEmailToken(
  email: string,
  type: TokenType,
  ttlMinutes = 60
): string {
  const exp = Date.now() + ttlMinutes * 60_000;
  const payload: EmailTokenPayload = { email, type, exp };
  const body = encode(payload);
  const sig = hmac(body, getSecret());
  return `${body}.${sig}`;
}

export function verifyEmailToken(token: string): EmailTokenPayload {
  const [body, sig] = token.split(".");
  if (!body || !sig) {
    throw new Error("Malformed token");
  }
  const expected = hmac(body, getSecret());
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    throw new Error("Invalid token signature");
  }
  const payload = decode<EmailTokenPayload>(body);
  if (Date.now() > payload.exp) {
    throw new Error("Token expired");
  }
  return payload;
}

export function buildVerificationLink(token: string) {
  const base = process.env.APP_BASE_URL || "http://localhost:3000";
  // page should read token from ?token=
  return `${base}/verify-email?token=${encodeURIComponent(token)}`;
}

export function buildSetPasswordLink(token: string) {
  const base = process.env.APP_BASE_URL || "http://localhost:3000";
  // page should read token from ?token=
  return `${base}/set-password?token=${encodeURIComponent(token)}`;
}
