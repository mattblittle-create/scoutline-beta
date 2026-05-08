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

function similarityScore(base: any, candidate: any) {
  let score = 0;

  const baseProgram = base.baseballProgram;
  const candidateProgram = candidate.baseballProgram;

  if (baseProgram?.division && candidateProgram?.division === baseProgram.division) {
    score += 40;
  }

  if (base.region && candidate.region === base.region) {
    score += 18;
  }

  if (base.state && candidate.state === base.state) {
    score += 10;
  }

  if (base.control && candidate.control === base.control) {
    score += 8;
  }

  if (baseProgram?.conference && candidateProgram?.conference === baseProgram.conference) {
    score += 14;
  }

  const baseTuition = asNumber(base.tuitionOutOfState ?? base.tuitionInState);
  const candidateTuition = asNumber(candidate.tuitionOutOfState ?? candidate.tuitionInState);

  if (baseTuition != null && candidateTuition != null) {
    const diff = Math.abs(baseTuition - candidateTuition);

    if (diff <= 5000) score += 8;
    else if (diff <= 10000) score += 5;
    else if (diff <= 20000) score += 2;
  }

  const baseEnrollment = asNumber(base.enrollmentUndergrad ?? base.enrollmentTotal);
  const candidateEnrollment = asNumber(candidate.enrollmentUndergrad ?? candidate.enrollmentTotal);

  if (baseEnrollment != null && candidateEnrollment != null) {
    const diff = Math.abs(baseEnrollment - candidateEnrollment);

    if (diff <= 1500) score += 6;
    else if (diff <= 4000) score += 4;
    else if (diff <= 8000) score += 2;
  }

  return score;
}

async function getSimilarSchools(college: any) {
  const baseball = college.baseballProgram;

  const candidates = await prisma.college.findMany({
    where: {
      id: { not: college.id },
      OR: [
        baseball?.division
          ? {
              baseballProgram: {
                is: {
                  division: baseball.division,
                },
              },
            }
          : {},
        college.region ? { region: college.region } : {},
        college.state ? { state: college.state } : {},
      ],
    },
    take: 75,
    include: {
      baseballProgram: true,
    },
  });

  return candidates
    .map((candidate) => ({
      score: similarityScore(college, candidate),
      college: {
        id: candidate.id,
        name: candidate.name,
        slug: candidate.slug,
        city: candidate.city,
        state: candidate.state,
        region: candidate.region,
        control: candidate.control,
        schoolType: candidate.schoolType,
        tuitionInState: candidate.tuitionInState,
        tuitionOutOfState: candidate.tuitionOutOfState,
        baseballProgram: candidate.baseballProgram
          ? {
              nickname: candidate.baseballProgram.nickname,
              division: candidate.baseballProgram.division,
              conference: candidate.baseballProgram.conference,
              currentRosterSize: candidate.baseballProgram.currentRosterSize,
            }
          : null,
      },
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.college.name.localeCompare(b.college.name))
    .slice(0, 6);
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

    const similarSchools = await getSimilarSchools(college);

    return NextResponse.json({
      ok: true,
      college: {
        ...college,
        truthFit,
        similarSchools,
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