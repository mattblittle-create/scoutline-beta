// app/api/dev/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const UID_COOKIE = "scoutline_uid";
const DEV_EMAIL_COOKIE = "scoutline_dev_email";

function normalizeEmail(v: string) {
  return String(v || "").trim().toLowerCase();
}

function isDevAuthEnabled() {
  return (process.env.DEV_AUTH_ENABLED || "").trim().toLowerCase() === "true";
}

export async function POST(req: NextRequest) {
  // Hard stop unless explicitly enabled in local dev
  if (process.env.NODE_ENV === "production" || !isDevAuthEnabled()) {
    return NextResponse.json({ error: "Dev login is disabled." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const email = normalizeEmail(body?.email || process.env.DEV_USER_EMAIL || "");

  if (!email) {
    return NextResponse.json({ error: "Missing email." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  if (!user?.id) {
    return NextResponse.json(
      { error: "No matching user found for dev login." },
      { status: 404 }
    );
  }

  const res = NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email },
  });

  res.cookies.set(UID_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
  });

  res.cookies.set(DEV_EMAIL_COOKIE, user.email, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
  });

  return res;
}