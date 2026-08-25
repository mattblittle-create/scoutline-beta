// lib/teamPlayerRemoval.ts

import {
  Prisma,
  PrismaClient,
  PlayerProfile,
  User,
  TeamMembership,
  TeamRole,
  ProfileState,
} from "@prisma/client";
import { applyProfileEvent } from "./profileState";

const prisma = new PrismaClient();

export class TeamRemovalError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export type TeamRemovePlayerEmailFn = (args: {
  playerEmail: string | null;
  playerName: string | null;
  teamName: string;
  daysToTransfer: number;
}) => Promise<void>;

export type TeamRemovePlayerAdminEmailFn = (args: {
  teamAdminEmail: string | null;
  teamAdminName: string | null;
  playerName: string | null;
  teamName: string;
}) => Promise<void>;

export type RemovePlayerFromTeamOptions = {
  prisma?: PrismaClient; // optional override, default global prisma
  actingUser: User;      // team admin performing the removal
  profileId: string;     // PlayerProfile.id
  teamId: string;        // Team.id (should match profile.ownerTeamId)

  daysToTransfer?: number; // default: 15

  // Optional hooks for email/notifications
  notifyPlayerAndParent?: TeamRemovePlayerEmailFn;
  notifyTeamAdmin?: TeamRemovePlayerAdminEmailFn;
};

/**
 * Ensure the acting user is an active TEAM_ADMIN on the given team.
 */
async function assertIsTeamAdminForTeam(
  prisma: PrismaClient,
  actingUser: User,
  teamId: string
): Promise<{ teamMembership: TeamMembership; teamName: string }> {
  const membership = await prisma.teamMembership.findFirst({
    where: {
      userId: actingUser.id,
      teamId,
      role: TeamRole.TEAM_ADMIN,
      OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
    },
    include: {
      team: true,
    },
  });

  if (!membership || !membership.team) {
    throw new TeamRemovalError(
      "You are not a team admin for this team.",
      403
    );
  }

  return {
    teamMembership: membership,
    teamName: membership.team.name,
  };
}

/**
 * Remove a player from a team that currently OWNS their profile.
 *
 * This function:
 * - Verifies acting user is TEAM_ADMIN for the owner team
 * - Verifies the profile is TEAM_OWNED_ACTIVE and owned by that team
 * - Creates a TeamProfileSnapshot of the current profile.data
 * - Applies the TEAM_REMOVE_PLAYER event to transition the profile to TEAM_REMOVAL_PENDING_TRANSFER
 * - Optionally sends notifications to player/parent + team admin
 */
export async function removePlayerFromTeamProfile(
  options: RemovePlayerFromTeamOptions
): Promise<PlayerProfile> {
  const {
    prisma: prismaOverride,
    actingUser,
    profileId,
    teamId,
    daysToTransfer = 15,
    notifyPlayerAndParent,
    notifyTeamAdmin,
  } = options;

  const db = prismaOverride ?? prisma;

  // 1) Verify acting user is TEAM_ADMIN on this team
  const { teamName } = await assertIsTeamAdminForTeam(db, actingUser, teamId);

  // 2) Load the PlayerProfile (with user info)
  const profile = await db.playerProfile.findUnique({
    where: { id: profileId },
    include: {
      user: true,
    },
  });

  if (!profile) {
    throw new TeamRemovalError("Player profile not found.", 404);
  }

  // 3) Ensure this team is the primary owner
  if (profile.ownerTeamId !== teamId) {
    throw new TeamRemovalError(
      "This team is not the primary owner of this profile.",
      403
    );
  }

  if (profile.profileState !== ProfileState.TEAM_OWNED_ACTIVE) {
    throw new TeamRemovalError(
      "Only TEAM_OWNED_ACTIVE profiles can be removed.",
      400
    );
  }

  // 4) Create TeamProfileSnapshot with the current profile.data
  await db.teamProfileSnapshot.create({
    data: {
      teamId,
      playerProfileId: profile.id,
      snapshot: profile.data ?? Prisma.JsonNull,
    },
  });

  // 5) Apply the state transition TEAM_REMOVE_PLAYER
  const patch = applyProfileEvent(profile, { type: "TEAM_REMOVE_PLAYER" });

  const updated = await db.playerProfile.update({
    where: { id: profile.id },
    data: patch,
    include: { user: true },
  });

  // 6) Notifications (if handlers provided)
  const playerUser = updated.user ?? profile.user;
  const playerEmail = playerUser?.email ?? null;
  const playerName = playerUser?.name ?? null;

  if (notifyPlayerAndParent && playerEmail) {
    await notifyPlayerAndParent({
      playerEmail,
      playerName,
      teamName,
      daysToTransfer,
    });
  }

  if (notifyTeamAdmin && actingUser.email) {
    await notifyTeamAdmin({
      teamAdminEmail: actingUser.email,
      teamAdminName: actingUser.name ?? null,
      playerName,
      teamName,
    });
  }

  return updated;
}