// app/api/auth/forgot-password/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createVerificationToken,
  invalidateExistingTokens,
} from "@/lib/auth/tokens";
import { sendForgotPasswordEmail } from "@/lib/email/sendForgotPasswordEmail";

type Body = {
  email?: string | null;
};

function normalizeEmail(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const email = normalizeEmail(body.email);

    if (!email) {
      return NextResponse.json(
        { ok: false, error: "Email is required." },
        { status: 400 }
      );
    }

    if (!isEmail(email)) {
      return NextResponse.json(
        { ok: false, error: "Valid email is required." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    // Intentional generic success to avoid user enumeration
    if (!user?.id) {
      return NextResponse.json({ ok: true });
    }

    await invalidateExistingTokens({
      email,
      purpose: "RESET_PASSWORD",
    });

    const { rawToken } = await createVerificationToken({
      email,
      purpose: "RESET_PASSWORD",
    });

    await sendForgotPasswordEmail({
      to: email,
      rawToken,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[auth] forgot-password error", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to process request." },
      { status: 500 }
    );
  }
}