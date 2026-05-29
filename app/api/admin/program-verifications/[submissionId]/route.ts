// app/api/admin/program-verifications/[submissionId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Err = { ok: false; error: string };

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user?.id) return null;

  const admin = await prisma.adminUser.findUnique({
    where: { userId: user.id },
    include: { roles: true },
  });

  if (!admin?.isActive) return null;

  const allowed = admin.roles.some((r) =>
    ["SCOUTLINE_ADMIN", "SUPPORT_AGENT"].includes(r.role)
  );

  return allowed ? user : null;
}

function cleanString(value: unknown, max = 2000) {
  const s = String(value ?? "").trim();
  return s ? s.slice(0, max) : null;
}

function cleanNumber(value: unknown) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function cleanBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function cleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((v) => String(v ?? "").trim())
        .filter(Boolean)
        .slice(0, 100)
    )
  );
}

function cleanNeedLevel(value: unknown) {
  const v = String(value ?? "").trim().toUpperCase();
  if (["HIGH", "MEDIUM", "LOW", "UNKNOWN"].includes(v)) return v as any;
  return "UNKNOWN" as const;
}

function cleanNilStrength(value: unknown) {
  const v = String(value ?? "").trim().toUpperCase();

  if (
    ["ELITE", "STRONG", "COMPETITIVE", "EMERGING", "LIMITED", "UNKNOWN"].includes(
      v
    )
  ) {
    return v as any;
  }

  return "UNKNOWN" as const;
}

function buildProgramUpdate(data: any) {
  return {
    nickname: cleanString(data?.nickname, 120),
    logoUrl: cleanString(data?.logoUrl, 1000),
    baseballWebsiteUrl: cleanString(data?.baseballWebsiteUrl, 1000),
    rosterUrl: cleanString(data?.rosterUrl, 1000),
    scheduleUrl: cleanString(data?.scheduleUrl, 1000),
    campsUrl: cleanString(data?.campsUrl, 1000),
    questionnaireUrl: cleanString(data?.questionnaireUrl, 1000),
    generalContactUrl: cleanString(data?.generalContactUrl, 1000),
    generalContactEmail: cleanString(data?.generalContactEmail, 320),
    currentRosterSize: cleanNumber(data?.currentRosterSize),
    averageGpa: cleanNumber(data?.averageGpa),
    scholarshipNotes: cleanString(data?.scholarshipNotes, 2000),
    scholarshipInfoUrl: cleanString(data?.scholarshipInfoUrl, 1000),
    transferHeavy: cleanBoolean(data?.transferHeavy),
    jucoFriendly: cleanBoolean(data?.jucoFriendly),
    recruitingAggressiveness: cleanString(data?.recruitingAggressiveness, 120),
    regionalRecruitingBias: cleanString(data?.regionalRecruitingBias, 240),
    rosterTurnoverLevel: cleanString(data?.rosterTurnoverLevel, 120),
    playerDevelopmentNotes: cleanString(data?.playerDevelopmentNotes, 2000),
    lastVerifiedAt: new Date(),
    verificationStatus: "VERIFIED" as const,
  };
}

function getCoachContacts(data: any) {
  const raw = Array.isArray(data?.coachContacts) ? data.coachContacts : [];

  return raw
    .map((c: any) => ({
      name: cleanString(c?.name, 120),
      title: cleanString(c?.title, 120),
      email: cleanString(c?.email, 320),
      phone: cleanString(c?.phone, 80),
      isRecruitingContact: Boolean(c?.isRecruitingContact),
    }))
    .filter((c: any) => c.name || c.email)
    .slice(0, 25);
}

function getRosterNeeds(data: any) {
  const raw = Array.isArray(data?.rosterNeeds) ? data.rosterNeeds : [];

  return raw
    .map((n: any) => ({
      gradYear: cleanNumber(n?.gradYear),
      position: cleanString(n?.position, 40),
      needLevel: cleanNeedLevel(n?.needLevel),
      notes: cleanString(n?.notes, 500),
    }))
    .filter((n: any) => n.gradYear && n.position)
    .slice(0, 100);
}

function getProgramMetrics(data: any) {
  const raw = Array.isArray(data?.programMetrics) ? data.programMetrics : [];

  return raw
    .map((m: any) => ({
      position: cleanString(m?.position, 40),
      metricKey: cleanString(m?.metricKey, 80),
      metricLabel: cleanString(m?.metricLabel, 120),
      averageValue: cleanNumber(m?.averageValue),
      minValue: cleanNumber(m?.minValue),
      maxValue: cleanNumber(m?.maxValue),
      unit: cleanString(m?.unit, 40),
    }))
    .filter((m: any) => m.position && m.metricKey)
    .slice(0, 200);
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: { submissionId: string } }
) {
  const user = await requireAdmin();

  if (!user?.id) {
    return NextResponse.json<Err>(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const submissionId = ctx.params.submissionId;
  const body = await req.json().catch(() => ({} as any));

  const action = String(body?.action || "").trim().toUpperCase();
  const adminNotes = String(body?.adminNotes || "").trim() || null;

  if (!["APPROVE", "REJECT"].includes(action)) {
    return NextResponse.json<Err>(
      { ok: false, error: "Invalid action." },
      { status: 400 }
    );
  }

  const submission = await prisma.collegeProgramVerificationSubmission.findUnique({
    where: { id: submissionId },
    include: {
      college: {
        include: {
          baseballProgram: true,
        },
      },
      submittedByUser: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!submission) {
    return NextResponse.json<Err>(
      { ok: false, error: "Submission not found." },
      { status: 404 }
    );
  }

  if (submission.status !== "PENDING") {
    return NextResponse.json<Err>(
      { ok: false, error: `Submission is already ${submission.status}.` },
      { status: 400 }
    );
  }

  const submittedData = submission.submittedData as any;

  if (action === "REJECT") {
    const updated = await prisma.collegeProgramVerificationSubmission.update({
      where: { id: submission.id },
      data: {
        status: "REJECTED",
        adminNotes,
        reviewedByUserId: user.id,
        reviewedAt: new Date(),
      },
    });

    await prisma.notification.create({
      data: {
        userId: submission.submittedByUserId,
        type: "PROGRAM_UPDATE_REJECTED",
        message: `${submission.college.name} program verification was not approved.`,
        data: {
          collegeId: submission.collegeId,
          submissionId: submission.id,
          adminNotes,
          event: "PROGRAM_VERIFICATION_REJECTED",
        },
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        submission: {
          id: updated.id,
          status: updated.status,
        },
      },
    });
  }

  const programUpdate = buildProgramUpdate(submittedData);
  const coachContacts = getCoachContacts(submittedData);
  const rosterNeeds = getRosterNeeds(submittedData);
  const programMetrics = getProgramMetrics(submittedData);
  const academicAreas = cleanStringArray(submittedData?.academicAreas);
  const nilInfo = submittedData?.nilInfo || {};

  const updated = await prisma.$transaction(async (tx) => {
    const program = await tx.collegeBaseballProgram.upsert({
      where: { collegeId: submission.collegeId },
      create: {
        collegeId: submission.collegeId,
        ...programUpdate,
      },
      update: programUpdate,
    });

    await tx.college.update({
      where: { id: submission.collegeId },
      data: {
        logoUrl: programUpdate.logoUrl,
        programWebsiteUrl: programUpdate.baseballWebsiteUrl,
        recruitingQuestionnaireUrl: programUpdate.questionnaireUrl,
        programProfileUpdatedAt: new Date(),
        programProfileUpdatedByUserId: user.id,
        verificationStatus: "VERIFIED",
        lastVerifiedAt: new Date(),
      },
    });

    if (academicAreas.length) {
      await tx.collegeAcademicArea.deleteMany({
        where: { collegeId: submission.collegeId },
      });

      await tx.collegeAcademicArea.createMany({
        data: academicAreas.map((name) => ({
          collegeId: submission.collegeId,
          name,
        })),
        skipDuplicates: true,
      });
    }

    if (coachContacts.length) {
      await tx.collegeBaseballCoach.deleteMany({
        where: { programId: program.id },
      });

      await tx.collegeBaseballCoach.createMany({
        data: coachContacts.map((coach: any) => ({
          programId: program.id,
          name: coach.name || "Unknown Coach",
          title: coach.title,
          email: coach.email,
          phone: coach.phone,
          isHeadCoach: String(coach.title || "")
            .toLowerCase()
            .includes("head coach"),
        })),
      });
    }

    if (rosterNeeds.length) {
      await tx.collegeBaseballRosterNeed.deleteMany({
        where: { programId: program.id },
      });

      await tx.collegeBaseballRosterNeed.createMany({
        data: rosterNeeds.map((need: any) => ({
          programId: program.id,
          gradYear: need.gradYear,
          position: need.position,
          needLevel: need.needLevel,
          notes: need.notes,
          lastVerifiedAt: new Date(),
        })),
      });
    }

        if (programMetrics.length) {
      await tx.collegeBaseballMetricAverage.deleteMany({
        where: { programId: program.id },
      });

      await tx.collegeBaseballMetricAverage.createMany({
        data: programMetrics.map((metric: any) => ({
          programId: program.id,
          position: metric.position,
          metricKey: metric.metricKey,
          metricLabel: metric.metricLabel,
          averageValue: metric.averageValue,
          minValue: metric.minValue,
          maxValue: metric.maxValue,
          unit: metric.unit,
          lastVerifiedAt: new Date(),
        })),
      });
    }

    const nilAvailable = cleanBoolean(nilInfo?.nilAvailable);
    const baseballNilStrength = cleanNilStrength(nilInfo?.baseballNilStrength);
    const nilSummary = cleanString(nilInfo?.nilSummary, 2000);
    const nilNotes = cleanString(nilInfo?.nilNotes, 2000);
    const collectiveName = cleanString(nilInfo?.collectiveName, 160);
    const collectiveWebsiteUrl = cleanString(nilInfo?.collectiveWebsiteUrl, 1000);

    if (
      nilAvailable !== undefined ||
      baseballNilStrength !== "UNKNOWN" ||
      nilSummary ||
      nilNotes ||
      collectiveName ||
      collectiveWebsiteUrl
    ) {
      const nilProfile = await tx.collegeNilProfile.upsert({
        where: { collegeId: submission.collegeId },
        create: {
          collegeId: submission.collegeId,
          nilAvailable: nilAvailable ?? false,
          baseballNilStrength,
          nilSummary,
          nilNotes,
          sourceType: "COACH_VERIFIED",
          confidence: "HIGH",
          verifiedAt: new Date(),
        },
        update: {
          nilAvailable,
          baseballNilStrength,
          nilSummary,
          nilNotes,
          sourceType: "COACH_VERIFIED",
          confidence: "HIGH",
          verifiedAt: new Date(),
        },
      });

      if (collectiveName || collectiveWebsiteUrl) {
        await tx.collegeNilCollective.deleteMany({
          where: { nilProfileId: nilProfile.id },
        });

        await tx.collegeNilCollective.create({
          data: {
            nilProfileId: nilProfile.id,
            name: collectiveName || "Program NIL Collective",
            websiteUrl: collectiveWebsiteUrl,
            sourceType: "COACH_VERIFIED",
            confidence: "HIGH",
            verifiedAt: new Date(),
          },
        });
      }
    }

    const reviewed = await tx.collegeProgramVerificationSubmission.update({
      where: { id: submission.id },
      data: {
        status: "APPROVED",
        adminNotes,
        reviewedByUserId: user.id,
        reviewedAt: new Date(),
      },
    });

    await tx.notification.create({
      data: {
        userId: submission.submittedByUserId,
        type: "PROGRAM_UPDATE_APPROVED",
        message: `${submission.college.name} program verification was approved.`,
        data: {
          collegeId: submission.collegeId,
          submissionId: submission.id,
          event: "PROGRAM_VERIFICATION_APPROVED",
        },
      },
    });

    return reviewed;
  });

  return NextResponse.json({
    ok: true,
    data: {
      submission: {
        id: updated.id,
        status: updated.status,
      },
    },
  });
}