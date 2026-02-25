// app/api/dev/login/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeEmail(v: any) {
  return String(v ?? "").trim().toLowerCase();
}

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available in production." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({} as any));
  const email = normalizeEmail(body?.email || process.env.DEV_USER_EMAIL || "");
  if (!email) return NextResponse.json({ ok: false, error: "Missing email." }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
  if (!user) return NextResponse.json({ ok: false, error: "User not found." }, { status: 404 });

  const res = NextResponse.json({ ok: true, data: { id: user.id, email: user.email } });

  // set normal auth cookie for the session
  res.cookies.set("scoutline_uid", user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  // also set dev email cookie (optional convenience)
  res.cookies.set("scoutline_dev_email", user.email, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
  });

  return res;
}
