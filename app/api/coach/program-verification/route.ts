// app/api/coach/program-verification/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Err = { ok: false; error: string };

function asString(value: unknown, max = 2000): string | null {
  const s = String(value ?? "").trim();
  return s ? s.slice(0, max) : null;
}

function asNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  return null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((v) => String(v ?? "").trim())
    .filter(Boolean)
    .slice(0, 100);
}

function normalizeRosterNeeds(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item: any) => ({
      gradYear: asNumber(item?.gradYear),
      position: asString(item?.position, 40),
      needLevel: asString(item?.needLevel, 40),
      notes: asString(item?.notes, 500),
    }))
    .filter((item) => item.gradYear && item.position)
    .slice(0, 100);
}

function normalizeCoachContacts(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item: any) => ({
      name: asString(item?.name, 120),
      title: asString(item?.title, 120),
      email: asString(item?.email, 320),
      phone: asString(item?.phone, 80),
      isRecruitingContact: asBoolean(item?.isRecruitingContact),
    }))
    .filter((item) => item.name || item.email)
    .slice(0, 25);
}

function normalizeNilInfo(body: any) {
  return {
    nilAvailable: asBoolean(body?.nilAvailable),
    baseballNilStrength: asString(body?.baseballNilStrength, 80),
    nilSummary: asString(body?.nilSummary, 2000),
    nilNotes: asString(body?.nilNotes, 2000),
    collectiveName: asString(body?.collectiveName, 160),
    collectiveWebsiteUrl: asString(body?.collectiveWebsiteUrl, 1000),
  };
}

function normalizeProgramMetrics(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item: any) => ({
      position: asString(item?.position, 40),
      metricKey: asString(item?.metricKey, 80),
      metricLabel: asString(item?.metricLabel, 120),
      averageValue: asNumber(item?.averageValue),
      minValue: asNumber(item?.minValue),
      maxValue: asNumber(item?.maxValue),
      unit: asString(item?.unit, 40),
    }))
    .filter((item) => item.position && item.metricKey)
    .slice(0, 200);
}

function normalizeSubmittedData(body: any) {
  return {
    nickname: asString(body?.nickname, 120),
    logoUrl: asString(body?.logoUrl, 1000),

    baseballWebsiteUrl: asString(body?.baseballWebsiteUrl, 1000),
    rosterUrl: asString(body?.rosterUrl, 1000),
    scheduleUrl: asString(body?.scheduleUrl, 1000),
    campsUrl: asString(body?.campsUrl, 1000),
    questionnaireUrl: asString(body?.questionnaireUrl, 1000),
    generalContactUrl: asString(body?.generalContactUrl, 1000),
    generalContactEmail: asString(body?.generalContactEmail, 320),

    recruitingCoordinatorName: asString(body?.recruitingCoordinatorName, 120),
    recruitingCoordinatorEmail: asString(body?.recruitingCoordinatorEmail, 320),
    recruitingCoordinatorPhone: asString(body?.recruitingCoordinatorPhone, 80),

    currentRosterSize: asNumber(body?.currentRosterSize),
    averageGpa: asNumber(body?.averageGpa),

    scholarshipNotes: asString(body?.scholarshipNotes, 2000),
    scholarshipInfoUrl: asString(body?.scholarshipInfoUrl, 1000),

    transferHeavy: asBoolean(body?.transferHeavy),
    jucoFriendly: asBoolean(body?.jucoFriendly),

    recruitingAggressiveness: asString(body?.recruitingAggressiveness, 120),
    regionalRecruitingBias: asString(body?.regionalRecruitingBias, 240),
    rosterTurnoverLevel: asString(body?.rosterTurnoverLevel, 120),
    playerDevelopmentNotes: asString(body?.playerDevelopmentNotes, 2000),

    academicAreas: asStringArray(body?.academicAreas),
    rosterNeeds: normalizeRosterNeeds(body?.rosterNeeds),
    coachContacts: normalizeCoachContacts(body?.coachContacts),
    nilInfo: normalizeNilInfo(body),
    programMetrics: normalizeProgramMetrics(body?.programMetrics),

    submittedAt: new Date().toISOString(),
  };
}

export async function GET() {
  const user = await getCurrentUser();

  if (!user?.id) {
    return NextResponse.json<Err>(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (!user.collegeId) {
    return NextResponse.json<Err>(
      { ok: false, error: "Coach is not linked to a college." },
      { status: 403 }
    );
  }

  const college = await prisma.college.findUnique({
    where: { id: user.collegeId },
    include: {
      academicAreas: {
        orderBy: { name: "asc" },
      },
      academicProfile: true,
      nilProfile: {
        include: {
          collectives: true,
        },
      },
      baseballProgram: {
        include: {
          coaches: {
            orderBy: [{ isHeadCoach: "desc" }, { title: "asc" }, { name: "asc" }],
          },
          rosterNeeds: {
            orderBy: [{ gradYear: "asc" }, { position: "asc" }],
          },
          metricAverages: {
            orderBy: [{ position: "asc" }, { metricKey: "asc" }],
          },
        },
      },
      programVerificationSubmissions: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          status: true,
          submittedData: true,
          adminNotes: true,
          createdAt: true,
          reviewedAt: true,
        },
      },
    },
  });

  if (!college) {
    return NextResponse.json<Err>(
      { ok: false, error: "College not found." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    data: {
      college,
    },
  });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();

  if (!user?.id) {
    return NextResponse.json<Err>(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (!user.collegeId) {
    return NextResponse.json<Err>(
      { ok: false, error: "Coach is not linked to a college." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({} as any));
  const submittedData = normalizeSubmittedData(body);

  const submission = await prisma.collegeProgramVerificationSubmission.create({
    data: {
      collegeId: user.collegeId,
      submittedByUserId: user.id,
      status: "PENDING",
      submittedData,
    },
  });

  return NextResponse.json({
    ok: true,
    data: {
      submission: {
        id: submission.id,
        status: submission.status,
        createdAt: submission.createdAt.toISOString(),
      },
    },
  });
}