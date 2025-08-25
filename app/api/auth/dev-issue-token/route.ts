import { NextResponse } from "next/server";
import { SignJWT } from "jose";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    // 🔒 Dev guard: only allow in development OR with a shared secret header
    const devAllowed =
      process.env.NODE_ENV === "development" ||
      (process.env.DEV_ISSUE_TOKEN_SECRET &&
        req.headers.get("x-dev-issue-secret") === process.env.DEV_ISSUE_TOKEN_SECRET);

    if (!devAllowed) {
      return NextResponse.json({ ok: false, error: "Disabled in this environment" }, { status: 403 });
    }

    const { email, purpose } = await req.json().catch(() => ({} as any));
    if (!email) {
      return NextResponse.json({ ok: false, error: "Missing email" }, { status: 400 });
    }

    // Default to set-password unless caller specifies otherwise
    const tokenPurpose = (purpose as string) || "set-password";

    const secret = process.env.APP_SECRET;
    if (!secret) {
      return NextResponse.json({ ok: false, error: "Missing APP_SECRET" }, { status: 500 });
    }

    const jwt = await new SignJWT({ email, purpose: tokenPurpose })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(secret));

    return NextResponse.json({ ok: true, token: jwt });
  } catch (err: any) {
    console.error("dev-issue-token error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
