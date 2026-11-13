// app/api/onboarding/player/payment/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  plan?: string | null;
  email?: string | null;
  username?: string | null; // legacy fallback
  cadence?: string | null;  // monthly
  method?: string | null;   // card | ach
};

function normalizeEmail(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}

function normalizeText(v: unknown): string {
  return String(v ?? "").trim();
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

async function ensurePlayerProfileForUser(userId: string, email: string) {
  const db: any = prisma as any;

  try {
    if (db?.playerProfile?.findFirst) {
      const existing = await db.playerProfile.findFirst({
        where: { userId },
        select: { id: true },
      });

      if (existing?.id) return existing;
    }
  } catch (err) {
    console.warn("[onboarding] player payment findFirst playerProfile failed", err);
  }

  const baseData = {
    userId,
    email,
    schemaVersion: 1,
    data: {}, // required JSON field
  };

  const createVariants = [
    {
      ...baseData,
    },
    {
      ...baseData,
      isPublic: true,
    },
    {
      ...baseData,
      onboardingComplete: true,
    },
    {
      ...baseData,
      isPublic: true,
      onboardingComplete: true,
    },
  ];

  let lastErr: unknown = null;

  for (const data of createVariants) {
    try {
      if (db?.playerProfile?.create) {
        const created = await db.playerProfile.create({
          data,
          select: { id: true },
        });

        if (created?.id) return created;
      }
    } catch (err) {
      lastErr = err;
    }
  }

  if (lastErr) throw lastErr;
  return null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;

    const plan = normalizeText(body.plan).toLowerCase();
    const email = normalizeEmail(body.email ?? body.username);
    const cadence = "monthly";
    const method = normalizeText(body.method).toLowerCase();

    if (!email) return jsonError("Email is required.");

    const allowedPlans = new Set(["redshirt", "walk-on", "all-american"]);
    if (plan && !allowedPlans.has(plan)) {
      return jsonError("Invalid player plan.");
    }

    const allowedCadence = new Set(["monthly", ""]);
    if (!allowedCadence.has(cadence)) {
      return jsonError("Invalid billing cadence.");
    }

    const allowedMethod = new Set(["card", "ach", ""]);
    if (!allowedMethod.has(method)) {
      return jsonError("Invalid payment method.");
    }

    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        name: email,
        role: "PLAYER" as any,
      },
      update: {
        role: "PLAYER" as any,
      },
      select: {
        id: true,
        email: true,
      },
    });

    const playerProfile = await ensurePlayerProfileForUser(user.id, email);

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
              cadence: cadence || null,
              method: method || null,
              paymentComplete: true,
              finalized: true,
              userId: user.id,
              playerProfileId: playerProfile?.id ?? null,
            },
          },
          update: {
            plan: plan || null,
            payload: {
              email,
              plan: plan || null,
              cadence: cadence || null,
              method: method || null,
              paymentComplete: true,
              finalized: true,
              userId: user.id,
              playerProfileId: playerProfile?.id ?? null,
            },
          },
        });
      }
    } catch (draftErr) {
      console.warn("[onboarding] player payment draft upsert skipped", draftErr);
    }

    console.log("[onboarding] player payment finalized locally", {
      plan: plan || null,
      email,
      cadence: cadence || null,
      method: method || null,
      userId: user.id,
      playerProfileId: playerProfile?.id ?? null,
    });

    return NextResponse.json({
      ok: true,
      redirectTo: "/dashboard/player/profile",
    });
  } catch (err: any) {
    console.error("[onboarding] player payment error", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed" },
      { status: 500 }
    );
  }
}