// app/api/coach/player/[profileId]/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: {
    profileId: string;
  };
};

export async function GET(_req: Request, ctx: RouteContext) {
  const { profileId } = ctx.params;

  if (!profileId) {
    return NextResponse.json(
      { ok: false, error: "Missing profileId" },
      { status: 400 }
    );
  }

  // TODO: plug in real auth; for now we only gate by existence of profileId
  // e.g. const user = await getCurrentUser(req); if (!user) return 401;

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
    return NextResponse.json(
      { ok: false, error: "PlayerProfile not found" },
      { status: 404 }
    );
  }

  const u = profile.user;
  const player = u?.Player ?? null;

  const { metricsSnapshot, statsSnapshot } = extractSnapshots(profile);

  return NextResponse.json({
    ok: true,
    data: {
      profile: {
        id: profile.id,
        email: profile.email,
        profileState: profile.profileState,
        ownershipMode: profile.ownershipMode,
        ownerTeamId: profile.ownerTeamId,
        hasActiveTeamBilling: profile.hasActiveTeamBilling,
        hasActivePlayerBilling: profile.hasActivePlayerBilling,
      },
      user: u
        ? {
            id: u.id,
            name: u.name,
            email: u.email,
            slug: u.slug ?? null,
            photoUrl: u.photoUrl ?? null,
          }
        : null,
      player: player
        ? {
            gradYear: player.gradYear,
            primaryPos: player.primaryPos,
            secondaryPos: player.secondaryPos,
            bats: player.bats,
            throws: player.throws,
            hsName: player.hsName,
            travelTeam: player.travelTeam,
            hometown: player.hometown,
            state: player.state,
          }
        : null,
      metrics: metricsSnapshot,
      stats: statsSnapshot,
    },
  });
}

/* -------------------------------------------------------------------------- */
/*  Snapshot helpers                                                          */
/* -------------------------------------------------------------------------- */

function extractSnapshots(profile: any) {
  const raw = (profile.data ?? {}) as any;

  // Try a couple of keys so we don't break if you renamed in PlayerProfile.data
  const metricsRoot = raw.metrics ?? raw.Metrics ?? {};
  const hitting = metricsRoot.hitting ?? metricsRoot.Hitting ?? {};
  const pitching = metricsRoot.pitching ?? metricsRoot.Pitching ?? {};
  const catching = metricsRoot.catching ?? metricsRoot.Catching ?? {};

  const metricsSnapshot = {
    topExitVelo: firstNumber(
      hitting.topExitVelo,
      hitting.maxExitVelo,
      hitting.exitVeloMax,
      hitting.exitVelocityMax
    ),
    topPitchVelo: firstNumber(
      pitching.topFastballVelo,
      pitching.fbVeloMax,
      pitching.fastballVeloMax
    ),
    popTime: firstNumber(
      catching.bestPopTime,
      catching.popTimeBest,
      catching.popTime
    ),
    lastUpdated:
      (metricsRoot.updatedAt as string | undefined) ??
      (raw.metricsUpdatedAt as string | undefined) ??
      profile.updatedAt.toISOString(),
  };

  const statsRoot = raw.stats ?? raw.Stats ?? {};
  const seasons = Array.isArray(statsRoot.seasons)
    ? statsRoot.seasons
    : [];
  const latest = seasons[0] ?? null;
  const hittingStats = latest?.hitting ?? {};

  const statsSnapshot = latest
    ? {
        season: latest.season ?? null,
        team: latest.team ?? null,
        avg: numOrNull(hittingStats.avg),
        obp: numOrNull(hittingStats.obp),
        slg: numOrNull(hittingStats.slg),
        gp: intOrNull(hittingStats.gp),
        pa: intOrNull(hittingStats.pa),
        ab: intOrNull(hittingStats.ab),
      }
    : {
        season: null,
        team: null,
        avg: null,
        obp: null,
        slg: null,
        gp: null,
        pa: null,
        ab: null,
      };

  return { metricsSnapshot, statsSnapshot };
}

function firstNumber(...vals: any[]): number | null {
  for (const v of vals) {
    const n = Number(v);
    if (!Number.isNaN(n) && v != null) return n;
  }
  return null;
}

function numOrNull(v: any): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function intOrNull(v: any): number | null {
  if (v == null) return null;
  const n = parseInt(String(v), 10);
  return Number.isNaN(n) ? null : n;
}
