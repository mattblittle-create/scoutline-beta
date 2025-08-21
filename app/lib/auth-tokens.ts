// /lib/auth-tokens.ts
import { SignJWT, jwtVerify } from "jose";

const APP_SECRET = process.env.APP_SECRET || "dev-only-secret-change-me";
const ISSUER = process.env.JWT_ISSUER || "scoutline";

function getKey() {
  // jose accepts Uint8Array for HS256
  return new TextEncoder().encode(APP_SECRET);
}

type BasePayload = {
  purpose: "email-verify" | string;
  email: string;
};

export function signVerifyToken(
  email: string,
  expiresIn: string = "30m" // jose supports time spans like "30m", "1h"
): string {
  return new SignJWT({ purpose: "email-verify", email } satisfies BasePayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getKey());
}

export async function verifyToken<T = Record<string, unknown>>(token: string): Promise<T> {
  const { payload } = await jwtVerify(token, getKey(), { issuer: ISSUER });
  return payload as T;
}
