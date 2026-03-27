// app/api/team/invites/accept/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function normalizeText(v: unknown): string {
  return String(v ?? "").trim();
}

function normalizeEmail(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

async function findInviteByRawToken(rawToken: string) {
  const tokenHash = sha256Hex(rawToken);

  return prisma.teamInvite.findUnique({
    where: { tokenHash },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          slug: true,
          city: true,
          state: true,
          logoUrl: true,
        },
      },
      createdByUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      acceptedUser: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });
}

function inviteIsExpired(invite: { expiresAt?: Date | null }) {
  return Boolean(invite.expiresAt && invite.expiresAt.getTime() < Date.now());
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const rawToken = normalizeText(url.searchParams.get("token"));

    if (!rawToken) {
      return jsonError("Missing invite token.", 400);
    }

    const invite = await findInviteByRawToken(rawToken);
    if (!invite) {
      return jsonError("Invite not found.", 404);
    }

    const expired = inviteIsExpired(invite);
    const currentUser = await getCurrentUser().catch(() => null);
    const currentUserEmail = normalizeEmail(currentUser?.email);

    const invitedEmail = normalizeEmail(invite.invitedEmail);
    const parentEmail = normalizeEmail(invite.parentEmail);

    return NextResponse.json({
      ok: true,
      data: {
        invite: {
          id: invite.id,
          invitedEmail: invite.invitedEmail,
          parentEmail: invite.parentEmail,
          status: invite.status,
          createdAt: invite.createdAt,
          updatedAt: invite.updatedAt,
          acceptedAt: invite.acceptedAt,
          expiresAt: invite.expiresAt,
          expired,
        },
        team: invite.team,
        createdBy: invite.createdByUser
          ? {
              name: invite.createdByUser.name,
              email: invite.createdByUser.email,
            }
          : null,
        viewer: {
          isLoggedIn: Boolean(currentUser?.id),
          email: currentUser?.email || null,
          matchesInvitedPlayer:
            Boolean(currentUserEmail) && currentUserEmail === invitedEmail,
          matchesParent:
            Boolean(currentUserEmail) && currentUserEmail === parentEmail,
        },
      },
    });
  } catch (err: any) {
    console.error("[team invites] accept GET error", {
      message: err?.message || "Unknown error",
      stack: err?.stack || null,
    });

    return jsonError(err?.message || "Failed to load invite.", 500);
  }
}

export async function POST(req: Request) {
  let stage = "start";

  try {
    stage = "parse-body";
    const body = (await req.json().catch(() => ({}))) as { token?: string | null };
    const rawToken = normalizeText(body?.token);

    if (!rawToken) {
      return jsonError("Missing invite token.", 400);
    }

    stage = "get-current-user";
    const currentUser = await getCurrentUser().catch(() => null);
    if (!currentUser?.id || !currentUser?.email) {
      return jsonError("You must be logged in to accept this invite.", 401);
    }

    const currentUserEmail = normalizeEmail(currentUser.email);

    stage = "find-invite";
    const invite = await findInviteByRawToken(rawToken);
    if (!invite) {
      return jsonError("Invite not found.", 404);
    }

    if (invite.status === "CANCELLED") {
      return jsonError("This invite has been cancelled.", 410);
    }

    if (invite.status === "ACCEPTED") {
      return NextResponse.json({
        ok: true,
        data: {
          alreadyAccepted: true,
          inviteId: invite.id,
          team: invite.team,
        },
      });
    }

    if (invite.status !== "PENDING") {
      return jsonError("This invite is no longer active.", 410);
    }

    if (inviteIsExpired(invite)) {
      return jsonError("This invite has expired.", 410);
    }

    const invitedEmail = normalizeEmail(invite.invitedEmail);
    if (currentUserEmail !== invitedEmail) {
      return jsonError(
        "This invite must be accepted by the invited player email address.",
        403
      );
    }

    stage = "accept-transaction";
    const result = await prisma.$transaction(async (tx) => {
      let playerProfile = await tx.playerProfile.findUnique({
        where: { email: invitedEmail },
        select: {
          id: true,
          userId: true,
          ownerTeamId: true,
          data: true,
        },
      });

      if (!playerProfile?.id) {
        playerProfile = await tx.playerProfile.create({
          data: {
            email: invitedEmail,
            userId: currentUser.id,
            profileState: "TEAM_OWNED_ACTIVE" as any,
            ownershipMode: "TEAM_PRIMARY" as any,
            ownerTeamId: invite.teamId,
            hasActiveTeamBilling: true,
            hasActivePlayerBilling: false,
            billingConflictFlag: false,
            playerPlanTier: "TEAM" as any,
            playerBillingCadence: "monthly",
            playerBillingStatus: "Active",
            schemaVersion: 1,
            data: {},
          },
          select: {
            id: true,
            userId: true,
            ownerTeamId: true,
            data: true,
          },
        });
      } else {
        await tx.playerProfile.update({
          where: { id: playerProfile.id },
          data: {
            userId: currentUser.id,
            hasActiveTeamBilling: true,
            ...(playerProfile.ownerTeamId ? {} : { ownerTeamId: invite.teamId }),
            updatedAt: new Date(),
          },
        });
      }

      const existingMembership = await tx.teamMembership.findFirst({
        where: {
          teamId: invite.teamId,
          userId: currentUser.id,
          role: "PLAYER" as any,
        },
        select: {
          id: true,
        },
      });

      if (existingMembership?.id) {
        await tx.teamMembership.update({
          where: { id: existingMembership.id },
          data: {
            playerProfileId: playerProfile.id,
            isActive: true,
          },
        });
      } else {
        await tx.teamMembership.create({
          data: {
            teamId: invite.teamId,
            userId: currentUser.id,
            role: "PLAYER" as any,
            playerProfileId: playerProfile.id,
            isActive: true,
            isPrimaryForProfile: true,
          },
        });
      }

      const acceptedInvite = await tx.teamInvite.update({
        where: { id: invite.id },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
          acceptedUserId: currentUser.id,
          updatedAt: new Date(),
        },
        select: {
          id: true,
          status: true,
          acceptedAt: true,
        },
      });

      return {
        invite: acceptedInvite,
        playerProfileId: playerProfile.id,
      };
    });

    return NextResponse.json({
      ok: true,
      data: {
        accepted: true,
        inviteId: result.invite.id,
        acceptedAt: result.invite.acceptedAt,
        playerProfileId: result.playerProfileId,
        team: invite.team,
        redirectTo: "/dashboard/player/profile",
      },
    });
  } catch (err: any) {
    console.error("[team invites] accept POST error", {
      stage,
      message: err?.message || "Unknown error",
      stack: err?.stack || null,
      name: err?.name || null,
      code: err?.code || null,
      meta: err?.meta || null,
      cause: err?.cause || null,
    });

    return jsonError(
      `Failed to accept invite at stage: ${stage}. ${err?.message || "Unknown error"}`,
      500
    );
  }
}