// app/api/onboarding/player/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createVerificationToken,
  invalidateExistingTokens,
} from "@/lib/auth/tokens";
import { sendSetPasswordEmail } from "@/lib/email/sendSetPasswordEmail";
import {
  PLAYER_BILLING_STATUS,
} from "@/lib/billing/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  plan?: string | null;
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  parentEmail?: string | null;
};

function normalizeEmail(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}

function normalizeText(v: unknown): string {
  return String(v ?? "").trim();
}

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function normalizePlan(v: string): string {
  return v.trim().toLowerCase();
}

function titleCaseName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim();
}

function mapPlanToEnum(plan: string): "REDSHIRT" | "WALK_ON" | "ALL_AMERICAN" {
  if (plan === "walk-on") return "WALK_ON";
  if (plan === "all-american") return "ALL_AMERICAN";
  return "REDSHIRT";
}

export async function POST(req: Request) {
  let stage = "start";

  try {
    stage = "parse-body";
    const body = (await req.json().catch(() => ({}))) as Body;

    const plan = normalizePlan(normalizeText(body.plan));
    const email = normalizeEmail(body.email);
    const phone = normalizeText(body.phone);
    const firstName = normalizeText(body.firstName);
    const lastName = normalizeText(body.lastName);
    const parentEmail = normalizeEmail(body.parentEmail);

    stage = "validate-input";
    if (!email) return jsonError("Player email is required.");
    if (!isEmail(email)) return jsonError("Player email is invalid.");
    if (!phone) return jsonError("Phone is required.");
    if (!firstName) return jsonError("First name is required.");
    if (!lastName) return jsonError("Last name is required.");
    if (!parentEmail) return jsonError("Parent email is required.");
    if (!isEmail(parentEmail)) return jsonError("Parent email is invalid.");

    const allowedPlans = new Set(["redshirt", "walk-on", "all-american"]);
    if (plan && !allowedPlans.has(plan)) {
      return jsonError("Invalid player plan.");
    }

    const normalizedPlan = allowedPlans.has(plan) ? plan : "redshirt";
    const fullName = titleCaseName(firstName, lastName);
    const planEnum = mapPlanToEnum(normalizedPlan);

    stage = "upsert-onboarding-draft";
    try {
      const db: any = prisma as any;
      if (db?.onboardingDraft?.upsert) {
        await db.onboardingDraft.upsert({
          where: { email },
          create: {
            email,
            kind: "PLAYER",
            plan: normalizedPlan,
            payload: {
              email,
              phone,
              firstName,
              lastName,
              parentEmail,
              plan: normalizedPlan,
              coreComplete: true,
            },
          },
          update: {
            plan: normalizedPlan,
            payload: {
              email,
              phone,
              firstName,
              lastName,
              parentEmail,
              plan: normalizedPlan,
              coreComplete: true,
            },
          },
        });
      }
    } catch (draftErr) {
      console.warn("[onboarding] player core draft upsert skipped", draftErr);
    }

    stage = "upsert-user-and-player-profile";
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { email },
        create: {
          email,
          name: fullName,
          role: "PLAYER" as any,
        },
        update: {
          name: fullName,
          role: "PLAYER" as any,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          passwordHash: true,
        },
      });

      const existingProfile = await tx.playerProfile.findUnique({
        where: { email },
        select: {
          id: true,
          data: true,
        },
      });

      const existingData =
        existingProfile?.data &&
        typeof existingProfile.data === "object" &&
        !Array.isArray(existingProfile.data)
          ? (existingProfile.data as Record<string, any>)
          : {};

      const mergedData = {
        ...existingData,
        firstName,
        lastName,
        phone,
        parentEmail,
      };

      const playerProfile = existingProfile?.id
        ? await tx.playerProfile.update({
            where: { id: existingProfile.id },
            data: {
              userId: user.id,
              email,
              playerPlanTier: planEnum as any,
              data: mergedData,
              updatedAt: new Date(),
            },
            select: {
              id: true,
            },
          })
        : await tx.playerProfile.create({
            data: {
              userId: user.id,
              email,
              profileState: "PLAYER_OWNED_ACTIVE" as any,
              ownershipMode: "PLAYER_PRIMARY" as any,
              hasActivePlayerBilling: false,
              hasActiveTeamBilling: false,
              billingConflictFlag: false,
              playerPlanTier: planEnum as any,
              playerBillingCadence: "monthly",
              playerBillingStatus:
                PLAYER_BILLING_STATUS.PENDING,
              schemaVersion: 1,
              data: mergedData,
            },
            select: {
              id: true,
            },
          });

      return { user, playerProfile };
    });

    const needsSetPassword = !result.user.passwordHash;

    let rawToken: string | null = null;
    let expiresAt: Date | null = null;

    if (needsSetPassword) {
      stage = "invalidate-existing-set-password-tokens";
      await invalidateExistingTokens({
        email,
        purpose: "SET_PASSWORD",
      });

      stage = "create-set-password-token";
      const tokenResult = await createVerificationToken({
        email,
        purpose: "SET_PASSWORD",
      });

      rawToken = tokenResult.rawToken;
      expiresAt = tokenResult.token.expiresAt;

      stage = "send-set-password-email";
      await sendSetPasswordEmail({
        to: email,
        rawToken,
        roleLabel: "ScoutLine player account",
      });
    }

    console.log("[onboarding] player core saved", {
      plan: normalizedPlan,
      email,
      phone,
      firstName,
      lastName,
      parentEmail,
      userId: result.user.id,
      playerProfileId: result.playerProfile.id,
      needsSetPassword,
    });

    stage = "return-success";
    return NextResponse.json({
      ok: true,
      data: {
        userId: result.user.id,
        playerProfileId: result.playerProfile.id,
        needsSetPassword,
        setPasswordToken: rawToken,
        expiresAt,
        emailDispatch: {
          sent: needsSetPassword,
          to: email,
        },
      },
    });
  } catch (err: any) {
    console.error("[onboarding] player core error", {
      stage,
      message: err?.message || "Unknown error",
      stack: err?.stack || null,
      name: err?.name || null,
      code: err?.code || null,
      meta: err?.meta || null,
      cause: err?.cause || null,
    });

    return NextResponse.json(
      {
        ok: false,
        error: `Player onboarding failed at stage: ${stage}. ${err?.message || "Failed"}`,
      },
      { status: 500 }
    );
  }
}