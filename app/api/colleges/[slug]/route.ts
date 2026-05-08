// app/api/colleges/[slug]/route.ts

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

async function getCurrentPlayerProfile() {
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
    email: profile.email || user.email,
    player: {
      gpa: asNumber(user.Player?.gpa) ?? asNumber(normalized?.gpa),
      gradYear: asNumber(user.Player?.gradYear) ?? asNumber(normalized?.gradYear),
      primaryPos:
        asString(user.Player?.primaryPos) ?? asString(normalized?.primaryPos),
      secondaryPos:
        asString(user.Player?.secondaryPos) ?? asString(normalized?.secondaryPos),
      heightIn: totalHeightIn,
      weightLb: asNumber(user.Player?.weightLb) ?? asNumber(normalized?.weightLb),
      metrics:
        normalized?.metrics && typeof normalized.metrics === "object"
          ? normalized.metrics
          : {},
    },
  };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const college = await prisma.college.findUnique({
      where: { slug: params.slug },
      include: {
        academicAreas: true,
        baseballProgram: {
          include: {
            coaches: true,
            rosterNeeds: true,
            metricAverages: true,
          },
        },
      },
    });

    if (!college) {
      return NextResponse.json(
        { ok: false, error: "College not found." },
        { status: 404 }
      );
    }

    const profile = await getCurrentPlayerProfile();
    const baseball = college.baseballProgram;

    let truthFit = null;

    if (profile && baseball) {
      const bestMetrics = await getBestMetricBenchmarks({
        programId: baseball.id,
        collegeName: college.name,
        conference: baseball.conference || college.conference || null,
        division: String(baseball.division || college.division || ""),
      });

      truthFit = scoreCollegeFit({
        player: profile.player,
        college: {
          averageGpa: asNumber(baseball.averageGpa),
          division: baseball.division || college.division || null,
          metricAverages: bestMetrics.benchmarks,
          metricBenchmarkSource: {
            level: bestMetrics.level,
            label: bestMetrics.label,
            confidence: bestMetrics.confidence,
          },
          rosterNeeds:
            baseball.rosterNeeds?.map((need) => ({
              gradYear: need.gradYear,
              position: need.position,
              needLevel: need.needLevel,
            })) || [],
        },
      });
    }

    return NextResponse.json({
      ok: true,
      college: {
        ...college,
        truthFit,
      },
    });
  } catch (err) {
    console.error("COLLEGE_DETAIL_ERROR", err);
    return NextResponse.json(
      { ok: false, error: "Could not load college." },
      { status: 500 }
    );
  }
}