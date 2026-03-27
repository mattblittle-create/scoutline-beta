// app/api/auth/set-password/route.ts
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
  next?: string | null;
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

function normalizeNextPath(v: unknown): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;

  // Only allow internal relative paths
  if (!s.startsWith("/")) return null;
  if (s.startsWith("//")) return null;

  return s;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;

    const rawToken = normalizeText(body.token);
    const password = normalizeText(body.password);
    const next = normalizeNextPath(body.next);

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
      purpose: "SET_PASSWORD",
    });

    if (!token?.email) {
      return NextResponse.json(
        { ok: false, error: "This setup link is invalid or has expired." },
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
      purpose: "SET_PASSWORD",
    });

    return NextResponse.json({
      ok: true,
      email: token.email,
      redirectTo: next || `/login?email=${encodeURIComponent(token.email)}`,
    });
  } catch (err: any) {
    console.error("[auth] set-password error", {
      message: err?.message || "Unknown error",
      stack: err?.stack || null,
      name: err?.name || null,
      code: err?.code || null,
      meta: err?.meta || null,
      cause: err?.cause || null,
    });

    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to set password." },
      { status: 500 }
    );
  }
}