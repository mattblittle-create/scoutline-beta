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

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function makeInviteToken() {
  return crypto.randomBytes(32).toString("hex");
}

function makeExpiresAt(days = 14) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function getAdminTeamFromRequest() {
  const currentUser = await getCurrentUser().catch(() => null);

  if (!currentUser?.id) return null;

  const adminMembership = await prisma.teamMembership.findFirst({
    where: {
      userId: currentUser.id,
      role: "TEAM_ADMIN" as any,
      isActive: true,
    },
    include: { team: true },
  });

  if (!adminMembership?.team) return null;

  return {
    user: {
      id: currentUser.id,
      email: normalizeEmail(currentUser.email),
    },
    membership: adminMembership,
    team: adminMembership.team,
  };
}

async function sendInviteEmails(args: {
  invitedEmail: string;
  parentEmail?: string | null;
  rawInviteToken: string;
  teamName: string;
}) {
  const { invitedEmail, parentEmail, rawInviteToken, teamName } = args;

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
      teamName,
      setupUrl: parentSetPasswordUrl,
    });
  }

  return {
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
  };
}

export async function GET() {
  try {
    const found = await getAdminTeamFromRequest();

    if (!found) {
      return jsonError("No active TEAM_ADMIN membership found for this user.", 403);
    }

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
  acceptedUser: {
    select: {
      PlayerProfile: {
        select: {
          id: true,
        },
      },
    },
  },
},
    });

const rows = invites.map((invite) => ({
  id: invite.id,
  invitedEmail: invite.invitedEmail,
  parentEmail: invite.parentEmail,
  status: invite.status,
  createdAt: invite.createdAt,
  updatedAt: invite.updatedAt,
  acceptedAt: invite.acceptedAt,
  expiresAt: invite.expiresAt,
  playerProfileId: invite.acceptedUser?.PlayerProfile?.id || null,
}));

return NextResponse.json({
  ok: true,
  data: {
    teamId: found.team.id,
    invites: rows,
  },
});
  } catch (e: any) {
    return jsonError(e?.message || "Failed to load invites.", 500);
  }
}

export async function POST(req: Request) {
  let body: any;

  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  try {
    const found = await getAdminTeamFromRequest();

    if (!found) {
      return jsonError("No active TEAM_ADMIN membership found for this user.", 403);
    }

    const action = String(body?.action || "").trim().toUpperCase();

    if (action) {
      const inviteId = String(body?.id || "").trim();

      if (!inviteId) return jsonError("Missing invite id.", 400);

      const invite = await prisma.teamInvite.findFirst({
        where: {
          id: inviteId,
          teamId: found.team.id,
        },
        select: {
          id: true,
          invitedEmail: true,
          parentEmail: true,
          status: true,
          expiresAt: true,
        },
      });

      if (!invite) return jsonError("Invite not found for this team.", 404);

if (invite.status === "ACCEPTED") {
  return jsonError("Accepted invites cannot be edited, resent, or cancelled.", 400);
}

if (invite.status === "CANCELLED" && action !== "UPDATE") {
  return jsonError("Cancelled invites cannot be resent or cancelled again. Edit the invite to renew it.", 400);
}

      if (action === "CANCEL") {
        const updated = await prisma.teamInvite.update({
          where: { id: invite.id },
          data: { status: "CANCELLED" as any },
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

      if (action === "RESEND") {
        const rawInviteToken = makeInviteToken();

        const updated = await prisma.teamInvite.update({
          where: { id: invite.id },
data: {
  tokenHash: sha256Hex(rawInviteToken),
  status: "PENDING" as any,
  expiresAt: makeExpiresAt(14),
  updatedAt: new Date(),
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

        const emailResult = await sendInviteEmails({
          invitedEmail: normalizeEmail(updated.invitedEmail),
          parentEmail: updated.parentEmail ? normalizeEmail(updated.parentEmail) : null,
          rawInviteToken,
          teamName: found.team.name || "",
        });

        return NextResponse.json({
          ok: true,
          data: {
            invite: updated,
            resent: true,
            inviteToken: rawInviteToken,
            ...emailResult,
          },
        });
      }

      if (action === "UPDATE") {
        const invitedEmail = normalizeEmail(body?.invitedEmail);
        const parentEmail = body?.parentEmail
          ? normalizeEmail(body.parentEmail)
          : null;

        if (!invitedEmail) return jsonError("Invited email is required.", 400);
        if (!isEmail(invitedEmail)) return jsonError("Invited email looks invalid.", 400);
        if (parentEmail && !isEmail(parentEmail)) {
          return jsonError("Parent email looks invalid.", 400);
        }

await prisma.teamInvite.updateMany({
  where: {
    teamId: found.team.id,
    invitedEmail,
    status: {
      in: ["PENDING", "EXPIRED"] as any,
    },
    NOT: {
      id: invite.id,
    },
  },
  data: {
    status: "CANCELLED" as any,
    updatedAt: new Date(),
  },
});

        const rawInviteToken = makeInviteToken();

        const updated = await prisma.$transaction(async (tx) => {
          const saved = await tx.teamInvite.update({
            where: { id: invite.id },
data: {
  invitedEmail,
  parentEmail,
  tokenHash: sha256Hex(rawInviteToken),
  status: "PENDING" as any,
  expiresAt: makeExpiresAt(14),
  updatedAt: new Date(),
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

          return saved;
        });

        const emailResult = await sendInviteEmails({
          invitedEmail,
          parentEmail,
          rawInviteToken,
          teamName: found.team.name || "",
        });

        return NextResponse.json({
          ok: true,
          data: {
            invite: updated,
            updated: true,
            inviteToken: rawInviteToken,
            ...emailResult,
          },
        });
      }

      return jsonError("Unsupported action.", 400);
    }

    const invitedEmail = normalizeEmail(body?.invitedEmail);
    if (!invitedEmail) return jsonError("Invited email is required.", 400);
    if (!isEmail(invitedEmail)) return jsonError("Invited email looks invalid.", 400);

    const parentEmail = body?.parentEmail ? normalizeEmail(body.parentEmail) : null;
    if (parentEmail && !isEmail(parentEmail)) {
      return jsonError("Parent email looks invalid.", 400);
    }

    const expiresInDays = Number(body?.expiresInDays ?? 30);
    const expiresAt =
      Number.isFinite(expiresInDays) && expiresInDays > 0
        ? makeExpiresAt(expiresInDays)
        : null;

await prisma.teamInvite.updateMany({
  where: {
    teamId: found.team.id,
    invitedEmail,
    status: {
      in: ["PENDING", "EXPIRED"] as any,
    },
  },
  data: {
    status: "CANCELLED" as any,
    updatedAt: new Date(),
  },
});

    const rawInviteToken = makeInviteToken();

    const created = await prisma.$transaction(async (tx) => {
      const invite = await tx.teamInvite.create({
        data: {
          teamId: found.team.id,
          invitedEmail,
          parentEmail,
          tokenHash: sha256Hex(rawInviteToken),
          status: "PENDING" as any,
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

    const emailResult = await sendInviteEmails({
      invitedEmail,
      parentEmail,
      rawInviteToken,
      teamName: found.team.name || "",
    });

    return NextResponse.json({
      ok: true,
      data: {
        invite: created,
        inviteToken: rawInviteToken,
        ...emailResult,
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