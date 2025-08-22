// app/api/auth/set-password/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Body = { token: string; password: string };

export async function POST(req: Request) {
  try {
    const { token, password } = (await req.json()) as Body;
    if (!token || typeof token !== "string") {
      return NextResponse.json({ ok: false, error: "Missing token" }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json({ ok: false, error: "Password too short" }, { status: 400 });
    }

    const secretB64 = process.env.APP_SECRET;
    if (!secretB64) {
      return NextResponse.json({ ok: false, error: "Missing APP_SECRET" }, { status: 500 });
    }
    const secret = Buffer.from(secretB64, "base64url");

    const { jwtVerify } = await import("jose");
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    const email = String(payload.email || "").toLowerCase();
    const purpose = payload.purpose;

    if (purpose !== "set-password") {
      return NextResponse.json({ ok: false, error: "Invalid token purpose" }, { status: 400 });
    }

    // TODO: hash & store password for user `email`
    // Example placeholder:
    // const hash = await bcrypt.hash(password, 12);
    // await db.user.update({ where: { email }, data: { passwordHash: hash } });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("set-password error:", err);
    // jose throws specific errors for bad/expired tokens:
    // return 400 so the client can prompt for a new email link
    return NextResponse.json({ ok: false, error: err?.message || "Bad token" }, { status: 400 });
  }
}
