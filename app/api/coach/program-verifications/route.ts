// app/api/coach/program-verifications/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Err = { ok: false; error: string };

async function requireProgramAdmin() {
  const user = await getCurrentUser();

  if (!user?.id || !user.collegeId) return null;

  const coachProfile = await prisma.coachProfile.findUnique({
    where: { userId: user.id },
    select: { isProgramAdmin: true },
  });

  if (!coachProfile?.isProgramAdmin) return null;

  return user;
}

export async function GET() {
  const user = await requireProgramAdmin();

  if (!user?.id || !user.collegeId) {
    return NextResponse.json<Err>(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const submissions = await prisma.collegeProgramVerificationSubmission.findMany({
    where: {
      collegeId: user.collegeId,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      college: {
        include: {
          academicAreas: { orderBy: { name: "asc" } },
          nilProfile: { include: { collectives: true } },
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
        },
      },
      submittedByUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      reviewedByUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return NextResponse.json({
    ok: true,
    data: {
      submissions: submissions.map((s) => {
        const program = s.college.baseballProgram;
        const nilProfile = s.college.nilProfile;
        const firstCollective = nilProfile?.collectives?.[0] || null;

        return {
          id: s.id,
          status: s.status,
          submittedData: s.submittedData,
          currentData: {
            nickname: program?.nickname,
            logoUrl: program?.logoUrl || s.college.logoUrl,
            baseballWebsiteUrl: program?.baseballWebsiteUrl || s.college.programWebsiteUrl,
            rosterUrl: program?.rosterUrl,
            scheduleUrl: program?.scheduleUrl,
            campsUrl: program?.campsUrl,
            questionnaireUrl:
              program?.questionnaireUrl || s.college.recruitingQuestionnaireUrl,
            generalContactUrl: program?.generalContactUrl,
            generalContactEmail: program?.generalContactEmail,

            programXUrl: program?.programXUrl || s.college.programXUrl,
            programInstagramUrl:
              program?.programInstagramUrl || s.college.programInstagramUrl,
            programYoutubeUrl: program?.programYoutubeUrl,

            recruitingCoordinatorName: program?.recruitingCoordinatorName,
            recruitingCoordinatorEmail: program?.recruitingCoordinatorEmail,
            recruitingCoordinatorPhone: program?.recruitingCoordinatorPhone,
            recruitingCoordinatorXUrl: program?.recruitingCoordinatorXUrl,
            recruitingCoordinatorInstagramUrl:
              program?.recruitingCoordinatorInstagramUrl,

            currentRosterSize: program?.currentRosterSize,
            averageGpa: program?.averageGpa?.toString?.() ?? program?.averageGpa,
            scholarshipNotes: program?.scholarshipNotes,
            scholarshipInfoUrl: program?.scholarshipInfoUrl,
            transferHeavy: program?.transferHeavy,
            jucoFriendly: program?.jucoFriendly,
            recruitingAggressiveness: program?.recruitingAggressiveness,
            regionalRecruitingBias: program?.regionalRecruitingBias,
            rosterTurnoverLevel: program?.rosterTurnoverLevel,
            playerDevelopmentNotes: program?.playerDevelopmentNotes,

            academicAreas: s.college.academicAreas.map((a) => a.name),
            coachContacts: program?.coaches ?? [],
            rosterNeeds: program?.rosterNeeds ?? [],
            programMetrics: program?.metricAverages ?? [],

            nilInfo: {
              nilAvailable: nilProfile?.nilAvailable,
              baseballNilStrength: nilProfile?.baseballNilStrength,
              nilSummary: nilProfile?.nilSummary,
              nilNotes: nilProfile?.nilNotes,
              collectiveName: firstCollective?.name,
              collectiveWebsiteUrl: firstCollective?.websiteUrl,
            },
          },
          adminNotes: s.adminNotes,
          createdAt: s.createdAt.toISOString(),
          updatedAt: s.updatedAt.toISOString(),
          reviewedAt: s.reviewedAt ? s.reviewedAt.toISOString() : null,
          college: {
            id: s.college.id,
            name: s.college.name,
            slug: s.college.slug,
            division: s.college.division,
            conference: s.college.conference,
            state: s.college.state,
          },
          submittedByUser: s.submittedByUser,
          reviewedByUser: s.reviewedByUser,
        };
      }),
    },
  });
}