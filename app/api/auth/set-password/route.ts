// app/api/auth/set-password/route.ts

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  consumeVerificationToken,
  findValidVerificationToken,
} from "@/lib/auth/tokens";
import { getPostLoginRedirect } from "@/lib/auth/getPostLoginRedirect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
      purpose: "SET_PASSWORD",
    });

    if (!token?.email) {
      return NextResponse.json(
        { ok: false, error: "This setup link is invalid or has expired." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.update({
      where: { email: token.email },
      data: {
        passwordHash,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
      },
    });

    await consumeVerificationToken({
      rawToken,
      purpose: "SET_PASSWORD",
    });

    const requestedNext = normalizeText(body.next);

const redirectTo =
  requestedNext && requestedNext.startsWith("/")
    ? requestedNext
    : await getPostLoginRedirect(user.id);

    const res = NextResponse.json({
      ok: true,
      email: user.email,
      redirectTo,
    });

    res.cookies.set("scoutline_uid", user.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });

    if (process.env.NODE_ENV !== "production") {
      res.cookies.set("scoutline_uid_dbg", user.id, {
        httpOnly: false,
        sameSite: "lax",
        secure: false,
        path: "/",
        maxAge: 60 * 60 * 24 * 14,
      });
    }

    return res;
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