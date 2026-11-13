// app/api/onboarding/player/password/route.ts

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  plan?: string | null;
  username?: string | null; // legacy fallback
  email?: string | null;    // preferred
  password?: string | null;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function normalizeEmail(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}

function normalizeText(v: unknown): string {
  return String(v ?? "").trim();
}

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
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

    const plan = normalizeText(body.plan).toLowerCase();
    const email = normalizeEmail(body.email ?? body.username);
    const password = normalizeText(body.password);

    const allowedPlans = new Set(["redshirt", "walk-on", "all-american"]);
    if (plan && !allowedPlans.has(plan)) {
      return jsonError("Invalid player plan.");
    }

    if (!email) return jsonError("Email is required.");
    if (!isEmail(email)) return jsonError("Email is invalid.");

    const pwErr = validatePassword(password);
    if (pwErr) return jsonError(pwErr);

    const passwordHash = await bcrypt.hash(password, 10);

    // Ensure the user exists, then persist passwordHash.
    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        name: email,
        role: "PLAYER" as any,
        passwordHash,
      },
      update: {
        role: "PLAYER" as any,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
      },
    });

    // Keep draft in sync if present.
    try {
      const db: any = prisma as any;
      if (db?.onboardingDraft?.upsert) {
        await db.onboardingDraft.upsert({
          where: { email },
          create: {
            email,
            kind: "PLAYER",
            plan: plan || null,
            payload: {
              email,
              plan: plan || null,
              passwordSet: true,
            },
          },
          update: {
            plan: plan || null,
            payload: {
              email,
              plan: plan || null,
              passwordSet: true,
            },
          },
        });
      }
    } catch (draftErr) {
      console.warn("[onboarding] player password draft upsert skipped", draftErr);
    }

    console.log("[onboarding] player password saved", {
      plan: plan || null,
      email,
      userId: user.id,
      passwordLen: password.length,
    });

    return NextResponse.json({
      ok: true,
      userId: user.id,
    });
  } catch (err: any) {
    console.error("[onboarding] player password error", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed" },
      { status: 500 }
    );
  }
}