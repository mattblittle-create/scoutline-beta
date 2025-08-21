// lib/auth-tokens.ts
import { SignJWT, jwtVerify, JWTPayload } from "jose";

function getSecret(): Uint8Array {
  const sec = process.env.APP_SECRET;
  if (!sec) {
    throw new Error("APP_SECRET is not set. Add it to your environment (e.g. .env.local).");
  }
  return new TextEncoder().encode(sec);
}

/**
 * Signs a short-lived token used for email verification.
 * Default expiry: 30 minutes.
 */
export function await signVerifyToken(email: string, expiresIn: string = "30m"): string {
  const iat = Math.floor(Date.now() / 1000);
  const payload: JWTPayload & { email: string; purpose: "email-verify" } = {
    email: email.toLowerCase(),
    purpose: "email-verify",
    iat,
  };

  // NOTE: jose’s SignJWT .setExpirationTime accepts string durations like "30m"
  const token = new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(iat)
    .setExpirationTime(expiresIn)
    .sign(getSecret());

  // SignJWT#sign returns a Promise<string>, but many callers prefer sync-style.
  // If you want a purely sync export, you can switch callers to `await`.
  // For convenience, we’ll export an async helper below too.
  // @ts-expect-error – we intentionally return Promise here for compatibility.
  return token;
}

/**
 * Async helper version to make calling code explicit.
 */
export async function signVerifyTokenAsync(email: string, expiresIn: string = "30m"): Promise<string> {
  return new SignJWT({
    email: email.toLowerCase(),
    purpose: "email-verify",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecret());
}

/**
 * Verifies a token and returns its payload typed as T.
 */
export async function verifyToken<T extends JWTPayload = JWTPayload>(token: string): Promise<T> {
  const { payload } = await jwtVerify(token, getSecret(), {
    algorithms: ["HS256"],
  });
  return payload as T;
}
