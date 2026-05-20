// app/api/player/target-programs/route.ts

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { scoreCollegeFit } from "@/app/lib/truth-fit/scoreCollegeFit";
import { getBestMetricBenchmarks } from "@/app/lib/truth-fit/getBestMetricBenchmarks";

export const dynamic = "force-dynamic";

function asNumber(value: unknown): number | null {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function asString(value: unknown): string | null {
  const s = String(value ?? "").trim();
  return s ? s : null;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function asInt(value: unknown): number | null {
  const n = asNumber(value);
  return n == null ? null : Math.round(n);
}

function asLimitedString(value: unknown, max = 2000): string | null {
  const s = asString(value);
  return s ? s.slice(0, max) : null;
}

/**
 * Supported recruiting statuses
 */
const VALID_STATUSES = [
  "SAVED",
  "INTERESTED",
  "CONTACTED",
  "VISITED",
  "OFFERED",
  "COMMITTED",
  "SIGNED",
  "APPLIED",
  "ACCEPTED",
  "NOT_PURSUING",
] as const;

const VALID_PRIORITIES = ["HIGH", "MEDIUM", "LOW"] as const;

type TargetPriority = (typeof VALID_PRIORITIES)[number];

type RecruitingStatus = (typeof VALID_STATUSES)[number];

function buildSnapshotData(body: any) {
  return {
    exportInclude: asBoolean(body?.exportInclude) ?? true,
    boardGroup: asLimitedString(body?.boardGroup, 120),
    strategyCategory: asLimitedString(body?.strategyCategory, 120),
    strategyExplanation: asLimitedString(body?.strategyExplanation, 2000),
    opportunityScore: asInt(body?.opportunityScore),
    opportunityLabel: asLimitedString(body?.opportunityLabel, 120),
    opportunityArchetype: asLimitedString(body?.opportunityArchetype, 160),
    matchScore: asInt(body?.matchScore),
    matchLabel: asLimitedString(body?.matchLabel, 120),
    narrativeHeadline: asLimitedString(body?.narrativeHeadline, 240),
    narrativeSummary: asLimitedString(body?.narrativeSummary, 2000),
    narrativeStrategy: asLimitedString(body?.narrativeStrategy, 2000),
  };
}

async function getCurrentPlayerProfile(
  req?: NextRequest
) {
  const requestedPlayerProfileId =
  req?.nextUrl?.searchParams?.get("playerProfileId") || "";

if (requestedPlayerProfileId) {
  const profile = await prisma.playerProfile.findUnique({
    where: { id: requestedPlayerProfileId },
    select: {
      id: true,
      email: true,
      data: true,
    },
  });

  if (!profile) return null;

  const data = (profile.data || {}) as any;
  const normalized = data?.normalized || data;

  const heightFt = asNumber(normalized?.heightFt);
  const heightInOnly = asNumber(normalized?.heightIn);

  const totalHeightIn =
    heightFt != null && heightInOnly != null
      ? heightFt * 12 + heightInOnly
      : heightInOnly;

  return {
    id: profile.id,
    player: {
      gpa: asNumber(normalized?.gpa),
      gradYear: asNumber(normalized?.gradYear),
      primaryPos: asString(normalized?.primaryPos),
      secondaryPos: asString(normalized?.secondaryPos),
      heightIn: totalHeightIn,
      weightLb: asNumber(normalized?.weightLb),
      metrics:
        normalized?.metrics &&
        typeof normalized.metrics === "object"
          ? normalized.metrics
          : {},
    },
  };
}

const userId = cookies().get("scoutline_uid")?.value || "";

  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      Player: {
        select: {
          gpa: true,
          gradYear: true,
          primaryPos: true,
          secondaryPos: true,
          heightIn: true,
          weightLb: true,
        },
      },
      PlayerProfile: {
        select: {
          id: true,
          email: true,
          data: true,
        },
      },
    },
  });

  if (!user?.email) return null;

  const profile =
    user.PlayerProfile ||
    (await prisma.playerProfile.findUnique({
      where: { email: user.email },
      select: {
        id: true,
        email: true,
        data: true,
      },
    }));

  if (!profile) return null;

  const data = (profile.data || {}) as any;
  const normalized = data?.normalized || data;

  const heightFt = asNumber(normalized?.heightFt);
  const heightInOnly = asNumber(normalized?.heightIn);
  const totalHeightIn =
    heightFt != null && heightInOnly != null
      ? heightFt * 12 + heightInOnly
      : asNumber(user.Player?.heightIn) ?? heightInOnly;

  return {
    id: profile.id,
    player: {
      gpa: asNumber(user.Player?.gpa) ?? asNumber(normalized?.gpa),
      gradYear:
        asNumber(user.Player?.gradYear) ?? asNumber(normalized?.gradYear),
      primaryPos:
        asString(user.Player?.primaryPos) ?? asString(normalized?.primaryPos),
      secondaryPos:
        asString(user.Player?.secondaryPos) ??
        asString(normalized?.secondaryPos),
      heightIn: totalHeightIn,
      weightLb:
        asNumber(user.Player?.weightLb) ?? asNumber(normalized?.weightLb),
      metrics:
        normalized?.metrics && typeof normalized.metrics === "object"
          ? normalized.metrics
          : {},
    },
  };
}

/**
 * GET - Load saved target programs
 */
export async function GET(req: NextRequest) {
  try {
    const profile = await getCurrentPlayerProfile(req);

    if (!profile) {
      return NextResponse.json(
        { ok: false, error: "Not logged in or player profile not found." },
        { status: 401 }
      );
    }

    const savedRows = await prisma.collegeSavedSchool.findMany({
      where: { playerProfileId: profile.id },
      include: {
        college: {
          include: {
            baseballProgram: {
              include: {
                coaches: true,
                rosterNeeds: true,
                metricAverages: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const saved = await Promise.all(
      savedRows.map(async (item) => {
        const baseball = item.college.baseballProgram;

        if (!baseball) {
          return {
            ...item,
            truthFit: null,
          };
        }

        const bestMetrics = await getBestMetricBenchmarks({
          programId: baseball.id,
          collegeName: item.college.name,
          conference: baseball.conference || item.college.conference || null,
          division: String(baseball.division || item.college.division || ""),
        });

        const truthFit = scoreCollegeFit({
          player: profile.player,
          college: {
            averageGpa: asNumber(baseball.averageGpa),
            division: baseball.division || item.college.division || null,
            metricAverages: bestMetrics.benchmarks,
            metricBenchmarkSource: {
              level: bestMetrics.level,
              label: bestMetrics.label,
            },
            rosterNeeds:
              baseball.rosterNeeds?.map((need) => ({
                gradYear: need.gradYear,
                position: need.position,
                needLevel: need.needLevel,
              })) || [],
          },
        });

        return {
          ...item,
          truthFit,
        };
      })
    );

    return NextResponse.json({ ok: true, saved });
  } catch (err) {
    console.error("TARGET_PROGRAMS_GET_ERROR", err);
    return NextResponse.json(
      { ok: false, error: "Could not load target programs." },
      { status: 500 }
    );
  }
}

/**
 * POST - Save a college (default status: SAVED)
 */
export async function POST(req: NextRequest) {
  try {
    const profile = await getCurrentPlayerProfile();

    if (!profile) {
      return NextResponse.json(
        { ok: false, error: "Not logged in or player profile not found." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { collegeId, priority } = body;

    if (!collegeId || typeof collegeId !== "string") {
      return NextResponse.json(
        { ok: false, error: "Missing collegeId." },
        { status: 400 }
      );
    }

    const safePriority: TargetPriority =
      typeof priority === "string" &&
      VALID_PRIORITIES.includes(priority as TargetPriority)
        ? (priority as TargetPriority)
        : "MEDIUM";

    const snapshotData = buildSnapshotData(body);

    const saved = await prisma.collegeSavedSchool.upsert({
      where: {
        playerProfileId_collegeId: {
          playerProfileId: profile.id,
          collegeId,
        },
      },
      update: {
        priority: safePriority,
        ...snapshotData,
      },
      create: {
        playerProfileId: profile.id,
        collegeId,
        listName: "Target Programs",
        status: "SAVED",
        priority: safePriority,
        ...snapshotData,
      },
    });

    return NextResponse.json({ ok: true, saved });
  } catch (err) {
    console.error("TARGET_PROGRAMS_POST_ERROR", err);
    return NextResponse.json(
      { ok: false, error: "Could not save target program." },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update recruiting status
 */
export async function PATCH(req: NextRequest) {
  try {
    const profile = await getCurrentPlayerProfile();

    if (!profile) {
      return NextResponse.json(
        { ok: false, error: "Not logged in or player profile not found." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { collegeId, status, notes, priority } = body;

    if (!collegeId || typeof collegeId !== "string") {
      return NextResponse.json(
        { ok: false, error: "Missing collegeId." },
        { status: 400 }
      );
    }

    const dataToUpdate: {
      status?: RecruitingStatus;
      notes?: string | null;
      priority?: TargetPriority | null;
      exportInclude?: boolean;
      boardGroup?: string | null;
      strategyCategory?: string | null;
      strategyExplanation?: string | null;
      opportunityScore?: number | null;
      opportunityLabel?: string | null;
      opportunityArchetype?: string | null;
      matchScore?: number | null;
      matchLabel?: string | null;
      narrativeHeadline?: string | null;
      narrativeSummary?: string | null;
      narrativeStrategy?: string | null;
    } = {};

    if (typeof status !== "undefined") {
      if (!status || !VALID_STATUSES.includes(status)) {
        return NextResponse.json(
          { ok: false, error: "Invalid status value." },
          { status: 400 }
        );
      }

      dataToUpdate.status = status;
    }

    if (typeof notes !== "undefined") {
      dataToUpdate.notes =
        typeof notes === "string" && notes.trim()
          ? notes.trim().slice(0, 1000)
          : null;
    }

    if (typeof priority !== "undefined") {
      if (priority === null || priority === "") {
        dataToUpdate.priority = null;
      } else if (VALID_PRIORITIES.includes(priority)) {
        dataToUpdate.priority = priority;
      } else {
        return NextResponse.json(
          { ok: false, error: "Invalid priority value." },
          { status: 400 }
        );
      }
    }

    const snapshotData = buildSnapshotData(body);

    for (const [key, value] of Object.entries(snapshotData)) {
      if (typeof body?.[key] !== "undefined") {
        (dataToUpdate as any)[key] = value;
      }
    }

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json(
        { ok: false, error: "No updates provided." },
        { status: 400 }
      );
    }

    const updated = await prisma.collegeSavedSchool.update({
      where: {
        playerProfileId_collegeId: {
          playerProfileId: profile.id,
          collegeId,
        },
      },
      data: dataToUpdate,
    });

    return NextResponse.json({ ok: true, updated });
  } catch (err) {
    console.error("TARGET_PROGRAMS_PATCH_ERROR", err);
    return NextResponse.json(
      { ok: false, error: "Could not update status." },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove saved college
 */
export async function DELETE(req: NextRequest) {
  try {
    const profile = await getCurrentPlayerProfile();

    if (!profile) {
      return NextResponse.json(
        { ok: false, error: "Not logged in or player profile not found." },
        { status: 401 }
      );
    }

    const { collegeId } = await req.json();

    if (!collegeId || typeof collegeId !== "string") {
      return NextResponse.json(
        { ok: false, error: "Missing collegeId." },
        { status: 400 }
      );
    }

    await prisma.collegeSavedSchool.deleteMany({
      where: {
        playerProfileId: profile.id,
        collegeId,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("TARGET_PROGRAMS_DELETE_ERROR", err);
    return NextResponse.json(
      { ok: false, error: "Could not remove target program." },
      { status: 500 }
    );
  }
}