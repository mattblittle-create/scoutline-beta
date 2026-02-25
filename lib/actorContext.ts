// lib/actorContext.ts

import {
  User,
  PlayerProfile,
  TeamMembership,
  TeamRole,
} from "@prisma/client";
import type { ActorContext } from "./profileState";

/**
 * Input shape for deriving an ActorContext.
 *
 * We keep this DB-agnostic: you fetch memberships in your route,
 * then pass them in here.
 */
export type DeriveActorContextInput = {
  user: User | null;
  profile: PlayerProfile;

  /**
   * All active team memberships for THIS user (coach, admin, player, etc.).
   * Typically:
   *   prisma.teamMembership.findMany({
   *     where: {
   *       userId: user.id,
   *       OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
   *     },
   *   })
   */
  userTeamMemberships: TeamMembership[];

  /**
   * All active team memberships for the PLAYER tied to this profile.
   * (i.e. where the player is TeamRole.PLAYER).
   *
   * Typically:
   *   prisma.teamMembership.findMany({
   *     where: {
   *       userId: profile.userId,
   *       role: "PLAYER",
   *       OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
   *     },
   *   })
   */
  playerTeamMemberships: TeamMembership[];
};

/**
 * A tiny helper to decide if membership is "active" based on endDate.
 */
function isActiveMembership(m: TeamMembership): boolean {
  if (!m.endDate) return true;
  return m.endDate > new Date();
}

/**
 * Determine whether the given user is team admin/coach
 * for the current PRIMARY owner team of this profile.
 */
function computeOwnerTeamFlags(
  profile: PlayerProfile,
  userTeamMemberships: TeamMembership[]
): { isOwnerTeamAdmin: boolean; isOwnerTeamCoach: boolean } {
  const ownerTeamId = profile.ownerTeamId;
  if (!ownerTeamId) {
    return {
      isOwnerTeamAdmin: false,
      isOwnerTeamCoach: false,
    };
  }

  const activeOnOwnerTeam = userTeamMemberships.filter(
    (m) => m.teamId === ownerTeamId && isActiveMembership(m)
  );

  const isOwnerTeamAdmin = activeOnOwnerTeam.some(
    (m) => m.role === TeamRole.TEAM_ADMIN
  );
  const isOwnerTeamCoach = activeOnOwnerTeam.some(
    (m) => m.role === TeamRole.COACH
  );

  return { isOwnerTeamAdmin, isOwnerTeamCoach };
}

/**
 * Determine whether the user is staff (coach/admin) on any OTHER team that
 * also has this player on its roster (secondary team staff).
 *
 * I.e. user is COACH/TEAM_ADMIN on Team B AND player is PLAYER on Team B,
 * but Team B is NOT the primary ownerTeamId on the profile.
 */
function computeSecondaryTeamStaffFlag(
  profile: PlayerProfile,
  userTeamMemberships: TeamMembership[],
  playerTeamMemberships: TeamMembership[]
): boolean {
  const ownerTeamId = profile.ownerTeamId;

  // Set of teamIds where this player is currently a PLAYER
  const playerTeams = new Set(
    playerTeamMemberships
      .filter((m) => m.role === TeamRole.PLAYER && isActiveMembership(m))
      .map((m) => m.teamId)
  );

  // Set of teamIds where this user is staff
  const staffTeams = new Set(
    userTeamMemberships
      .filter(
        (m) =>
          isActiveMembership(m) &&
          (m.role === TeamRole.COACH || m.role === TeamRole.TEAM_ADMIN)
      )
      .map((m) => m.teamId)
  );

  // Intersection of staffTeams & playerTeams, excluding the ownerTeamId
  for (const teamId of staffTeams) {
    if (teamId === ownerTeamId) continue;
    if (playerTeams.has(teamId)) {
      return true;
    }
  }

  return false;
}

/**
 * Derive whether this user is the player/parent for the profile.
 *
 * Right now we model this as "same user account as profile.userId".
 * Later, if you add a parent table with linking, you can extend this.
 */
function computeIsPlayerOrParent(
  user: User | null,
  profile: PlayerProfile
): boolean {
  if (!user) return false;
  if (!profile.userId) return false;
  return user.id === profile.userId;
}

/**
 * Simple heuristic: ScoutLine admin if user.role === "ADMIN".
 * Adjust this if you use a different sentinel value for platform admins.
 */
function computeIsScoutlineAdmin(user: User | null): boolean {
  if (!user) return false;
  return user.role === "ADMIN";
}

/**
 * College coach check:
 * For now, we mark someone as a college coach if they have a collegeId,
 * but you can also add a more specific role check if you like.
 */
function computeIsCollegeCoach(user: User | null): boolean {
  if (!user) return false;
  return !!user.collegeId;
}

/**
 * Derive an ActorContext from the current user, the profile, and relevant team memberships.
 *
 * This is the only place that knows how to answer questions like:
 * "Is this user the owner team admin?", "Are they secondary team staff?", etc.
 */
export function deriveActorContext(
  input: DeriveActorContextInput
): ActorContext {
  const { user, profile, userTeamMemberships, playerTeamMemberships } = input;

  const userId = user?.id ?? null;

  const isScoutlineAdmin = computeIsScoutlineAdmin(user);
  const isCollegeCoach = computeIsCollegeCoach(user);
  const isPlayerOrParent = computeIsPlayerOrParent(user, profile);

  const { isOwnerTeamAdmin, isOwnerTeamCoach } = computeOwnerTeamFlags(
    profile,
    userTeamMemberships
  );

  const isSecondaryTeamStaff = computeSecondaryTeamStaffFlag(
    profile,
    userTeamMemberships,
    playerTeamMemberships
  );

  const actorContext: ActorContext = {
    userId,
    isScoutlineAdmin,
    isOwnerTeamAdmin,
    isOwnerTeamCoach,
    isCollegeCoach,
    isPlayerOrParent,
    isSecondaryTeamStaff,
  };

  return actorContext;
}
