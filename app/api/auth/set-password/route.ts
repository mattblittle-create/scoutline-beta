import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth-tokens";

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

    const email = (payload.email || "").toLowerCase();

    // TODO: hash + save password & mark email verified in your DB
    // e.g. const hashed = await hash(password, 12);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }
}
