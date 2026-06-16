// app/api/team/invites/accept/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import {
  createVerificationToken,
  invalidateExistingTokens,
} from "@/lib/auth/tokens";

type TeamChoice = "SWITCH_TO_INVITED_TEAM" | "KEEP_CURRENT_TEAM";

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

async function findJoinLinkByCode(code: string) {
  return prisma.teamJoinLink.findFirst({
    where: {
      code,
      isActive: true,
    },
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
    },
  });
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

async function invitedPlayerAccountExists(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  return Boolean(user?.id);
}

function inviteIsExpired(invite: { expiresAt?: Date | null }) {
  return Boolean(invite.expiresAt && invite.expiresAt.getTime() < Date.now());
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
const rawToken = normalizeText(url.searchParams.get("token"));
const code = normalizeText(url.searchParams.get("code"));

if (code && !rawToken) {
  const joinLink = await findJoinLinkByCode(code);

  if (!joinLink?.team) {
    return jsonError("Team join link not found or inactive.", 404);
  }

  const currentUser = await getCurrentUser().catch(() => null);

  return NextResponse.json({
    ok: true,
    data: {
      mode: "TEAM_JOIN_LINK",
      code,
      invite: null,
      team: joinLink.team,
      createdBy: null,
      viewer: {
        isLoggedIn: Boolean(currentUser?.id),
        email: currentUser?.email || null,
        matchesInvitedPlayer: false,
        matchesParent: false,
        invitedPlayerAccountExists: false,
      },
      currentPrimaryTeam: null,
      requiresTeamChoice: false,
    },
  });
}

if (!rawToken) return jsonError("Missing invite token.", 400);

    const invite = await findInviteByRawToken(rawToken);
    if (!invite) return jsonError("Invite not found.", 404);

    const expired = inviteIsExpired(invite);
    const currentUser = await getCurrentUser().catch(() => null);
    const currentUserEmail = normalizeEmail(currentUser?.email);

    const invitedEmail = normalizeEmail(invite.invitedEmail);
    const parentEmail = normalizeEmail(invite.parentEmail);
    const accountExists = await invitedPlayerAccountExists(invitedEmail);

    let currentPrimaryTeam: any = null;

    if (currentUserEmail && currentUserEmail === invitedEmail) {
      const playerProfile = await prisma.playerProfile.findUnique({
        where: { email: invitedEmail },
        select: { id: true },
      });

      if (playerProfile?.id) {
        const existingPrimary = await prisma.teamMembership.findFirst({
          where: {
            playerProfileId: playerProfile.id,
            role: "PLAYER" as any,
            isActive: true,
            isPrimaryForProfile: true,
            teamId: { not: invite.teamId },
          },
          select: {
            id: true,
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
          },
        });

        currentPrimaryTeam = existingPrimary?.team || null;
      }
    }

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
          invitedPlayerAccountExists: accountExists,
        },
        currentPrimaryTeam,
        requiresTeamChoice:
          Boolean(currentPrimaryTeam?.id) &&
          invite.status === "PENDING" &&
          !expired,
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
const body = (await req.json().catch(() => ({}))) as {
  token?: string | null;
  code?: string | null;
  playerEmail?: string | null;
  parentEmail?: string | null;
  teamChoice?: TeamChoice | null;
};

const rawToken = normalizeText(body?.token);
const code = normalizeText(body?.code);
const playerEmail = normalizeEmail(body?.playerEmail);
const parentEmail = normalizeEmail(body?.parentEmail);
const teamChoice = normalizeText(body?.teamChoice) as TeamChoice | "";

    if (code && !rawToken) {
  if (!playerEmail) {
    return jsonError("Player email is required.", 400);
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(playerEmail)) {
    return jsonError("Player email must be valid.", 400);
  }

  if (parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) {
    return jsonError("Parent email must be valid.", 400);
  }

  const joinLink = await findJoinLinkByCode(code);

  if (!joinLink?.teamId) {
    return jsonError("Team join link not found or inactive.", 404);
  }

let playerUser = await prisma.user.findUnique({
  where: { email: playerEmail },
  select: {
    id: true,
    email: true,
    passwordHash: true,
  },
});

if (!playerUser?.id) {
  playerUser = await prisma.user.create({
    data: {
      email: playerEmail,
      role: "PLAYER" as any,
    },
    select: {
      id: true,
      email: true,
      passwordHash: true,
    },
  });
}

const playerHasPassword = Boolean(playerUser.passwordHash);

await prisma.playerProfile.upsert({
  where: { email: playerEmail },
  create: {
    email: playerEmail,
    userId: playerUser.id,
    profileState: "TEAM_INVITED" as any,
    ownershipMode: "TEAM_PENDING" as any,
    ownerTeamId: joinLink.teamId,
    hasActiveTeamBilling: false,
    hasActivePlayerBilling: false,
    billingConflictFlag: false,
    playerPlanTier: "TEAM" as any,
    playerBillingCadence: "monthly",
    playerBillingStatus: "Team Invite Pending",
    schemaVersion: 1,
    data: {},
  },
update: {
  userId: playerUser.id,
  profileState: "TEAM_INVITED" as any,
  ownershipMode: "TEAM_PENDING" as any,
  ownerTeamId: joinLink.teamId,
  hasActiveTeamBilling: false,
  hasActivePlayerBilling: false,
  billingConflictFlag: false,
  playerPlanTier: "TEAM" as any,
  playerBillingCadence: "monthly",
  playerBillingStatus: "Team Invite Pending",
  updatedAt: new Date(),
},
});

const existingPendingInvite = await prisma.teamInvite.findFirst({
  where: {
    teamId: joinLink.teamId,
    invitedEmail: playerEmail,
    status: "PENDING" as any,
  },
  orderBy: {
    createdAt: "desc",
  },
  select: {
    id: true,
    invitedEmail: true,
    parentEmail: true,
    status: true,
    expiresAt: true,
  },
});

if (existingPendingInvite?.id) {
  return NextResponse.json({
    ok: true,
    data: {
      mode: "TEAM_JOIN_LINK_EXISTING_PENDING_INVITE",
      invite: existingPendingInvite,
      team: joinLink.team,
      requiresNewToken: true,
      message:
        "A pending invite already exists for this player. Please ask the team admin to resend the invite from the Invites dashboard.",
      redirectTo: `/team/invite/accept?code=${encodeURIComponent(code)}`,
    },
  });
}

const rawInviteToken = crypto.randomBytes(32).toString("hex");
const tokenHash = sha256Hex(rawInviteToken);
const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

const invite = await prisma.teamInvite.create({
  data: {
    teamId: joinLink.teamId,
    invitedEmail: playerEmail,
    parentEmail: parentEmail || null,
    tokenHash,
    status: "PENDING" as any,
    expiresAt,
  },
  select: {
    id: true,
    invitedEmail: true,
    parentEmail: true,
    status: true,
    expiresAt: true,
  },
});

let setPasswordRawToken = "";

if (!playerHasPassword) {
  await invalidateExistingTokens({
    email: playerEmail,
    purpose: "SET_PASSWORD",
  });

  const createdSetPasswordToken = await createVerificationToken({
    email: playerEmail,
    purpose: "SET_PASSWORD",
  });

  setPasswordRawToken = createdSetPasswordToken.rawToken;
}

return NextResponse.json({
  ok: true,
  data: {
    mode: "TEAM_JOIN_LINK_CREATED_INVITE",
    invite,
    team: joinLink.team,
    redirectTo: playerHasPassword
  ? `/team/invite/accept?token=${encodeURIComponent(rawInviteToken)}`
  : `/set-password?token=${encodeURIComponent(
      setPasswordRawToken
    )}&next=${encodeURIComponent(
      `/team/invite/accept?token=${rawInviteToken}`
    )}`,
  },
});
}

if (!rawToken) return jsonError("Missing invite token.", 400);

    stage = "get-current-user";
    const currentUser = await getCurrentUser().catch(() => null);

    if (!currentUser?.id || !currentUser?.email) {
      return jsonError("You must be logged in to accept this invite.", 401);
    }

    const currentUserEmail = normalizeEmail(currentUser.email);

    stage = "find-invite";
    const invite = await findInviteByRawToken(rawToken);
    if (!invite) return jsonError("Invite not found.", 404);

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
          redirectTo: "/dashboard/player/profile",
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
            playerBillingStatus: "Team Covered",
            schemaVersion: 1,
            data: {},
          },
          select: {
            id: true,
            userId: true,
            ownerTeamId: true,
          },
        });
      }

      const currentPrimaryMembership = await tx.teamMembership.findFirst({
        where: {
          playerProfileId: playerProfile.id,
          role: "PLAYER" as any,
          isActive: true,
          isPrimaryForProfile: true,
          teamId: { not: invite.teamId },
        },
        select: {
          id: true,
          teamId: true,
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
        },
      });

      if (currentPrimaryMembership?.id && !teamChoice) {
        return {
          requiresTeamChoice: true,
          currentTeam: currentPrimaryMembership.team,
          invitedTeam: invite.team,
          playerProfileId: playerProfile.id,
        };
      }

      if (
        currentPrimaryMembership?.id &&
        teamChoice === "KEEP_CURRENT_TEAM"
      ) {
        await tx.teamInvite.update({
          where: { id: invite.id },
          data: {
            status: "CANCELLED" as any,
            updatedAt: new Date(),
          },
        });

        return {
          keptCurrentTeam: true,
          currentTeam: currentPrimaryMembership.team,
          invitedTeam: invite.team,
          playerProfileId: playerProfile.id,
        };
      }

      if (
        currentPrimaryMembership?.id &&
        teamChoice !== "SWITCH_TO_INVITED_TEAM"
      ) {
        return {
          requiresTeamChoice: true,
          currentTeam: currentPrimaryMembership.team,
          invitedTeam: invite.team,
          playerProfileId: playerProfile.id,
        };
      }

      await tx.teamMembership.updateMany({
        where: {
          playerProfileId: playerProfile.id,
          role: "PLAYER" as any,
          isPrimaryForProfile: true,
        },
        data: {
          isPrimaryForProfile: false,
          isActive: false,
        },
      });

      await tx.playerProfile.update({
        where: { id: playerProfile.id },
        data: {
          userId: currentUser.id,

          profileState: "TEAM_OWNED_ACTIVE" as any,
          ownershipMode: "TEAM_PRIMARY" as any,

          ownerTeamId: invite.teamId,

          hasActiveTeamBilling: true,
          hasActivePlayerBilling: false,
          billingConflictFlag: false,

          playerPlanTier: "TEAM" as any,
          playerBillingCadence: "monthly",
          playerBillingStatus: "Team Covered",

          updatedAt: new Date(),
        },
      });

      const existingMembership = await tx.teamMembership.findFirst({
        where: {
          teamId: invite.teamId,
          userId: currentUser.id,
          role: "PLAYER" as any,
        },
        select: { id: true },
      });

      if (existingMembership?.id) {
        await tx.teamMembership.update({
          where: { id: existingMembership.id },
          data: {
            playerProfileId: playerProfile.id,
            isActive: true,
            isPrimaryForProfile: true,
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
        accepted: true,
        invite: acceptedInvite,
        playerProfileId: playerProfile.id,
        switchedFromTeam: currentPrimaryMembership?.team || null,
        team: invite.team,
      };
    });

    if ((result as any)?.requiresTeamChoice) {
      return NextResponse.json({
        ok: true,
        data: {
          requiresTeamChoice: true,
          currentTeam: (result as any).currentTeam,
          invitedTeam: (result as any).invitedTeam,
          playerProfileId: (result as any).playerProfileId,
        },
      });
    }

    if ((result as any)?.keptCurrentTeam) {
      return NextResponse.json({
        ok: true,
        data: {
          accepted: false,
          keptCurrentTeam: true,
          currentTeam: (result as any).currentTeam,
          invitedTeam: (result as any).invitedTeam,
          playerProfileId: (result as any).playerProfileId,
          redirectTo: "/dashboard/player/profile",
        },
      });
    }

    return NextResponse.json({
      ok: true,
      data: {
        accepted: true,
        inviteId: (result as any).invite.id,
        acceptedAt: (result as any).invite.acceptedAt,
        playerProfileId: (result as any).playerProfileId,
        team: invite.team,
        switchedFromTeam: (result as any).switchedFromTeam || null,
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
      `Failed to accept invite at stage: ${stage}. ${
        err?.message || "Unknown error"
      }`,
      500
    );
  }
}