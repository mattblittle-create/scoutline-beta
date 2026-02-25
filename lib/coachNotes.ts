// lib/coachNotes.ts

import {
  PrismaClient,
  User,
  TeamMembership,
  TeamRole,
  CoachNote,
} from "@prisma/client";

const prisma = new PrismaClient();

export class CoachNotesError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export type AddCoachNoteOptions = {
  prisma?: PrismaClient;

  actingUser: User;
  playerProfileId: string;

  /**
   * If teamId is provided, we treat this as a TEAM-context note
   * and require the acting user to be COACH or TEAM_ADMIN on that team.
   *
   * If NO teamId is provided but the user has a collegeId,
   * we treat it as a COLLEGE-context note.
   *
   * If neither teamId nor collegeId is available, we throw.
   */
  teamId?: string | null;

  noteText: string;
  sharedWithOrg?: boolean; // default true
};

export type ListCoachNotesOptions = {
  prisma?: PrismaClient;

  actingUser: User;
  playerProfileId: string;
};

function isActiveMembership(m: TeamMembership): boolean {
  if (!m.endDate) return true;
  return m.endDate > new Date();
}

/**
 * Add a coach note either in TEAM or COLLEGE context.
 */
export async function addCoachNote(
  options: AddCoachNoteOptions
): Promise<CoachNote> {
  const {
    prisma: prismaOverride,
    actingUser,
    playerProfileId,
    teamId,
    noteText,
    sharedWithOrg = true,
  } = options;

  const db = prismaOverride ?? prisma;

  if (!noteText || !noteText.trim()) {
    throw new CoachNotesError("Note text cannot be empty.", 400);
  }

  // Decide org context:
  // 1) TEAM note if teamId is provided
  // 2) COLLEGE note if no teamId but actingUser.collegeId is set
  // 3) Error otherwise
  let finalTeamId: string | null = null;
  let finalCollegeId: string | null = null;

  if (teamId) {
    // Verify actingUser is COACH or TEAM_ADMIN on this team
    const membership = await db.teamMembership.findFirst({
      where: {
        userId: actingUser.id,
        teamId,
        role: { in: [TeamRole.COACH, TeamRole.TEAM_ADMIN] },
        OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
      },
    });

    if (!membership) {
      throw new CoachNotesError(
        "You must be a coach or team admin for this team to add a note.",
        403
      );
    }

    finalTeamId = teamId;
  } else if (actingUser.collegeId) {
    // College note
    finalCollegeId = actingUser.collegeId;
  } else {
    throw new CoachNotesError(
      "You must be associated with a team or college program to add a coach note.",
      403
    );
  }

  const note = await db.coachNote.create({
    data: {
      playerProfileId,
      coachUserId: actingUser.id,
      teamId: finalTeamId,
      collegeId: finalCollegeId,
      noteText: noteText.trim(),
      sharedWithOrg,
    },
  });

  return note;
}

/**
 * List coach notes for a given player profile, scoped to the acting coach's orgs:
 *
 * - TEAM notes: any team where actingUser is COACH/TEAM_ADMIN
 * - COLLEGE notes: the actingUser's collegeId (if any)
 *
 * Within those orgs:
 * - Always show notes written by the actingUser
 * - Also show notes from other coaches in same org if sharedWithOrg = true
 */
export async function listCoachNotesForProfile(
  options: ListCoachNotesOptions
): Promise<CoachNote[]> {
  const { prisma: prismaOverride, actingUser, playerProfileId } = options;
  const db = prismaOverride ?? prisma;

  // Collect teamIds where actingUser is active staff
  const teamMemberships = await db.teamMembership.findMany({
    where: {
      userId: actingUser.id,
      role: { in: [TeamRole.COACH, TeamRole.TEAM_ADMIN] },
      OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
    },
  });

  const staffTeamIds = teamMemberships
    .filter((m) => isActiveMembership(m))
    .map((m) => m.teamId);

  const collegeId = actingUser.collegeId ?? null;

  // If they have neither team nor college, they get nothing (but no error)
  if (staffTeamIds.length === 0 && !collegeId) {
    return [];
  }

  const notes = await db.coachNote.findMany({
    where: {
      playerProfileId,
      OR: [
        // TEAM context: same team and either shared or authored by this user
        ...(staffTeamIds.length
          ? [
              {
                teamId: { in: staffTeamIds },
                OR: [
                  { sharedWithOrg: true },
                  { coachUserId: actingUser.id },
                ],
              },
            ]
          : []),

        // COLLEGE context: same college and either shared or authored by this user
        ...(collegeId
          ? [
              {
                collegeId,
                OR: [
                  { sharedWithOrg: true },
                  { coachUserId: actingUser.id },
                ],
              },
            ]
          : []),
      ],
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return notes;
}
