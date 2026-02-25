// app/api/coach/player/[profileId]/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ProfileViewSource,
  ProfileState,
  OwnershipMode,
  TeamRole,
} from "@prisma/client";
import { deriveActorContext } from "@/lib/actorContext";
import { getProfilePermissions } from "@/lib/profileState";
import { recordProfileView } from "@/lib/profileViews";

type CoachPlayerResponse =
  | {
      ok: true;
      data: {
        profile: {
          id: string;
          email: string;
          profileState: ProfileState;
          ownershipMode: OwnershipMode;
          ownerTeamId: string | null;
          hasActiveTeamBilling: boolean;
          hasActivePlayerBilling: boolean;
        };
        user: {
          id: string;
          name: string | null;
          email: string;
        } | null;
        player: {
          gradYear: number | null;
          primaryPos: string | null;
          secondaryPos: string | null;
          bats: string | null;
          throws: string | null;
          hsName: string | null;
          travelTeam: string | null;
          hometown: string | null;
          state: string | null;
        } | null;
      };
    }
  | {
      ok: false;
      error: string;
    };

export async function GET(
  req: Request,
  { params }: { params: { profileId: string } }
) {
  const { profileId } = params;

  // 🔐 1) Auth – swap mock for real later
  const coachUser = await getCurrentUserMock();
  if (!coachUser) {
    return NextResponse.json<CoachPlayerResponse>(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  // 2) Load PlayerProfile with linked User + Player
  const profile = await prisma.playerProfile.findUnique({
    where: { id: profileId },
    include: {
      user: {
        include: {
          Player: true,
        },
      },
    },
  });

  if (!profile) {
    return NextResponse.json<CoachPlayerResponse>(
      { ok: false, error: "Player profile not found" },
      { status: 404 }
    );
  }

  const playerUser = profile.user ?? null;
  const player = playerUser?.Player ?? null;

  // 3) Load memberships for this coach (staff roles)
  const coachMemberships = await prisma.teamMembership.findMany({
    where: {
      userId: coachUser.id,
      role: { in: [TeamRole.COACH, TeamRole.TEAM_ADMIN] },
      OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
    },
  });

  // 4) Load memberships for the PLAYER (role=PLAYER)
  const playerTeamMemberships = profile.userId
    ? await prisma.teamMembership.findMany({
        where: {
          userId: profile.userId,
          role: TeamRole.PLAYER,
          OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
        },
      })
    : [];

  // 5) Derive actor context + permissions
  const actor = deriveActorContext({
    user: coachUser,
    profile,
    userTeamMemberships: coachMemberships,
    playerTeamMemberships,
  });

  const perms = getProfilePermissions(profile, actor);

  if (!perms.canViewBasic) {
    return NextResponse.json<CoachPlayerResponse>(
      { ok: false, error: "Forbidden" },
      { status: 403 }
    );
  }

  // 6) Decide view source (e.g., internal vs recruiting board)
  const { searchParams } = new URL(req.url);
  const sourceParam = searchParams.get("source");

  const source =
    sourceParam === "recruitingBoard"
      ? ProfileViewSource.RECRUITING_BOARD
      : sourceParam === "search"
      ? ProfileViewSource.SEARCH_RESULT
      : ProfileViewSource.INTERNAL_TOOL;

  // 7) Record profile view (coach-side)
  try {
    await recordProfileView({
      profile,
      viewerUser: coachUser,
      viewerTeamMemberships: coachMemberships,
      source,
      // We usually don't need IP/UA here inside authenticated coach dashboard
      ipHash: null,
      userAgentHash: null,
    });
  } catch (err) {
    console.error(
      "Error recording coach-side profile view for profileId:",
      profileId,
      err
    );
    // Don't block the response – logging is best-effort
  }

  // 8) Shape response
  const response: CoachPlayerResponse = {
    ok: true,
    data: {
      profile: {
        id: profile.id,
        email: profile.email,
        profileState: profile.profileState,
        ownershipMode: profile.ownershipMode,
        ownerTeamId: profile.ownerTeamId ?? null,
        hasActiveTeamBilling: profile.hasActiveTeamBilling,
        hasActivePlayerBilling: profile.hasActivePlayerBilling,
      },
      user: playerUser
        ? {
            id: playerUser.id,
            name: playerUser.name ?? null,
            email: playerUser.email,
          }
        : null,
      player: player
        ? {
            gradYear: player.gradYear ?? null,
            primaryPos: player.primaryPos ?? null,
            secondaryPos: player.secondaryPos ?? null,
            bats: player.bats ?? null,
            throws: player.throws ?? null,
            hsName: player.hsName ?? null,
            travelTeam: player.travelTeam ?? null,
            hometown: player.hometown ?? null,
            state: player.state ?? null,
          }
        : null,
    },
  };

  return NextResponse.json(response);
}

/**
 * TEMP MOCK for getCurrentUser so this file is paste-able.
 *
 * Replace this with your real auth integration.
 */
async function getCurrentUserMock() {
  // TODO: replace with real implementation (e.g. getServerSession)
  return null as unknown as {
    id: string;
    email: string | null;
    name: string | null;
    role: string | null;
    collegeId: string | null;
  } | null;
}
