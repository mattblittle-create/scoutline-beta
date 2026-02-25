// lib/weeklyProfileDigest.ts

import {
  PrismaClient,
  ProfileState,
  ProfileViewerType,
} from "@prisma/client";

const DEFAULT_DAYS = 7;

export type SendWeeklyViewEmailFn = (args: {
  toEmail: string;
  playerName: string | null;
  viewCount: number;
}) => Promise<void>;

export type CreateBellAlertFn = (args: {
  userId: string;
  message: string;
}) => Promise<void>;

export type WeeklyDigestOptions = {
  prisma: PrismaClient;
  sendEmail: SendWeeklyViewEmailFn;
  createBellAlert: CreateBellAlertFn;
  days?: number; // default 7
};

/**
 * Run the weekly profile view digest.
 *
 * - Only counts views from TEAM_COACH, TEAM_ADMIN, COLLEGE_COACH
 * - Only considers profiles in "active-ish" states
 * - ONLY sends if viewCount > 0
 */
export async function runWeeklyProfileViewDigest(
  opts: WeeklyDigestOptions
) {
  const { prisma, sendEmail, createBellAlert, days = DEFAULT_DAYS } = opts;

  const now = new Date();
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // 1) Get all profiles that are eligible for a digest
  const profiles = await prisma.playerProfile.findMany({
    where: {
      profileState: {
        in: [
          ProfileState.PLAYER_OWNED_ACTIVE,
          ProfileState.TEAM_OWNED_ACTIVE,
          ProfileState.TEAM_REMOVAL_PENDING_TRANSFER,
        ],
      },
    },
    include: {
      user: true, // to get email + name
    },
  });

  for (const profile of profiles) {
    const playerUser = profile.user;

    // If we don't have a user (weird, but possible), skip digest
    if (!playerUser) continue;
    if (!playerUser.email) continue;

    // 2) Count meaningful views in the last N days
    const viewCount = await prisma.profileViewEvent.count({
      where: {
        playerProfileId: profile.id,
        viewedAt: { gte: since },

        viewerType: {
          in: [
            ProfileViewerType.TEAM_COACH,
            ProfileViewerType.TEAM_ADMIN,
            ProfileViewerType.COLLEGE_COACH,
          ],
        },
      },
    });

    // 3) ONLY send if viewCount > 0
    if (viewCount <= 0) {
      continue;
    }

    const playerName = playerUser.name ?? null;

    // 4) Send email
    await sendEmail({
      toEmail: playerUser.email,
      playerName,
      viewCount,
    });

    // 5) Create bell alert (if you have a notifications table)
    await createBellAlert({
      userId: playerUser.id,
      message:
        viewCount === 1
          ? "Your profile was viewed 1 time this week!"
          : `Your profile was viewed ${viewCount} times this week!`,
    });

    // OPTIONAL: if you want to mark events as countedInWeekly, you can add:
    // await prisma.profileViewEvent.updateMany({
    //   where: {
    //     playerProfileId: profile.id,
    //     viewedAt: { gte: since },
    //     viewerType: {
    //       in: [
    //         ProfileViewerType.TEAM_COACH,
    //         ProfileViewerType.TEAM_ADMIN,
    //         ProfileViewerType.COLLEGE_COACH,
    //       ],
    //     },
    //   },
    //   data: {
    //     countedInWeekly: true,
    //   },
    // });
  }
}
