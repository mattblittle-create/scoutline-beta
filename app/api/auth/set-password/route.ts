// app/api/auth/set-password/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { jwtVerify } from "jose";
import { sha256 } from "@/lib/hash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  token?: string;
  password?: string;
};

function getSecret(): Uint8Array {
  const secret = process.env.APP_SECRET;
  if (!secret) throw new Error("Missing APP_SECRET");
  return new TextEncoder().encode(secret);
}

export async function POST(req: Request) {
  try {
    const { token, password } = (await req.json()) as Body;
    if (!token || typeof token !== "string") {
      return NextResponse.json({ ok: false, error: "Missing token" }, { status: 400 });
    }
    if (!password || password.length < 8) {
      return NextResponse.json(
        { ok: false, error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // 1) Verify JWT (integrity/expiry/purpose/email)
    let email: string | undefined;
    let purpose: string | undefined;
    try {
      const { payload } = await jwtVerify(token, getSecret());
      email = String(payload.email || "");
      purpose = String(payload.purpose || "");
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid or expired token" }, { status: 400 });
    }
    if (!email) return NextResponse.json({ ok: false, error: "Missing email in token" }, { status: 400 });
    if (purpose !== "set-password") {
      return NextResponse.json({ ok: false, error: "Invalid token purpose" }, { status: 400 });
    }

    // 2) Enforce single-use via DB row
    const tokenHash = sha256(token);
    const vt = await prisma.verificationToken.findFirst({
      where: {
        tokenHash,
        purpose: "SET_PASSWORD",
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!vt) {
      return NextResponse.json(
        { ok: false, error: "Token already used or expired" },
        { status: 400 }
      );
    }

    // 3) Hash password & upsert user
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.upsert({
      where: { email },
      create: { email, passwordHash },
      update: { passwordHash },
    });

    // 4) Mark this token consumed (and optionally invalidate any siblings for same email/purpose)
    await prisma.$transaction([
      prisma.verificationToken.update({
        where: { id: vt.id },
        data: { consumedAt: new Date() },
      }),
      // Optional: nuke other outstanding tokens for same email/purpose to be safer
      prisma.verificationToken.updateMany({
        where: {
          email,
          purpose: "SET_PASSWORD",
          consumedAt: null,
          id: { not: vt.id },
        },
        data: { consumedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("set-password error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
