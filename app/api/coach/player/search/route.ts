// app/api/coach/player/search/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ErrorResponse = { ok: false; error: string };

// Keys we expect in PlayerProfile.data.metrics
const METRIC_KEYS = [
  "homeToFirst",
  "sixtyYdDash",
  "exitVelo",
  "rawThrowVelo",
  "avgFbVelo",
  "avgChVelo",
  "avgBbVelo",
  "popTime",
  "benchPress",
  "squat",
  "infieldThrowVelo",
  "outfieldThrowVelo",
  "catcherThrowVelo",
  "firstToThird",
] as const;

function toStr(v: any) {
  return String(v ?? "").trim();
}
function toNum(v: any): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null; // ✅ empty string should not become 0
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function toBool(v: any): boolean | null {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return null;
  if (["true", "1", "yes", "y"].includes(s)) return true;
  if (["false", "0", "no", "n"].includes(s)) return false;
  return null;
}

function parseMMYYYY(my: string): Date | null {
  const s = String(my ?? "").trim();
  let m = s.match(/^(\d{1,2})\/(\d{4})$/);
  if (m) {
    const mm = Number(m[1]);
    const yy = Number(m[2]);
    if (mm >= 1 && mm <= 12 && yy >= 1900 && yy <= 3000) return new Date(yy, mm - 1, 1);
    return null;
  }
  m = s.match(/^(\d{4})-(\d{1,2})$/);
  if (m) {
    const yy = Number(m[1]);
    const mm = Number(m[2]);
    if (mm >= 1 && mm <= 12 && yy >= 1900 && yy <= 3000) return new Date(yy, mm - 1, 1);
  }
  return null;
}

function monthFloor(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function getLatestMetricValue(metricsObj: any, key: string, now: Date): number | null {
  const arr = Array.isArray(metricsObj?.[key]) ? metricsObj[key] : null;
  if (!arr || arr.length === 0) return null;

  const nowMonth = monthFloor(now).getTime();

  let bestT = -Infinity;
  let bestV: number | null = null;

  for (const e of arr) {
    const my = String(e?.monthYear ?? "").trim();
    const dt = parseMMYYYY(my);
    if (!dt) continue;

    const t = monthFloor(dt).getTime();
    if (t > nowMonth) continue; // ignore future months

    const v = toNum(e?.value);
    if (v == null) continue;

    if (t > bestT) {
      bestT = t;
      bestV = v;
    }
  }

  return bestV;
}

type MetricRange = { min?: number; max?: number };

function readMetricRanges(searchParams: URLSearchParams): Record<string, MetricRange> {
  const out: Record<string, MetricRange> = {};

  function setRange(key: string, which: "min" | "max", value: number) {
    if (!out[key]) out[key] = {};
    out[key][which] = value;
  }

  for (const [kRaw, vRaw] of searchParams.entries()) {
    const v = toNum(vRaw);
    if (v == null) continue;

    const k = kRaw.trim();

    // m_exitVeloMin, m_popTimeMin, etc.
    let m = k.match(/^m_(.+?)(Min|Max)$/i);
    if (m) {
      const key = m[1];
      const which = m[2].toLowerCase() as "min" | "max";
      setRange(key, which, v);
      continue;
    }

    // metric_exitVeloMin (alternate)
    m = k.match(/^metric_(.+?)(Min|Max)$/i);
    if (m) {
      const key = m[1];
      const which = m[2].toLowerCase() as "min" | "max";
      setRange(key, which, v);
      continue;
    }
  }

  return out;
}

export async function GET(req: Request) {
  const coachUser = await getCurrentUser();
  if (!coachUser) {
    return NextResponse.json<ErrorResponse>({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const accountType = coachUser.coachProfile?.coachAccountType ?? null;
  const billingStatus = coachUser.coachProfile?.coachBillingStatus ?? null;

  // ✅ For per-program features (ratings/notes scoped to a college program)
  const coachCollegeId = (coachUser as any)?.collegeId ?? null;

  const canSearchPlayers =
    accountType === "COLLEGE_COACH" ||
    (accountType === "RECRUITING_SERVICE" && billingStatus === "ACTIVE") ||
    // ✅ DEV: if coach is linked to a college, allow search so you can test
    (process.env.NODE_ENV !== "production" && !!coachCollegeId);

  if (!canSearchPlayers) {
    return NextResponse.json<ErrorResponse>(
      { ok: false, error: "Coach account does not have access to player search." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);

  // ✅ DEV DEBUG: proves what DB/rows this route can see.
  // Use: /api/coach/player/search?debug=1
  if (process.env.NODE_ENV !== "production" && searchParams.get("debug") === "1") {
    const total = await prisma.playerProfile.count();

    const byState = await prisma.playerProfile.groupBy({
      by: ["profileState"],
      _count: { _all: true },
    });

    const sample = await prisma.playerProfile.findMany({
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, email: true, profileState: true, updatedAt: true, userId: true },
    });

    // this matches your whereProfile logic exactly
    const matchesWhereProfile = await prisma.playerProfile.count({
      where: {
        profileState: { in: ["PLAYER_OWNED_ACTIVE", "TEAM_OWNED_ACTIVE", "TEAM_REMOVAL_PENDING_TRANSFER"] as any },
      },
    });

    return NextResponse.json({
      ok: true,
      debug: {
        totalPlayerProfiles: total,
        byProfileState: byState.map((r) => ({ profileState: r.profileState, count: r._count._all })),
        matchesWhereProfile,
        sampleLatest: sample,
        coachId: coachUser?.id ?? null,
        coachCollegeId: (coachUser as any)?.collegeId ?? null,
        accountType: coachUser?.coachProfile?.coachAccountType ?? null,
        billingStatus: coachUser?.coachProfile?.coachBillingStatus ?? null,
      },
      results: [],
    });
  }

  const q = toStr(searchParams.get("q"));
  const gradYear = toNum(searchParams.get("gradYear"));
  const pos = toStr(searchParams.get("pos")).toUpperCase();

  const committed = toBool(searchParams.get("committed"));
  const bats = toStr(searchParams.get("bats")).toUpperCase();
  const throws = toStr(searchParams.get("throws")).toUpperCase();
  const pitcherHand = toStr(searchParams.get("pitcherHand")).toUpperCase();

  const state = toStr(searchParams.get("state")).toUpperCase();

  // City filter (alias to Player.hometown)
  const city = toStr(searchParams.get("city"));
  const hometown = city || toStr(searchParams.get("hometown"));

  const hsName = toStr(searchParams.get("hsName"));
  const travelTeam = toStr(searchParams.get("travelTeam"));

  const gpaMin = toNum(searchParams.get("gpaMin"));

  // Metric filters
  const metricRanges = readMetricRanges(searchParams);
  const hasMetricFilters = Object.keys(metricRanges).length > 0;

  // Decide how many results to return
  const takeRaw = Number(searchParams.get("take") || "0");

  const hasAnyCriteria =
    !!q ||
    gradYear != null ||
    !!pos ||
    committed !== null ||
    !!bats ||
    !!throws ||
    !!pitcherHand ||
    !!state ||
    !!hometown ||
    !!hsName ||
    !!travelTeam ||
    gpaMin != null ||
    hasMetricFilters;

  const defaultTake = hasAnyCriteria ? 25 : 5000;
  const take = Math.min(5000, Math.max(1, Number.isFinite(takeRaw) && takeRaw > 0 ? takeRaw : defaultTake));

  // If we have metric filters, fetch a bigger candidate set and filter in-memory
  const preTake = hasMetricFilters ? Math.min(5000, Math.max(200, take * 10)) : take;

  const whereProfile: any = {
    profileState: { in: ["PLAYER_OWNED_ACTIVE", "TEAM_OWNED_ACTIVE", "TEAM_REMOVAL_PENDING_TRANSFER"] }
  };

  const playerWhere: any = {};

  if (gradYear != null && gradYear > 0) playerWhere.gradYear = gradYear;

  if (pos) {
    playerWhere.OR = [{ primaryPos: pos }, { secondaryPos: pos }];
  }

  if (committed !== null) playerWhere.isCommitted = committed;

  if (bats) playerWhere.bats = bats;
  if (throws) playerWhere.throws = throws;
  if (pitcherHand) playerWhere.pitcherHand = pitcherHand;

  if (state) playerWhere.state = state;
  if (hometown) playerWhere.hometown = { contains: hometown, mode: "insensitive" };
  if (hsName) playerWhere.hsName = { contains: hsName, mode: "insensitive" };
  if (travelTeam) playerWhere.travelTeam = { contains: travelTeam, mode: "insensitive" };

  // ✅ GPA MIN: gpa >= gpaMin
  if (gpaMin != null) {
  playerWhere.gpa = { gte: gpaMin };
  }

    // ✅ DEV DEBUG 2: run the exact query + show where/counts
  // Use: /api/coach/player/search?debug=2
  if (process.env.NODE_ENV !== "production" && searchParams.get("debug") === "2") {
    const whereUsed: any = {
      ...whereProfile,
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { user: { name: { contains: q, mode: "insensitive" } } },
              { user: { slug: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
      ...(Object.keys(playerWhere).length
        ? {
            user: {
              Player: playerWhere,
            },
          }
        : {}),
    };

    const rowsCount = await prisma.playerProfile.count({ where: whereUsed });

    const sample = await prisma.playerProfile.findMany({
      where: whereUsed,
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: { id: true, email: true, profileState: true, updatedAt: true },
    });

    return NextResponse.json({
      ok: true,
      debug2: {
        q,
        gradYear,
        pos,
        committed,
        bats,
        throws,
        pitcherHand,
        state,
        hometown,
        hsName,
        travelTeam,
        gpaMin,
        metricRanges,
        hasMetricFilters,
        take,
        preTake,
        whereUsed,
        rowsCount,
        sample,
      },
      results: [],
    });
  }

  const rows = await prisma.playerProfile.findMany({
    where: {
      ...whereProfile,
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { user: { name: { contains: q, mode: "insensitive" } } },
              { user: { slug: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
      ...(Object.keys(playerWhere).length
        ? {
            user: {
              Player: playerWhere,
            },
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: preTake,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          slug: true,
          photoUrl: true,
          Player: {
            select: {
              gradYear: true,
              primaryPos: true,
              secondaryPos: true,
              bats: true,
              throws: true,
              pitcherHand: true,
              hsName: true,
              travelTeam: true,
              hometown: true,
              state: true,
              gpa: true,
              isCommitted: true,
              committedProgram: true,
            },
          },
        },
      },
    },
  });

  // ✅ Needed for getLatestMetricValue()
  const now = new Date();

  const filtered = rows
    .map((p) => {
      const dataObj: any = (p as any).data || {};
      const metricsObj: any = dataObj?.metrics || {};
      const latest: Record<string, number | null> = {};

      for (const k of METRIC_KEYS) {
        latest[k] = getLatestMetricValue(metricsObj, k, now);
      }

      return { p, latest };
    })
    .filter(({ latest }) => {
      if (!hasMetricFilters) return true;

      // ✅ MIN filters behave like GPA min: keep rows where actual >= min
      for (const [key, range] of Object.entries(metricRanges)) {
        const actual = latest[key];
        if (actual == null) return false;

        if (range.min != null && actual < range.min) return false;
        if (range.max != null && actual > range.max) return false; // safe if you ever re-add max
      }
      return true;
    })
    .slice(0, take);

  // ✅ Ratings: fetch coach’s ratings for these players (scoped to college + coach)
  const filteredProfileIds = filtered.map(({ p }) => p.id);

  const ratingsByProfileId = new Map<string, number>();

    // ✅ Recruiting Lists: which lists each player is on (scoped to this coach's college/program)
  const listsByProfileId = new Map<string, Array<{ id: string; name: string }>>();

  if (coachCollegeId && filteredProfileIds.length > 0) {
    const memberRows = await prisma.recruitingListMember.findMany({
      where: {
        playerProfileId: { in: filteredProfileIds },
        list: { collegeId: coachCollegeId },
      },
      select: {
        playerProfileId: true,
        list: { select: { id: true, name: true } },
      },
      orderBy: [{ playerProfileId: "asc" }, { list: { name: "asc" } }],
    });

    for (const m of memberRows) {
      const pid = m.playerProfileId;
      const existing = listsByProfileId.get(pid) ?? [];
      existing.push({ id: m.list.id, name: m.list.name });
      listsByProfileId.set(pid, existing);
    }
  }

  if (coachCollegeId && coachUser.id && filteredProfileIds.length > 0) {
    const ratingRows = await prisma.coachPlayerRating.findMany({
      where: {
        collegeId: coachCollegeId,
        coachUserId: coachUser.id,
        playerProfileId: { in: filteredProfileIds },
      },
      select: { playerProfileId: true, rating: true },
    });

    for (const r of ratingRows) {
      ratingsByProfileId.set(r.playerProfileId, Math.max(0, Math.min(5, Number(r.rating) || 0)));
    }
  }

  const results = filtered.map(({ p, latest }) => ({
    playerProfileId: p.id,
    lists: listsByProfileId.get(p.id) ?? [],

    // ✅ NEW: coach/program-scoped rating (0..5). Default 0 when not rated.
    rating: ratingsByProfileId.get(p.id) ?? 0,

    profileEmail: p.email,
    profileState: String((p as any).profileState),

    userId: p.user?.id ?? null,
    name: p.user?.name ?? null,
    email: p.user?.email ?? p.email,
    slug: p.user?.slug ?? null,
    photoUrl: p.user?.photoUrl ?? null,

    gradYear: p.user?.Player?.gradYear ?? null,
    primaryPos: p.user?.Player?.primaryPos ?? null,
    secondaryPos: p.user?.Player?.secondaryPos ?? null,
    bats: p.user?.Player?.bats ?? null,
    throws: p.user?.Player?.throws ?? null,

    isCommitted: p.user?.Player?.isCommitted ?? false,
    committedProgram: p.user?.Player?.committedProgram ?? null,

    state: p.user?.Player?.state ?? null,
    hometown: p.user?.Player?.hometown ?? null,
    hsName: p.user?.Player?.hsName ?? null,
    travelTeam: p.user?.Player?.travelTeam ?? null,

    gpa: p.user?.Player?.gpa ?? null,

    metricsLatest: latest,

    updatedAt: p.updatedAt.toISOString(),
  }));

  return NextResponse.json({ ok: true, results });
}
