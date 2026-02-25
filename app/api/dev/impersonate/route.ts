import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = String(searchParams.get("email") || "").trim().toLowerCase();

  if (!email) {
    return NextResponse.json({ ok: false, error: "Missing ?email=" }, { status: 400 });
  }

  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not allowed in production" }, { status: 403 });
  }

  const res = NextResponse.json({ ok: true, email });

  // Must be readable by server via next/headers cookies()
  res.cookies.set("scoutline_dev_email", email, {
    httpOnly: false,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}
