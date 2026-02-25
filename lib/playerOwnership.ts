// lib/playerOwnership.ts

import {
  PrismaClient,
  PlayerProfile,
  User,
  ProfileState,
  TeamRole,
} from "@prisma/client";
import { applyProfileEvent } from "./profileState";

const prisma = new PrismaClient();

export class PlayerOwnershipError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * Email / notification hooks
 */

export type NotifyPlayerOwnershipEmailFn = (args: {
  playerEmail: string;
  playerName: string | null;
  context:
    | "STARTED_FROM_ARCHIVED"
    | "STARTED_FROM_PLAYER_OWNED"
    | "TAKEN_FROM_PENDING_TRANSFER"
    | "TAKEN_FROM_TEAM_ACTIVE";
}) => Promise<void>;

export type NotifyTeamAdminsOwnershipChangeFn = (args: {
  teamAdminEmails: string[];
  teamName: string;
  playerName: string | null;
  context: "PLAYER_TOOK_OWNERSHIP_FROM_PENDING_TRANSFER" | "PLAYER_TOOK_OWNERSHIP_FROM_TEAM_ACTIVE";
}) => Promise<void>;

/**
 * Options for starting/resuming a player-owned plan.
 */
export type StartOrResumePlayerPlanOptions = {
  prisma?: PrismaClient;
  actingUser: User;         // player (or parent account – currently same record)
  profileId: string;

  notifyPlayerEmail?: NotifyPlayerOwnershipEmailFn;
  notifyTeamAdmins?: NotifyTeamAdminsOwnershipChangeFn;
};

/**
 * Ensure the acting user is the profile owner (player/parent).
 * Right now: profile.userId === actingUser.id
 */
async function assertIsPlayerForProfile(
  db: PrismaClient,
  actingUser: User,
  profileId: string
): Promise<PlayerProfile & { user: User | null }> {
  const profile = await db.playerProfile.findUnique({
    where: { id: profileId },
    include: { user: true },
  });

  if (!profile) {
    throw new PlayerOwnershipError("Player profile not found.", 404);
  }

  if (!profile.userId || profile.userId !== actingUser.id) {
    throw new PlayerOwnershipError(
      "You are not allowed to manage this profile.",
      403
    );
  }

  return profile;
}

/**
 * Get all active TEAM_ADMIN emails for a given teamId.
 */
async function getTeamAdminEmails(
  db: PrismaClient,
  teamId: string
): Promise<{ teamName: string; emails: string[] }> {
  const memberships = await db.teamMembership.findMany({
    where: {
      teamId,
      role: TeamRole.TEAM_ADMIN,
      OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
    },
    include: {
      team: true,
      user: true,
    },
  });

  if (!memberships.length) {
    return { teamName: "Your team", emails: [] };
  }

  const teamName = memberships[0].team.name;
  const emails = memberships
    .map((m) => m.user.email)
    .filter((e): e is string => !!e);

  return { teamName, emails };
}

/**
 * Helper: create a snapshot for the current owner team (if any).
 * Called when the team is about to lose live ownership.
 */
async function snapshotForCurrentOwnerTeam(
  db: PrismaClient,
  profile: PlayerProfile
) {
  if (!profile.ownerTeamId) return;

  await db.teamProfileSnapshot.create({
    data: {
      teamId: profile.ownerTeamId,
      playerProfileId: profile.id,
      snapshot: profile.data,
    },
  });
}

/**
 * START or RESUME a player-owned plan for this profile.
 *
 * Handles:
 * - ARCHIVED_NO_ACTIVE_PLAN → PLAYER_OWNED_ACTIVE
 * - PLAYER_OWNED_ACTIVE (ensures hasActivePlayerBilling = true)
 * - TEAM_REMOVAL_PENDING_TRANSFER → PLAYER_OWNED_ACTIVE (player takes over during window)
 *
 * Does NOT handle taking over from TEAM_OWNED_ACTIVE (that's a separate flow below).
 */
export async function startOrResumePlayerPlanForProfile(
  options: StartOrResumePlayerPlanOptions
): Promise<PlayerProfile> {
  const {
    prisma: prismaOverride,
    actingUser,
    profileId,
    notifyPlayerEmail,
    notifyTeamAdmins,
  } = options;

  const db = prismaOverride ?? prisma;

  // 1) Make sure actingUser is the player for this profile
  const profile = await assertIsPlayerForProfile(db, actingUser, profileId);

  const currentState = profile.profileState;
  const originalOwnerTeamId = profile.ownerTeamId; // may be set if coming from pending transfer

  let patch = {};

  if (currentState === ProfileState.ARCHIVED_NO_ACTIVE_PLAN) {
    // Player is reviving an archived profile with a new plan
    patch = applyProfileEvent(profile, { type: "PLAYER_BUY_PLAN" });
  } else if (currentState === ProfileState.PLAYER_OWNED_ACTIVE) {
    // Already player-owned; make sure billing is on for this profile
    patch = applyProfileEvent(profile, { type: "PLAYER_BUY_PLAN" });
  } else if (currentState === ProfileState.TEAM_REMOVAL_PENDING_TRANSFER) {
    // Player is taking over during the transfer window
    // This also flips ownership to PLAYER_PRIMARY & sets hasActivePlayerBilling = true
    patch = applyProfileEvent(profile, { type: "PLAYER_TAKE_OWNERSHIP" });

    // Snapshot for team is already created by the removal helper,
    // so we don't need to snapshot again here.
  } else {
    throw new PlayerOwnershipError(
      "This profile cannot start a player-owned plan from the current state.",
      400
    );
  }

  const updated = await db.playerProfile.update({
    where: { id: profile.id },
    data: patch,
    include: { user: true },
  });

  // Notifications

  const playerUser = updated.user ?? profile.user;
  const playerEmail = playerUser?.email ?? null;
  const playerName = playerUser?.name ?? null;

  if (notifyPlayerEmail && playerEmail) {
    const context: Parameters<NotifyPlayerOwnershipEmailFn>[0]["context"] =
      currentState === ProfileState.ARCHIVED_NO_ACTIVE_PLAN
        ? "STARTED_FROM_ARCHIVED"
        : currentState === ProfileState.PLAYER_OWNED_ACTIVE
        ? "STARTED_FROM_PLAYER_OWNED"
        : "TAKEN_FROM_PENDING_TRANSFER";

    await notifyPlayerEmail({
      playerEmail,
      playerName,
      context,
    });
  }

  // If we came from TEAM_REMOVAL_PENDING_TRANSFER and there was an owner team,
  // notify that team's admins the player took over.
  if (
    notifyTeamAdmins &&
    currentState === ProfileState.TEAM_REMOVAL_PENDING_TRANSFER &&
    originalOwnerTeamId
  ) {
    const { teamName, emails } = await getTeamAdminEmails(
      db,
      originalOwnerTeamId
    );

    if (emails.length > 0) {
      await notifyTeamAdmins({
        teamAdminEmails: emails,
        teamName,
        playerName,
        context: "PLAYER_TOOK_OWNERSHIP_FROM_PENDING_TRANSFER",
      });
    }
  }

  return updated;
}

/**
 * Options for a "Take back ownership" flow while the team is still active owner.
 */
export type TakeOwnershipFromTeamOptions = {
  prisma?: PrismaClient;
  actingUser: User; // player/parent
  profileId: string;

  notifyPlayerEmail?: NotifyPlayerOwnershipEmailFn;
  notifyTeamAdmins?: NotifyTeamAdminsOwnershipChangeFn;
};

/**
 * Player/parent takes ownership WHILE the team still owns the profile.
 *
 * Handles:
 * - TEAM_OWNED_ACTIVE → PLAYER_OWNED_ACTIVE
 *   - Creates a TeamProfileSnapshot so the team has a frozen copy
 *   - Moves ownershipMode to PLAYER_PRIMARY
 *   - hasActivePlayerBilling = true
 *   - hasActiveTeamBilling = false
 */
export async function takeOwnershipFromTeamNow(
  options: TakeOwnershipFromTeamOptions
): Promise<PlayerProfile> {
  const {
    prisma: prismaOverride,
    actingUser,
    profileId,
    notifyPlayerEmail,
    notifyTeamAdmins,
  } = options;

  const db = prismaOverride ?? prisma;

  // 1) Ensure actingUser is the player for this profile
  const profile = await assertIsPlayerForProfile(db, actingUser, profileId);

  if (profile.profileState !== ProfileState.TEAM_OWNED_ACTIVE) {
    throw new PlayerOwnershipError(
      "You can only take ownership from a team while the profile is team-owned and active.",
      400
    );
  }

  if (!profile.ownerTeamId) {
    throw new PlayerOwnershipError(
      "This profile does not have a primary owner team.",
      400
    );
  }

  const ownerTeamId = profile.ownerTeamId;

  // 2) Snapshot the current profile for the team so they keep a frozen copy
  await snapshotForCurrentOwnerTeam(db, profile);

  // 3) Apply PLAYER_TAKE_OWNERSHIP event
  const patch = applyProfileEvent(profile, { type: "PLAYER_TAKE_OWNERSHIP" });

  const updated = await db.playerProfile.update({
    where: { id: profile.id },
    data: patch,
    include: { user: true },
  });

  // 4) Notifications

  const playerUser = updated.user ?? profile.user;
  const playerEmail = playerUser?.email ?? null;
  const playerName = playerUser?.name ?? null;

  if (notifyPlayerEmail && playerEmail) {
    await notifyPlayerEmail({
      playerEmail,
      playerName,
      context: "TAKEN_FROM_TEAM_ACTIVE",
    });
  }

  if (notifyTeamAdmins) {
    const { teamName, emails } = await getTeamAdminEmails(db, ownerTeamId);

    if (emails.length > 0) {
      await notifyTeamAdmins({
        teamAdminEmails: emails,
        teamName,
        playerName,
        context: "PLAYER_TOOK_OWNERSHIP_FROM_TEAM_ACTIVE",
      });
    }
  }

  return updated;
}
