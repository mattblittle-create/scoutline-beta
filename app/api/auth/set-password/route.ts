import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth-tokens";
// import { hash } from "bcryptjs"; // recommended for production

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Missing token or password" }, { status: 400 });
    }

    // Enforce the token's purpose (must be an email verification token)
    const payload = verifyToken(token, "verify"); // throws if invalid/expired/purpose mismatch
    const email = payload.email.toLowerCase();

    // TODO: hash the password and persist user in your DB
    // const passwordHash = await hash(password, 12);
    // await db.user.upsert({
    //   where: { email },
    //   update: { passwordHash, emailVerifiedAt: new Date() },
    //   create: { email, passwordHash, emailVerifiedAt: new Date() },
    // });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }
}
