// lib/recruitingBoard.ts

import {
  PrismaClient,
  User,
  RecruitingBoardEntry,
  PlayerProfile,
  College,
  ProfileState,
} from "@prisma/client";

const prisma = new PrismaClient();

export class RecruitingBoardError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * If a coach opts to notify a player when adding them to the board,
 * we call this function.
 */
export type NotifyPlayerAddedToBoardFn = (args: {
  playerEmail: string;
  playerName: string | null;
  collegeName: string;
}) => Promise<void>;

/**
 * ============
 * Add to Recruiting Board
 * ============
 */

export type AddToRecruitingBoardOptions = {
  prisma?: PrismaClient;

  actingUser: User;          // college coach
  playerProfileId: string;
  label?: string;            // e.g. "2028 catcher target", "High priority"

  /**
   * If provided, this will be called when we successfully add
   * the player AND the coach toggled "notify player" on.
   */
  notifyPlayerFn?: NotifyPlayerAddedToBoardFn;

  /**
   * Whether the coach chose to notify the player that they're
   * on this program's Recruiting Board.
   */
  notifyPlayer?: boolean;
};

/**
 * Add a player to the acting coach's college Recruiting Board.
 *
 * Shared board: all coaches with the same collegeId see the same board.
 */
export async function addToRecruitingBoard(
  options: AddToRecruitingBoardOptions
): Promise<RecruitingBoardEntry> {
  const {
    prisma: prismaOverride,
    actingUser,
    playerProfileId,
    label,
    notifyPlayerFn,
    notifyPlayer = false,
  } = options;

  const db = prismaOverride ?? prisma;

  // 1) Ensure this user is a college coach (has a collegeId)
  if (!actingUser.collegeId) {
    throw new RecruitingBoardError(
      "You must be associated with a college program to use the Recruiting Board.",
      403
    );
  }

  const college = await db.college.findUnique({
    where: { id: actingUser.collegeId },
  });

  if (!college) {
    throw new RecruitingBoardError(
      "Your college program could not be found.",
      404
    );
  }

  // 2) Load the player profile
  const profile = await db.playerProfile.findUnique({
    where: { id: playerProfileId },
    include: { user: true },
  });

  if (!profile) {
    throw new RecruitingBoardError("Player profile not found.", 404);
  }

  // Optional: don't allow adding archived profiles
  if (profile.profileState === ProfileState.ARCHIVED_NO_ACTIVE_PLAN) {
    throw new RecruitingBoardError(
      "This profile is archived and cannot be added to a Recruiting Board.",
      400
    );
  }

  // 3) Create the board entry (relies on @@unique([collegeId, playerProfileId]))
  let entry: RecruitingBoardEntry;

  try {
    entry = await db.recruitingBoardEntry.create({
      data: {
        collegeId: college.id,
        playerProfileId: profile.id,
        addedByCoachId: actingUser.id,
        label,
        notifiedPlayer: false, // may be updated below
      },
    });
  } catch (err: any) {
    // If the unique constraint is hit, surface a friendlier message
    if (err.code === "P2002") {
      throw new RecruitingBoardError(
        "This player is already on your Recruiting Board.",
        409
      );
    }
    throw err;
  }

// 4) Create in-app player notification for recruiting board add.
// This is an internal ScoutLine activity signal and does not depend on the coach
// choosing optional email notification.
const playerUser = profile.user;
const playerEmail = playerUser?.email ?? null;
const playerName = playerUser?.name ?? null;

if (playerUser?.id) {
  await db.notification.create({
    data: {
      userId: playerUser.id,
      type: "PLAYER_ADDED_TO_RECRUITING_BOARD",
      message: `A coach from ${college.name} added you to their recruiting board.`,
      data: {
        recruitingBoardEntryId: entry.id,
        playerProfileId: profile.id,
        collegeId: college.id,
        collegeName: college.name,
      },
    },
  });

  entry = await db.recruitingBoardEntry.update({
    where: { id: entry.id },
    data: { notifiedPlayer: true },
  });
}

// 5) Optionally send external/player email if the coach toggled notification on.
if (notifyPlayer && notifyPlayerFn && playerEmail) {
    await notifyPlayerFn({
      playerEmail,
      playerName,
      collegeName: college.name,
    });
  }

  return entry;
}

/**
 * ============
 * Remove from Recruiting Board
 * ============
 */

export type RemoveFromRecruitingBoardOptions = {
  prisma?: PrismaClient;
  actingUser: User;          // college coach
  playerProfileId: string;
};

export async function removeFromRecruitingBoard(
  options: RemoveFromRecruitingBoardOptions
): Promise<void> {
  const { prisma: prismaOverride, actingUser, playerProfileId } = options;
  const db = prismaOverride ?? prisma;

  if (!actingUser.collegeId) {
    throw new RecruitingBoardError(
      "You must be associated with a college program to modify the Recruiting Board.",
      403
    );
  }

  // Delete by collegeId + playerProfileId (unique pair)
  await db.recruitingBoardEntry.deleteMany({
    where: {
      collegeId: actingUser.collegeId,
      playerProfileId,
    },
  });
}

/**
 * ============
 * List a college's Recruiting Board
 * ============
 */

export type ListRecruitingBoardOptions = {
  prisma?: PrismaClient;
  actingUser: User;          // college coach
  /**
   * Optional: overrides for filters if you want to support them later.
   * For now, it's just the full board for that college.
   */
};

export type RecruitingBoardWithPlayer = RecruitingBoardEntry & {
  playerProfile: PlayerProfile & {
    user: User | null;
  };
  college: College;
};

/**
 * Get the full Recruiting Board for the acting user's college program.
 *
 * All coaches with the same collegeId see the same list.
 */
export async function listRecruitingBoardForCollege(
  options: ListRecruitingBoardOptions
): Promise<RecruitingBoardWithPlayer[]> {
  const { prisma: prismaOverride, actingUser } = options;
  const db = prismaOverride ?? prisma;

  if (!actingUser.collegeId) {
    throw new RecruitingBoardError(
      "You must be associated with a college program to view the Recruiting Board.",
      403
    );
  }

  const entries = await db.recruitingBoardEntry.findMany({
    where: {
      collegeId: actingUser.collegeId,
    },
    include: {
      playerProfile: {
        include: {
          user: true,
        },
      },
      college: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return entries;
}
