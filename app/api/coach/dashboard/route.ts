// app/api/coach/dashboard/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProfileState, OwnershipMode, TeamRole } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CoachDashboardResponse = {
  ok: true;
  data: {
    coach: {
      id: string;
      name: string | null;
      email: string;

      collegeId: string | null;
      collegeName: string | null;

      coachAccountType: string | null;
      coachBillingStatus: string | null;
      recruitingServiceName: string | null;
      recruitingServiceWebsite: string | null;
    };
    teams: Array<{
      teamId: string;
      teamName: string;
      teamType: string;
      role: TeamRole;
      season: string | null;
      isPrimaryForProfile: boolean;
    }>;
    teamPlayers: Array<{
      teamId: string;
      teamName: string;
      teamType: string;
      playerUserId: string;
      playerName: string | null;
      playerEmail: string | null;
      playerProfileId: string | null;
      profileState: ProfileState | null;
      ownershipMode: OwnershipMode | null;
      isPrimaryTeamForProfile: boolean;
      gradYear: number | null;
      primaryPos: string | null;
      secondaryPos: string | null;
      bats: string | null;
      throws: string | null;
    }>;
    recruitingBoard: Array<{
      entryId: string;
      createdAt: string;
      notifiedPlayer: boolean;
      label: string | null;

      playerProfileId: string;
      profileState: ProfileState;
      ownershipMode: OwnershipMode;
      playerUserId: string | null;
      playerName: string | null;
      playerEmail: string | null;
      gradYear: number | null;
      primaryPos: string | null;
      secondaryPos: string | null;
      bats: string | null;
      throws: string | null;
    }>;
  };
};

type ErrorResponse = { ok: false; error: string };

export async function GET() {
  try {
    const coachUser = await getCurrentUser();

    if (!coachUser) {
      return NextResponse.json<ErrorResponse>({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const coachSummary: CoachDashboardResponse["data"]["coach"] = {
      id: coachUser.id,
      name: coachUser.name ?? null,
      email: coachUser.email,
      collegeId: coachUser.collegeId ?? null,
      collegeName: coachUser.college?.name ?? null,

      coachAccountType: coachUser.coachProfile?.coachAccountType ?? null,
      coachBillingStatus: coachUser.coachProfile?.coachBillingStatus ?? null,
      recruitingServiceName: coachUser.coachProfile?.recruitingServiceName ?? null,
      recruitingServiceWebsite: coachUser.coachProfile?.recruitingServiceWebsite ?? null,
    };

    const coachAccountType = coachUser.coachProfile?.coachAccountType ?? null;
    const coachBillingStatus = coachUser.coachProfile?.coachBillingStatus ?? null;

    const canUseRecruitingBoard =
      coachAccountType === "COLLEGE_COACH" ||
      (coachAccountType === "RECRUITING_SERVICE" && coachBillingStatus === "ACTIVE");

    // Teams coached/admined
    const coachMemberships = await prisma.teamMembership.findMany({
      where: {
        userId: coachUser.id,
        role: { in: [TeamRole.COACH, TeamRole.TEAM_ADMIN] },
        OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
      },
      include: { team: true },
    });

    const teams = coachMemberships.map((m) => ({
      teamId: m.teamId,
      teamName: m.team.name,
      teamType: m.team.teamType,
      role: m.role,
      season: m.season ?? null,
      isPrimaryForProfile: m.isPrimaryForProfile,
    }));

    const teamIds = coachMemberships.map((m) => m.teamId);

    // Players on those teams
    const playerMemberships = teamIds.length
      ? await prisma.teamMembership.findMany({
          where: {
            teamId: { in: teamIds },
            role: TeamRole.PLAYER,
            OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
          },
          include: {
            team: true,
            user: {
              include: {
                Player: true,
                PlayerProfile: true,
              },
            },
          },
        })
      : [];

const teamPlayers = playerMemberships.map((m) => {
  const u = m.user;
  const player = u?.Player ?? null;
  const profile = u?.PlayerProfile ?? null;

  return {
    teamId: m.teamId,
    teamName: m.team.name,
    teamType: m.team.teamType,
    playerUserId: u?.id ?? "",
    playerName: u?.name ?? null,
    playerEmail: u?.email ?? null,
    playerProfileId: profile?.id ?? null,
    profileState: profile?.profileState ?? null,
    ownershipMode: profile?.ownershipMode ?? null,
    isPrimaryTeamForProfile: m.isPrimaryForProfile,
    gradYear: player?.gradYear ?? null,
    primaryPos: player?.primaryPos ?? null,
    secondaryPos: player?.secondaryPos ?? null,
    bats: player?.bats ?? null,
    throws: player?.throws ?? null,
  };
});

    // Recruiting board only for entitled accounts AND if collegeId exists
    let recruitingBoard: CoachDashboardResponse["data"]["recruitingBoard"] = [];
    if (canUseRecruitingBoard && coachUser.collegeId) {
      const entries = await prisma.recruitingBoardEntry.findMany({
        where: { collegeId: coachUser.collegeId },
        include: {
          playerProfile: {
            include: {
              user: { include: { Player: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      recruitingBoard = entries.map((entry) => {
        const profile = entry.playerProfile;
        const u = profile.user;
        const player = u?.Player ?? null;

        return {
          entryId: entry.id,
          createdAt: entry.createdAt.toISOString(),
          notifiedPlayer: entry.notifiedPlayer,
          label: entry.label,

          playerProfileId: profile.id,
          profileState: profile.profileState,
          ownershipMode: profile.ownershipMode,
          playerUserId: profile.userId,
          playerName: u?.name ?? null,
          playerEmail: u?.email ?? null,
          gradYear: player?.gradYear ?? null,
          primaryPos: player?.primaryPos ?? null,
          secondaryPos: player?.secondaryPos ?? null,
          bats: player?.bats ?? null,
          throws: player?.throws ?? null,
        };
      });
    }

    return NextResponse.json<CoachDashboardResponse>({
      ok: true,
      data: { coach: coachSummary, teams, teamPlayers, recruitingBoard },
    });
  } catch (err: any) {
    // IMPORTANT: return JSON, not HTML, so the client can show the real error
    console.error("coach/dashboard GET error:", err);
    return NextResponse.json<ErrorResponse>(
      { ok: false, error: err?.message || "Server error (coach dashboard)" },
      { status: 500 }
    );
  }
}
