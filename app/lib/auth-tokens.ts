import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET!;
if (!SECRET) throw new Error("JWT_SECRET env var is required");

type Payload = { email: string; purpose: "email-verify" | "set-password" };

export function signVerifyToken(email: string, expiresIn = "30m") {
  const payload: Payload = { email, purpose: "email-verify" };
  return jwt.sign(payload, SECRET, { expiresIn });
}

export function verifyToken<T = Payload>(token: string): T {
  return jwt.verify(token, SECRET) as T;
}
import crypto from "crypto";

const DEFAULT_TTL_SECONDS = 60 * 60 * 24; // 24h
const ALG = "sha256";

/**
 * Creates a compact HMAC token with embedded payload.
 * format: base64url(JSON).base64url(HMAC)
 */
export function createEmailVerificationToken(
  email: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    email,
    type: "verify" as const,
    iat: now,
    exp: now + ttlSeconds,
  };
  const body = base64url(Buffer.from(JSON.stringify(payload)));
  const sig = sign(body);
  return `${body}.${sig}`;
}

export function verifyEmailVerificationToken(token: string): { email: string } {
  const [body, sig] = token.split(".");
  if (!body || !sig) throw new Error("Malformed token");

  const expected = sign(body);
  if (!timingSafeEq(sig, expected)) throw new Error("Invalid signature");

  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
    email: string;
    type: "verify";
    iat: number;
    exp: number;
  };

  if (payload.type !== "verify") throw new Error("Wrong token type");
  const now = Math.floor(Date.now() / 1000);
  if (now > payload.exp) throw new Error("Token expired");

  return { email: payload.email };
}

function sign(bodyBase64Url: string): string {
  const secret = process.env.EMAIL_VERIFICATION_SECRET;
  if (!secret) throw new Error("EMAIL_VERIFICATION_SECRET not set");
  return crypto.createHmac(ALG, secret).update(bodyBase64Url).digest("base64url");
}

function base64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function timingSafeEq(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
