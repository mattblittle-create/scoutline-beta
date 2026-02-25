// lib/profileViews.ts

import {
  PrismaClient,
  PlayerProfile,
  User,
  TeamMembership,
  TeamRole,
  ProfileViewerType,
  ProfileViewSource,
} from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Input to recordProfileView:
 *
 * You fetch the profile, the current user (if any), and the user's team
 * memberships in your route, then pass them in here.
 */
export type RecordProfileViewInput = {
  profile: PlayerProfile;

  viewerUser: User | null;

  /**
   * All active team memberships for THIS viewer user.
   * Typically:
   *
   * const viewerTeamMemberships = viewerUser
   *   ? await prisma.teamMembership.findMany({
   *       where: {
   *         userId: viewerUser.id,
   *         OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
   *       },
   *     })
   *   : [];
   */
  viewerTeamMemberships: TeamMembership[];

  source: ProfileViewSource;

  /**
   * Optional hashes for basic anon dedupe.
   * You can pass a hashed IP + UA if you want to reduce duplicate
   * anonymous events from the same browser in a short window.
   */
  ipHash?: string | null;
  userAgentHash?: string | null;
};

/**
 * Simple helper: is this membership still active?
 */
function isActiveMembership(m: TeamMembership): boolean {
  if (!m.endDate) return true;
  return m.endDate > new Date();
}

/**
 * Decide what kind of viewer this is, and capture team/college context.
 */
function classifyViewer(
  profile: PlayerProfile,
  viewerUser: User | null,
  viewerTeamMemberships: TeamMembership[]
): {
  viewerType: ProfileViewerType;
  teamId: string | null;
  collegeId: string | null;
} {
  if (!viewerUser) {
    return {
      viewerType: ProfileViewerType.ANONYMOUS,
      teamId: null,
      collegeId: null,
    };
  }

  // ScoutLine admin?
  if (viewerUser.role === "ADMIN") {
    return {
      viewerType: ProfileViewerType.SCOUTLINE_ADMIN,
      teamId: null,
      collegeId: null,
    };
  }

  // Player viewing their own profile
  if (profile.userId && profile.userId === viewerUser.id) {
    return {
      viewerType: ProfileViewerType.PLAYER_SELF,
      teamId: null,
      collegeId: null,
    };
  }

  // TODO: when you add a proper Parent model, you can map parents here:
  // if (isLinkedParent(viewerUser, profile.userId)) viewerType = PARENT

  // College coach / recruiter
  if (viewerUser.collegeId) {
    return {
      viewerType: ProfileViewerType.COLLEGE_COACH,
      teamId: null,
      collegeId: viewerUser.collegeId,
    };
  }

  // Team staff (coach/admin) on the owner team (if any)
  if (profile.ownerTeamId) {
    const activeOnOwnerTeam = viewerTeamMemberships.filter(
      (m) =>
        m.teamId === profile.ownerTeamId &&
        isActiveMembership(m) &&
        (m.role === TeamRole.COACH || m.role === TeamRole.TEAM_ADMIN)
    );

    const isOwnerAdmin = activeOnOwnerTeam.some(
      (m) => m.role === TeamRole.TEAM_ADMIN
    );
    const isOwnerCoach = activeOnOwnerTeam.some(
      (m) => m.role === TeamRole.COACH
    );

    if (isOwnerAdmin) {
      return {
        viewerType: ProfileViewerType.TEAM_ADMIN,
        teamId: profile.ownerTeamId,
        collegeId: null,
      };
    }
    if (isOwnerCoach) {
      return {
        viewerType: ProfileViewerType.TEAM_COACH,
        teamId: profile.ownerTeamId,
        collegeId: null,
      };
    }
  }

  // Staff on some OTHER team the player might be on
  // (you can also treat this as TEAM_COACH/TEAM_ADMIN with that teamId,
  // but for now we just mark them as TEAM_COACH with their first active team).
  const anyActiveStaff = viewerTeamMemberships.find(
    (m) =>
      isActiveMembership(m) &&
      (m.role === TeamRole.COACH || m.role === TeamRole.TEAM_ADMIN)
  );

  if (anyActiveStaff) {
    return {
      viewerType:
        anyActiveStaff.role === TeamRole.TEAM_ADMIN
          ? ProfileViewerType.TEAM_ADMIN
          : ProfileViewerType.TEAM_COACH,
      teamId: anyActiveStaff.teamId,
      collegeId: null,
    };
  }

  // Default: treat as anonymous-ish logged-in user
  return {
    viewerType: ProfileViewerType.ANONYMOUS,
    teamId: null,
    collegeId: null,
  };
}

/**
 * Record a profile view with a small dedupe window so we don't flood
 * the DB if someone spams refresh.
 *
 * Returns the existing or newly-created ProfileViewEvent row.
 */
export async function recordProfileView(
  input: RecordProfileViewInput
) {
  const {
    profile,
    viewerUser,
    viewerTeamMemberships,
    source,
    ipHash = null,
    userAgentHash = null,
  } = input;

  const { viewerType, teamId, collegeId } = classifyViewer(
    profile,
    viewerUser,
    viewerTeamMemberships
  );

  const viewerUserId = viewerUser?.id ?? null;

  // Small dedupe window: if same viewer/viewerType/source viewed the same
  // profile in the last N minutes, don't create a new row.
  const dedupeWindowMinutes = 10;
  const cutoff = new Date(Date.now() - dedupeWindowMinutes * 60 * 1000);

  const existing = await prisma.profileViewEvent.findFirst({
    where: {
      playerProfileId: profile.id,
      viewerUserId,
      viewerType,
      source,
      viewedAt: { gte: cutoff },

      // For anonymous viewers, we can fall back to IP+UA hash if present
      ...(viewerUserId
        ? {}
        : ipHash
        ? {
            ipHash,
          }
        : {}),
    },
  });

  if (existing) {
    return existing;
  }

  // Create a new event
  const created = await prisma.profileViewEvent.create({
    data: {
      playerProfileId: profile.id,
      viewerUserId,
      viewerType,
      source,
      teamId,
      collegeId,
      ipHash,
      userAgentHash,
    },
  });

  return created;
}
