import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth-tokens";
// import { hash } from "bcryptjs"; // optional now; recommended in production

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();
    if (!token || !password) {
      return NextResponse.json({ error: "Missing token or password" }, { status: 400 });
    }

    const payload = verifyToken<{ email: string; purpose: string }>(token);
    if (payload.purpose !== "email-verify") {
      return NextResponse.json({ error: "Invalid token purpose" }, { status: 400 });
    }

    const email = payload.email.toLowerCase();

    // TODO: hash password before saving
    // const hashed = await hash(password, 12);

    // TODO: upsert user in your DB with this email and password
    // await db.user.update({ where: { email }, data: { passwordHash: hashed, emailVerifiedAt: new Date() } });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }
}
