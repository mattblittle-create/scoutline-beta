// app/api/team/invites/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPlayerParentInvite } from "@/lib/email/sendPlayerParentInvite";
import { sendSetPasswordEmail } from "@/lib/email/sendSetPasswordEmail";
import {
  createVerificationToken,
  invalidateExistingTokens,
} from "@/lib/auth/tokens";
import { getBaseUrl } from "@/lib/email/senders";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import crypto from "crypto";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function normalizeEmail(v: any): string {
  return String(v || "").trim().toLowerCase();
}

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function pickEmailFromRequest(req: Request): string {
  const url = new URL(req.url);
  const qEmail = normalizeEmail(
    url.searchParams.get("email") || url.searchParams.get("username")
  );
  if (qEmail) return qEmail;

  const hdrEmail = normalizeEmail(req.headers.get("x-user-email"));
  if (hdrEmail) return hdrEmail;

  return "";
}

async function getAdminTeamFromRequest(req: Request) {
  const currentUser = await getCurrentUser().catch(() => null);

  let userId = currentUser?.id || null;
  let email = normalizeEmail(currentUser?.email);

  // Keep manual/dev fallback support only if no session exists.
  if (!userId) {
    const fallbackEmail = pickEmailFromRequest(req);
    if (!fallbackEmail) return null;
    if (!isEmail(fallbackEmail)) throw new Error("Invalid email.");

    const fallbackUser = await prisma.user.findUnique({
      where: { email: fallbackEmail },
      select: { id: true, email: true },
    });

    if (!fallbackUser?.id) return null;

    userId = fallbackUser.id;
    email = normalizeEmail(fallbackUser.email);
  }

  const adminMembership = await prisma.teamMembership.findFirst({
    where: {
      userId,
      role: "TEAM_ADMIN" as any,
      isActive: true,
    },
    include: { team: true },
  });

  if (!adminMembership?.team) return null;

  return {
    user: { id: userId, email },
    membership: adminMembership,
    team: adminMembership.team,
  };
}

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

type CreateInvitePayload = {
  invitedEmail: string;
  parentEmail?: string | null;
  expiresInDays?: number;
};

type UpdateInvitePayload = {
  id: string;
  action: "CANCEL";
};

export async function GET(req: Request) {
const found = await getAdminTeamFromRequest(req);

if (!found) {
  return jsonError("No active TEAM_ADMIN membership found for this user.", 403);
}

  try {

    const invites = await prisma.teamInvite.findMany({
      where: { teamId: found.team.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        invitedEmail: true,
        parentEmail: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        acceptedAt: true,
        expiresAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        teamId: found.team.id,
        invites,
      },
    });
  } catch (e: any) {
    return jsonError(e?.message || "Failed to load invites.", 500);
  }
}

export async function POST(req: Request) {
const found = await getAdminTeamFromRequest(req);

if (!found) {
  return jsonError("No active TEAM_ADMIN membership found for this user.", 403);
}

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  try {

    // --- UPDATE (cancel) ---
    if (body?.action) {
      const payload = body as UpdateInvitePayload;

      if (!payload?.id) return jsonError("Missing invite id.", 400);
      if (payload.action !== "CANCEL")
        return jsonError("Unsupported action.", 400);

      const belongs = await prisma.teamInvite.findFirst({
        where: { id: payload.id, teamId: found.team.id },
        select: { id: true },
      });
      if (!belongs) return jsonError("Invite not found for this team.", 404);

      const updated = await prisma.teamInvite.update({
        where: { id: payload.id },
        data: { status: "CANCELLED" },
        select: {
          id: true,
          invitedEmail: true,
          parentEmail: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          acceptedAt: true,
          expiresAt: true,
        },
      });

      return NextResponse.json({ ok: true, data: { invite: updated } });
    }

    // --- CREATE ---
    const payload = body as CreateInvitePayload;

    const invitedEmail = normalizeEmail(payload.invitedEmail);
    if (!invitedEmail)
      return jsonError("Invited email is required.", 400);
    if (!isEmail(invitedEmail))
      return jsonError("Invited email looks invalid.", 400);

    const parentEmail = payload.parentEmail
      ? normalizeEmail(payload.parentEmail)
      : null;
    if (parentEmail && !isEmail(parentEmail))
      return jsonError("Parent email looks invalid.", 400);

    const expiresInDays = Number(payload.expiresInDays ?? 14);
    const expiresAt =
      Number.isFinite(expiresInDays) && expiresInDays > 0
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
        : null;

    const rawInviteToken = crypto.randomBytes(32).toString("hex");
    const inviteTokenHash = sha256Hex(rawInviteToken);

    const existingPending = await prisma.teamInvite.findFirst({
      where: { teamId: found.team.id, invitedEmail, status: "PENDING" },
      select: { id: true },
    });
    if (existingPending) {
      return jsonError(
        "A pending invite already exists for this email.",
        409
      );
    }

    const created = await prisma.$transaction(async (tx) => {
      const invite = await tx.teamInvite.create({
        data: {
          teamId: found.team.id,
          invitedEmail,
          parentEmail,
          tokenHash: inviteTokenHash,
          status: "PENDING",
          createdByUserId: found.user.id,
          expiresAt,
        },
        select: {
          id: true,
          invitedEmail: true,
          parentEmail: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          acceptedAt: true,
          expiresAt: true,
        },
      });

      await tx.user.upsert({
        where: { email: invitedEmail },
        create: {
          email: invitedEmail,
          role: "PLAYER",
        } as any,
        update: {
          role: "PLAYER",
          updatedAt: new Date(),
        } as any,
        select: { id: true },
      });

      if (parentEmail) {
        await tx.user.upsert({
          where: { email: parentEmail },
          create: {
            email: parentEmail,
            role: "PARENT",
          } as any,
          update: {
            role: "PARENT",
            updatedAt: new Date(),
          } as any,
          select: { id: true },
        });
      }

      return invite;
    });

    // --- PLAYER TOKEN + EMAIL ---
    await invalidateExistingTokens({
      email: invitedEmail,
      purpose: "SET_PASSWORD",
    });

    const playerTokenResult = await createVerificationToken({
      email: invitedEmail,
      purpose: "SET_PASSWORD",
    });

    const playerNextPath = `/team/invite/accept?token=${encodeURIComponent(
      rawInviteToken
    )}`;

    const playerSetPasswordUrl = `${getBaseUrl()}/set-password?token=${encodeURIComponent(
      playerTokenResult.rawToken
    )}&next=${encodeURIComponent(playerNextPath)}`;

    await sendSetPasswordEmail({
      to: invitedEmail,
      rawToken: playerTokenResult.rawToken,
      roleLabel: "ScoutLine player account",
      nextPath: playerNextPath,
    });

    // --- PARENT TOKEN + EMAIL ---
    let parentSetPasswordUrl: string | null = null;

    if (parentEmail) {
      await invalidateExistingTokens({
        email: parentEmail,
        purpose: "SET_PASSWORD",
      });

      const parentTokenResult = await createVerificationToken({
        email: parentEmail,
        purpose: "SET_PASSWORD",
      });

      parentSetPasswordUrl =
        `${getBaseUrl()}/onboarding/parent/password` +
        `?token=${encodeURIComponent(parentTokenResult.rawToken)}` +
        `&playerEmail=${encodeURIComponent(invitedEmail)}` +
        `&plan=${encodeURIComponent("team")}` +
        `&billing=${encodeURIComponent("monthly")}`;

      await sendPlayerParentInvite({
        to: parentEmail,
        playerFirstName: "",
        playerLastName: "",
        playerEmail: invitedEmail,
        plan: "team",
        billing: "monthly",
        teamName: found.team.name || "",
        setupUrl: parentSetPasswordUrl,
      });
    }

    return NextResponse.json({
      ok: true,
      data: {
        invite: created,
        inviteToken: rawInviteToken,
        playerSetup: {
          sent: true,
          to: invitedEmail,
          setPasswordLink: playerSetPasswordUrl,
        },
        parentSetup: parentEmail
          ? {
              sent: true,
              to: parentEmail,
              setPasswordLink: parentSetPasswordUrl,
            }
          : {
              sent: false,
              to: null,
              setPasswordLink: null,
            },
      },
    });
  } catch (e: any) {
    console.error("[team invites] route error", {
      message: e?.message || "Unknown error",
      stack: e?.stack || null,
      name: e?.name || null,
      code: e?.code || null,
      meta: e?.meta || null,
      cause: e?.cause || null,
    });

    return jsonError(e?.message || "Failed to save invite.", 500);
  }
}