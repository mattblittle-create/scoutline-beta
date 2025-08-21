// /app/api/auth/set-password/route.ts
import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth-tokens";
// import { hash } from "bcryptjs"; // recommended in production

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();
    if (!token || !password) {
      return NextResponse.json({ error: "Missing token or password" }, { status: 400 });
    }

    const payload = await verifyToken<{ email: string; purpose: string }>(token);
    if (payload.purpose !== "email-verify") {
      return NextResponse.json({ error: "Invalid token purpose" }, { status: 400 });
    }

    const email = payload.email.toLowerCase();

    // TODO: hash and store password, mark emailVerifiedAt
    // const hashed = await hash(password, 12);
    // await db.user.upsert({ ... });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }
}
