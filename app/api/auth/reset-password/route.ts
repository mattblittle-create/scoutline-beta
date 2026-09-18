// app/api/auth/reset-password/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  consumeVerificationToken,
  findValidVerificationToken,
} from "@/lib/auth/tokens";

type Body = {
  token?: string | null;
  password?: string | null;
};

function normalizeText(v: unknown) {
  return String(v ?? "").trim();
}

function validatePassword(pw: string): string | null {
  if (!pw) return "Password is required.";
  if (pw.length < 10) return "Password must be at least 10 characters.";
  if (!/[A-Z]/.test(pw)) return "Password must include at least one capital letter.";
  if (!/[0-9]/.test(pw)) return "Password must include at least one number.";
  if (!/[^A-Za-z0-9\s]/.test(pw)) return "Password must include at least one symbol.";
  return null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;

    const rawToken = normalizeText(body.token);
    const password = normalizeText(body.password);

    if (!rawToken) {
      return NextResponse.json(
        { ok: false, error: "Token is required." },
        { status: 400 }
      );
    }

    const pwErr = validatePassword(password);
    if (pwErr) {
      return NextResponse.json({ ok: false, error: pwErr }, { status: 400 });
    }

    const token = await findValidVerificationToken({
      rawToken,
      purpose: "RESET_PASSWORD",
    });

    if (!token?.email) {
      return NextResponse.json(
        { ok: false, error: "This reset link is invalid or has expired." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { email: token.email },
      data: {
        passwordHash,
        updatedAt: new Date(),
      },
      select: { id: true },
    });

    await consumeVerificationToken({
      rawToken,
      purpose: "RESET_PASSWORD",
    });

    return NextResponse.json({
      ok: true,
      email: token.email,
      redirectTo: `/login?email=${encodeURIComponent(token.email)}`,
    });
  } catch (err: any) {
    console.error("[auth] reset-password error", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to reset password." },
      { status: 500 }
    );
  }
}