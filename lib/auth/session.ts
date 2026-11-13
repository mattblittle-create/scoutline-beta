import { SignJWT, jwtVerify } from "jose";
import { createHash } from "node:crypto";

export const SESSION_COOKIE = "scoutline_uid";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 14;
const issuer = "scoutline";
const audience = "scoutline-session";
function secret() {
  const value = process.env.APP_SECRET;
  if (!value || value.length < 32) throw new Error("APP_SECRET must contain at least 32 characters for secure sessions.");
  return new TextEncoder().encode(value);
}
export function credentialVersion(passwordHash: string | null) {
  return createHash("sha256").update(passwordHash || "").digest("hex");
}
export async function signSessionToken(user: { id: string; passwordHash: string | null }) {
  return new SignJWT({ purpose: "session", version: credentialVersion(user.passwordHash) })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(issuer).setAudience(audience).setSubject(user.id)
    .setIssuedAt().setExpirationTime(Math.floor(Date.now() / 1000) + SESSION_MAX_AGE)
    .sign(secret());
}
export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"], issuer, audience });
    if (payload.purpose !== "session" || !payload.sub || typeof payload.version !== "string" || !payload.exp || !payload.iat) return null;
    return { userId: payload.sub, version: payload.version };
  } catch { return null; }
}
