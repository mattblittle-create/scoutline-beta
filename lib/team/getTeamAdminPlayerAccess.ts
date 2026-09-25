// lib/team/getTeamAdminPlayerAccess.ts

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export async function getTeamAdminPlayerAccess(playerProfileId?: string | null) {
  const currentUser = await getCurrentUser().catch(() => null);

  if (!currentUser?.id) {
    return {
      ok: false,
      status: 401,
      error: "You must be logged in.",
      user: null,
      team: null,
      playerProfile: null,
    };
  }

  const adminMembership = await prisma.teamMembership.findFirst({
    where: {
      userId: currentUser.id,
      role: "TEAM_ADMIN" as any,
      isActive: true,
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  if (!adminMembership?.teamId) {
    return {
      ok: false,
      status: 403,
      error: "No active team admin membership found.",
      user: currentUser,
      team: null,
      playerProfile: null,
    };
  }

  if (!playerProfileId) {
    return {
      ok: false,
      status: 400,
      error: "playerProfileId is required.",
      user: currentUser,
      team: adminMembership.team,
      playerProfile: null,
    };
  }

  const rosterMembership = await prisma.teamMembership.findFirst({
    where: {
      teamId: adminMembership.teamId,
      playerProfileId,
      role: "PLAYER" as any,
      isActive: true,
    },
    include: {
      playerProfile: true,
    },
  });

  if (!rosterMembership?.playerProfile) {
    return {
      ok: false,
      status: 404,
      error: "Player is not active on this team roster.",
      user: currentUser,
      team: adminMembership.team,
      playerProfile: null,
    };
  }

  return {
    ok: true,
    status: 200,
    error: null,
    user: currentUser,
    team: adminMembership.team,
    playerProfile: rosterMembership.playerProfile,
  };
}