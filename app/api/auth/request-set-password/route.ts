// app/api/auth/request-set-password/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createVerificationToken,
  invalidateExistingTokens,
} from "@/lib/auth/tokens";
import { sendSetPasswordEmail } from "@/lib/email/sendSetPasswordEmail";

type Body = {
  email?: string | null;
  roleLabel?: string | null;
};

function normalizeEmail(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

function normalizeText(v: unknown) {
  return String(v ?? "").trim();
}

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function guessRoleLabel(user: {
  role?: string | null;
  adminProfile?: { id: string } | null;
  coachProfile?: { id: string } | null;
  teamMemberships?: Array<{ role?: string | null }>;
  parentProfile?: { id: string } | null;
  playerProfile?: { id: string } | null;
}) {
  if (user.adminProfile?.id) return "ScoutLine admin account";
  if (user.coachProfile?.id) return "ScoutLine coach account";
  if (user.parentProfile?.id) return "ScoutLine parent account";

  const hasTeamAdmin = (user.teamMemberships || []).some(
    (m) => String(m.role || "").toUpperCase() === "TEAM_ADMIN"
  );
  if (hasTeamAdmin) return "ScoutLine team account";

  if (user.playerProfile?.id) return "ScoutLine player account";

  const role = String(user.role || "").trim().toUpperCase();
  if (role === "ADMIN") return "ScoutLine admin account";
  if (role === "COACH") return "ScoutLine coach account";
  if (role === "PARENT") return "ScoutLine parent account";
  if (role === "TEAM" || role === "TEAM_ADMIN") return "ScoutLine team account";
  if (role === "PLAYER") return "ScoutLine player account";

  return "ScoutLine account";
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;

    const email = normalizeEmail(body.email);
    const roleLabelInput = normalizeText(body.roleLabel);

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
      select: {
        id: true,
        email: true,
        role: true,
        adminProfile: { select: { id: true } },
        coachProfile: { select: { id: true } },
        parentProfile: { select: { id: true } },
        playerProfile: { select: { id: true } },
        teamMemberships: {
          where: { isActive: true },
          select: { role: true },
        },
      },
    });

    if (!user?.id) {
      return NextResponse.json(
        { ok: false, error: "No user found for that email." },
        { status: 404 }
      );
    }

    await invalidateExistingTokens({
      email,
      purpose: "SET_PASSWORD",
    });

    const { rawToken, token } = await createVerificationToken({
      email,
      purpose: "SET_PASSWORD",
    });

    await sendSetPasswordEmail({
      to: email,
      rawToken,
      roleLabel: roleLabelInput || guessRoleLabel(user),
    });

    return NextResponse.json({
      ok: true,
      email,
      expiresAt: token.expiresAt,
    });
  } catch (err: any) {
    console.error("[auth] request-set-password error", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to send setup email." },
      { status: 500 }
    );
  }
}