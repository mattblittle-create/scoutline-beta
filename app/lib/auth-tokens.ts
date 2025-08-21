import jwt from "jsonwebtoken";

/**
 * Token payload we issue for email verification and similar flows.
 */
export type VerifyTokenPayload = {
  email: string;
  purpose: "verify"; // add more purposes later if needed
};

/**
 * Create a short-lived email verification token.
 * @param email email address to verify
 * @param ttlSeconds default 30 minutes
 */
export function createEmailVerificationToken(email: string, ttlSeconds = 60 * 30): string {
  const secret = process.env.APP_SECRET;
  if (!secret) throw new Error("APP_SECRET env var is required");

  const payload: VerifyTokenPayload = { email: email.toLowerCase(), purpose: "verify" };
  return jwt.sign(payload, secret, { expiresIn: ttlSeconds });
}

/**
 * Verify a token and (optionally) enforce a specific purpose.
 * Throws if invalid/expired.
 */
export function verifyToken(token: string, expectedPurpose?: VerifyTokenPayload["purpose"]): VerifyTokenPayload {
  const secret = process.env.APP_SECRET;
  if (!secret) throw new Error("APP_SECRET env var is required");

  const decoded = jwt.verify(token, secret);
  if (typeof decoded !== "object" || decoded === null) {
    throw new Error("Invalid token payload");
  }

  const payload = decoded as VerifyTokenPayload;

  if (expectedPurpose && payload.purpose !== expectedPurpose) {
    throw new Error("Invalid token purpose");
  }

  return payload;
}
