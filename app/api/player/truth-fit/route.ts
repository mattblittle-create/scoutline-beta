// app/api/player/truth-fit/route.ts

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { scoreCollegeFit } from "@/app/lib/truth-fit/scoreCollegeFit";

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

  return {
    id: profile.id,
    email: profile.email || user.email,
    player: {
      gpa:
        asNumber(user.Player?.gpa) ??
        asNumber(normalized?.gpa),
      gradYear:
        asNumber(user.Player?.gradYear) ??
        asNumber(normalized?.gradYear),
      primaryPos:
        asString(user.Player?.primaryPos) ??
        asString(normalized?.primaryPos),
      secondaryPos:
        asString(user.Player?.secondaryPos) ??
        asString(normalized?.secondaryPos),
      metrics:
        normalized?.metrics && typeof normalized.metrics === "object"
          ? normalized.metrics
          : {},
    },
  };
}

export async function GET() {
  try {
    const profile = await getCurrentPlayerProfile();

    if (!profile) {
      return NextResponse.json(
        { ok: false, error: "Not logged in or player profile not found." },
        { status: 401 }
      );
    }

    const colleges = await prisma.college.findMany({
      take: 250,
      orderBy: { name: "asc" },
      include: {
        baseballProgram: {
          include: {
            rosterNeeds: true,
            metricAverages: true,
          },
        },
      },
    });

    const results = colleges
      .map((college) => {
        const baseball = college.baseballProgram;

        const fit = scoreCollegeFit({
          player: profile.player,
          college: {
            averageGpa: asNumber(baseball?.averageGpa),
            division: baseball?.division || college.division || null,
            metricAverages:
              baseball?.metricAverages?.map((metric) => ({
                position: metric.position,
                metricKey: metric.metricKey,
                metricLabel: metric.metricLabel,
                averageValue: asNumber(metric.averageValue),
                minValue: asNumber(metric.minValue),
                maxValue: asNumber(metric.maxValue),
                unit: metric.unit,
              })) || [],
            rosterNeeds:
              baseball?.rosterNeeds?.map((need) => ({
                gradYear: need.gradYear,
                position: need.position,
                needLevel: need.needLevel,
              })) || [],
          },
        });

        return {
          college: {
            id: college.id,
            name: college.name,
            slug: college.slug,
            websiteUrl: college.websiteUrl,
            admissionsUrl: college.admissionsUrl,
            city: college.city,
            state: college.state,
            region: college.region,
            control: college.control,
            schoolType: college.schoolType,
            tuitionInState: college.tuitionInState,
            tuitionOutOfState: college.tuitionOutOfState,
            baseballProgram: baseball
              ? {
                  nickname: baseball.nickname,
                  division: baseball.division,
                  conference: baseball.conference,
                  baseballWebsiteUrl: baseball.baseballWebsiteUrl,
                  averageGpa: baseball.averageGpa,
                  currentRosterSize: baseball.currentRosterSize,
                  transferHeavy: baseball.transferHeavy,
                  jucoFriendly: baseball.jucoFriendly,
                }
              : null,
          },
          truthFit: fit,
        };
      })
      .sort((a, b) => b.truthFit.score - a.truthFit.score);

    return NextResponse.json({
      ok: true,
      player: profile.player,
      count: results.length,
      results,
    });
  } catch (err) {
    console.error("PLAYER_TRUTH_FIT_ERROR", err);
    return NextResponse.json(
      { ok: false, error: "Could not generate Truth Fit results." },
      { status: 500 }
    );
  }
}