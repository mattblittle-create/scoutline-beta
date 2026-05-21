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

  const updated = await prisma.$transaction(async (tx) => {
    await tx.collegeBaseballProgram.upsert({
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