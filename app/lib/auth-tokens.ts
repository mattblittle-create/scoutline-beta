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
