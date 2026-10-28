// app/api/onboarding/parent/password/route.ts

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  consumeVerificationToken,
  findValidVerificationToken,
} from "@/lib/auth/tokens";

type Body = {
  token?: string | null;
  email?: string | null;
  password?: string | null;
  playerEmail?: string | null;
  playerFirstName?: string | null;
  playerLastName?: string | null;
  plan?: string | null;
  billing?: string | null;
};

function normalizeEmail(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

function normalizeText(v: unknown) {
  return String(v ?? "").trim();
}

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function validatePassword(pw: string): string | null {
  if (!pw || typeof pw !== "string") return "Password is required.";
  if (pw.length < 10) return "Password must be at least 10 characters.";
  if (!/[A-Z]/.test(pw)) return "Password must include at least one capital letter.";
  if (!/[0-9]/.test(pw)) return "Password must include at least one number.";
  if (!/[^A-Za-z0-9\s]/.test(pw)) return "Password must include at least one symbol.";
  return null;
}

export async function POST(req: Request) {
  let stage = "start";

  try {
    stage = "parse-body";
    const body = (await req.json().catch(() => ({}))) as Body;

    const rawToken = normalizeText(body.token);
    const fallbackEmail = normalizeEmail(body.email);
    const password = normalizeText(body.password);
    const playerEmail = normalizeEmail(body.playerEmail);
    const playerFirstName = normalizeText(body.playerFirstName);
    const playerLastName = normalizeText(body.playerLastName);
    const plan = normalizeText(body.plan);
    const billing = normalizeText(body.billing || "monthly");

    stage = "validate-password";
    const pwErr = validatePassword(password);
    if (pwErr) {
      return NextResponse.json(
        { ok: false, error: pwErr },
        { status: 400 }
      );
    }

    stage = "validate-player-email";
    if (!playerEmail) {
      return NextResponse.json(
        { ok: false, error: "Player email is required." },
        { status: 400 }
      );
    }

    if (!isEmail(playerEmail)) {
      return NextResponse.json(
        { ok: false, error: "Player email is invalid." },
        { status: 400 }
      );
    }

    stage = "resolve-parent-email";
    let resolvedParentEmail = fallbackEmail;

    if (rawToken) {
      const token = await findValidVerificationToken({
        rawToken,
        purpose: "SET_PASSWORD",
      });

      if (!token?.email) {
        return NextResponse.json(
          { ok: false, error: "This parent setup link is invalid or has expired." },
          { status: 400 }
        );
      }

      resolvedParentEmail = normalizeEmail(token.email);
    }

    if (!resolvedParentEmail) {
      return NextResponse.json(
        { ok: false, error: "Parent email is required." },
        { status: 400 }
      );
    }

    if (!isEmail(resolvedParentEmail)) {
      return NextResponse.json(
        { ok: false, error: "Parent email is invalid." },
        { status: 400 }
      );
    }

    stage = "hash-password";
    const passwordHash = await bcrypt.hash(password, 10);

    const parentName = [playerLastName, "Parent"]
      .filter(Boolean)
      .join(" ")
      .trim();

    stage = "upsert-parent-user";
    const parentUser = await prisma.user.upsert({
      where: { email: resolvedParentEmail },
      create: {
        email: resolvedParentEmail,
        passwordHash,
        name: parentName || null,
        role: "PARENT",
      } as any,
      update: {
        passwordHash,
        role: "PARENT",
        updatedAt: new Date(),
      } as any,
      select: {
        id: true,
        email: true,
      },
    });

    stage = "upsert-parent-profile";
    const parentProfile = await prisma.parentProfile.upsert({
      where: { userId: parentUser.id },
      create: {
        userId: parentUser.id,
      },
      update: {
        updatedAt: new Date(),
      },
      select: {
        id: true,
      },
    });

    stage = "lookup-player-profile";
    const playerProfile = await prisma.playerProfile.findUnique({
      where: { email: playerEmail },
      select: {
        id: true,
      },
    });

    if (!playerProfile?.id) {
      return NextResponse.json(
        {
          ok: false,
          error: `No player profile found for ${playerEmail}.`,
        },
        { status: 404 }
      );
    }

    stage = "count-existing-links";
    const existingLinkCount = await prisma.parentPlayerLink.count({
      where: { parentProfileId: parentProfile.id },
    });

    stage = "upsert-parent-player-link";
    await prisma.parentPlayerLink.upsert({
      where: {
        parentProfileId_playerProfileId: {
          parentProfileId: parentProfile.id,
          playerProfileId: playerProfile.id,
        },
      },
      create: {
        parentProfileId: parentProfile.id,
        playerProfileId: playerProfile.id,
        relationship: "Parent",
        isPrimary: existingLinkCount === 0,
      },
      update: {
        relationship: "Parent",
        updatedAt: new Date(),
      },
    });

    if (rawToken) {
      stage = "consume-token";
      await consumeVerificationToken({
        rawToken,
        purpose: "SET_PASSWORD",
      });
    }

    console.log("[onboarding] parent password saved", {
      email: resolvedParentEmail,
      userId: parentUser.id,
      parentProfileId: parentProfile.id,
      playerEmail,
      playerProfileId: playerProfile.id,
      playerFirstName,
      playerLastName,
      plan,
      billing,
      passwordLen: password.length,
      usedToken: Boolean(rawToken),
    });

    stage = "return-success";
    return NextResponse.json({
      ok: true,
      userId: parentUser.id,
      email: parentUser.email,
      redirectTo: `/login?role=parent&email=${encodeURIComponent(parentUser.email)}`,
    });
  } catch (err: any) {
    console.error("[onboarding] parent password error", {
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
        error: `Parent onboarding failed at stage: ${stage}. ${err?.message || "Failed"}`,
      },
      { status: 500 }
    );
  }
}