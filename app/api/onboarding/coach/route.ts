// app/api/onboarding/coach/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugifyName, generateUniqueSlug } from "@/lib/slug";
import {
  createVerificationToken,
  invalidateExistingTokens,
} from "@/lib/auth/tokens";
import { sendSetPasswordEmail } from "@/lib/email/sendSetPasswordEmail";
import { getBaseUrl } from "@/lib/email/senders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  name: string;
  role: string;
  collegeId: string;
  coachRecordId?: string | null;
  workEmail: string;
  workPhone?: string;
  workPhoneExt?: string;
  phonePrivate?: boolean;
};

function digitsOnly(value: unknown) {
  return String(value ?? "").replace(/\D+/g, "");
}

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeCoachName(value: unknown) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[.'’`-]/g, "")
    .replace(/\b(dr|coach|jr|sr|ii|iii|iv)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isHeadCoachTitle(value: unknown) {
  const title = normalizeText(value).toLowerCase();

  return [
    "head coach",
    "co-head coach",
    "acting head coach",
    "interim head coach",
  ].includes(title);
}

export async function POST(req: Request) {
  let stage = "start";

  try {
    stage = "parse-body";

    const reqBody = (await req
      .json()
      .catch(() => ({}))) as Partial<Body>;

    const name = normalizeText(reqBody.name);
    const staffTitle = normalizeText(reqBody.role);
    const collegeId = normalizeText(reqBody.collegeId);
    const requestedCoachRecordId =
      normalizeText(reqBody.coachRecordId) || null;

    const workEmail = normalizeEmail(reqBody.workEmail);
    const workPhone = digitsOnly(reqBody.workPhone).slice(0, 10);
    const workPhoneExt = digitsOnly(reqBody.workPhoneExt).slice(0, 6);
    const phonePrivate =
      reqBody.phonePrivate === false ? false : true;

    stage = "validate-input";

    if (!workEmail) {
      return NextResponse.json(
        {
          ok: false,
          error: "Work email is required.",
        },
        { status: 400 }
      );
    }

    if (!isEmail(workEmail)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Valid work email is required.",
        },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        {
          ok: false,
          error: "Coach name is required.",
        },
        { status: 400 }
      );
    }

    if (!staffTitle) {
      return NextResponse.json(
        {
          ok: false,
          error: "Role is required.",
        },
        { status: 400 }
      );
    }

    if (!collegeId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Please select an existing college or university.",
        },
        { status: 400 }
      );
    }

    if (workPhone.length > 0 && workPhone.length !== 10) {
      return NextResponse.json(
        {
          ok: false,
          error: "Phone must be 10 digits.",
        },
        { status: 400 }
      );
    }

    stage = "lookup-existing-user";

    const existing = await prisma.user.findUnique({
      where: {
        email: workEmail,
      },
      select: {
        id: true,
        slug: true,
        passwordHash: true,
      },
    });

    let slugToSet: string | undefined;

    if (!existing?.slug) {
      stage = "generate-user-slug";

      const base = slugifyName(name);
      slugToSet = await generateUniqueSlug(prisma, base);
    }

    stage = "load-existing-claim";

    const existingClaim = existing?.id
      ? await prisma.collegeBaseballCoach.findUnique({
          where: {
            claimedByUserId: existing.id,
          },
          select: {
            id: true,
            programId: true,
            name: true,
            email: true,
            claimedByUserId: true,
          },
        })
      : null;

    stage = "load-selected-college";

    const college = await prisma.college.findUnique({
      where: {
        id: collegeId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        baseballProgram: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!college) {
      return NextResponse.json(
        {
          ok: false,
          error: "The selected college could not be found.",
        },
        { status: 404 }
      );
    }

    if (!college.baseballProgram?.id) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "The selected college does not currently have a baseball program record.",
        },
        { status: 400 }
      );
    }

    const baseballProgramId = college.baseballProgram.id;
    const collegeProgram = college.name;

    if (
      existingClaim &&
      existingClaim.programId !== baseballProgramId
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "This ScoutLine account is already linked to a coach record at another college.",
        },
        { status: 409 }
      );
    }

    stage = "resolve-imported-coach-record";

    const activeProgramCoaches =
      await prisma.collegeBaseballCoach.findMany({
        where: {
          programId: baseballProgramId,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          claimedByUserId: true,
        },
      });

    let resolvedCoachRecord:
      | (typeof activeProgramCoaches)[number]
      | null = null;

    if (requestedCoachRecordId) {
      resolvedCoachRecord =
        activeProgramCoaches.find(
          (coach) => coach.id === requestedCoachRecordId
        ) ?? null;

      if (!resolvedCoachRecord) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "The selected coach record does not belong to this program or is no longer active.",
          },
          { status: 400 }
        );
      }
    }

    if (!resolvedCoachRecord && existingClaim) {
      resolvedCoachRecord = {
        id: existingClaim.id,
        name: existingClaim.name,
        email: existingClaim.email,
        claimedByUserId: existingClaim.claimedByUserId,
      };
    }

    if (!resolvedCoachRecord) {
      resolvedCoachRecord =
        activeProgramCoaches.find(
          (coach) =>
            normalizeEmail(coach.email) === workEmail
        ) ?? null;
    }

    if (!resolvedCoachRecord) {
      const normalizedRequestedName =
        normalizeCoachName(name);

      resolvedCoachRecord =
        activeProgramCoaches.find(
          (coach) =>
            normalizeCoachName(coach.name) ===
            normalizedRequestedName
        ) ?? null;
    }

    if (
      resolvedCoachRecord?.claimedByUserId &&
      resolvedCoachRecord.claimedByUserId !== existing?.id
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "This coach staff record has already been claimed by another ScoutLine account.",
        },
        { status: 409 }
      );
    }

    if (
      existingClaim &&
      resolvedCoachRecord &&
      existingClaim.id !== resolvedCoachRecord.id
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "This ScoutLine account is already linked to another coach staff record.",
        },
        { status: 409 }
      );
    }

    stage = "upsert-user-and-coach-profile";

    const result = await prisma.$transaction(
      async (tx) => {
        const user = await tx.user.upsert({
          where: {
            email: workEmail,
          },
          update: {
            name,
            role: "COACH",
            program: collegeProgram,
            workPhone,
            workPhoneExt: workPhoneExt || null,
            phonePrivate,
            collegeId: college.id,
            ...(slugToSet
              ? {
                  slug: slugToSet,
                }
              : {}),
            updatedAt: new Date(),
          },
          create: {
            email: workEmail,
            name,
            role: "COACH",
            program: collegeProgram,
            workPhone,
            workPhoneExt: workPhoneExt || null,
            phonePrivate,
            collegeId: college.id,
            ...(slugToSet
              ? {
                  slug: slugToSet,
                }
              : {}),
            emailPrivate: false,
          },
          select: {
            id: true,
            email: true,
            name: true,
            slug: true,
            passwordHash: true,
          },
        });

        const coachProfile =
          await tx.coachProfile.upsert({
            where: {
              userId: user.id,
            },
            create: {
              userId: user.id,
              staffTitle,
              coachAccountType:
                "COLLEGE_COACH" as any,
              coachBillingStatus: "NONE" as any,
              contactEmail: workEmail,
              recruitingTargets: [],
            },
            update: {
              staffTitle,
              coachAccountType:
                "COLLEGE_COACH" as any,
              coachBillingStatus: "NONE" as any,
              contactEmail: workEmail,
              updatedAt: new Date(),
            },
            select: {
              id: true,
            },
          });

        const verifiedAt = new Date();

        let claimedCoachRecordId: string;

        if (resolvedCoachRecord) {
          const claimedCoach =
            await tx.collegeBaseballCoach.update({
              where: {
                id: resolvedCoachRecord.id,
              },
              data: {
                name,
                title: staffTitle,
                email: workEmail,
                phone: workPhone,

                isHeadCoach:
                  isHeadCoachTitle(staffTitle),

                claimedByUserId: user.id,
                claimedAt: verifiedAt,
                manuallyVerifiedAt: verifiedAt,

                dataSource: "COACH_VERIFIED",
                reviewStatus: "MANUAL_VERIFIED",
                isActive: true,
              },
              select: {
                id: true,
              },
            });

          claimedCoachRecordId = claimedCoach.id;
        } else {
          const claimedCoach =
            await tx.collegeBaseballCoach.create({
              data: {
                programId: baseballProgramId,

                name,
                title: staffTitle,
                email: workEmail,
                phone: workPhone,

                isHeadCoach:
                  isHeadCoachTitle(staffTitle),

                dataSource: "COACH_VERIFIED",
                reviewStatus: "MANUAL_VERIFIED",
                isActive: true,

                claimedByUserId: user.id,
                claimedAt: verifiedAt,
                manuallyVerifiedAt: verifiedAt,
                lastSeenAt: verifiedAt,
              },
              select: {
                id: true,
              },
            });

          claimedCoachRecordId = claimedCoach.id;
        }

        return {
          user,
          coachProfile,
          claimedCoachRecordId,
        };
      }
    );

    const needsSetPassword =
      !result.user.passwordHash;

    let rawToken: string | null = null;
    let setPasswordLink: string | null = null;
    let expiresAt: Date | null = null;

    if (needsSetPassword) {
      stage =
        "invalidate-existing-set-password-tokens";

      await invalidateExistingTokens({
        email: workEmail,
        purpose: "SET_PASSWORD",
      });

      stage = "create-set-password-token";

      const tokenResult =
        await createVerificationToken({
          email: workEmail,
          purpose: "SET_PASSWORD",
        });

      rawToken = tokenResult.rawToken;
      expiresAt = tokenResult.token.expiresAt;

      setPasswordLink =
        `${getBaseUrl()}/set-password?token=${encodeURIComponent(
          rawToken
        )}`;

      stage = "send-set-password-email";

      await sendSetPasswordEmail({
        to: workEmail,
        rawToken,
        roleLabel: "ScoutLine coach account",
      });
    }

    stage = "return-success";

    return NextResponse.json({
      ok: true,
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name ?? null,
          slug: result.user.slug ?? null,
          staffTitle,
          program: collegeProgram,
          collegeId: college.id,
          collegeSlug: college.slug,
          workPhone,
          workPhoneExt: workPhoneExt || null,
          phonePrivate,
        },
        coachProfileId: result.coachProfile.id,
        claimedCoachRecordId:
          result.claimedCoachRecordId,
        needsSetPassword,
        setPasswordToken: rawToken,
        setPasswordLink,
        expiresAt,
        emailDispatch: {
          sent: needsSetPassword,
          to: workEmail,
        },
      },
    });
  } catch (err: any) {
    console.error("coach onboarding error:", {
      stage,
      message: err?.message || "Unknown error",
      stack: err?.stack || null,
      name: err?.name || null,
      code: err?.code || null,
      meta: err?.meta || null,
      cause: err?.cause || null,
    });

    return NextResponse.json(
      {
        ok: false,
        error:
          `Coach onboarding failed at stage: ${stage}. ` +
          `${err?.message || "Server error"}`,
      },
      { status: 500 }
    );
  }
}