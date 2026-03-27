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
  collegeProgram: string;
  workEmail: string;
  workPhone?: string;
  workPhoneExt?: string;
  phonePrivate?: boolean;
};

function digitsOnly(v: unknown) {
  return String(v ?? "").replace(/\D+/g, "");
}

function normalizeEmail(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

function normalizeText(v: unknown) {
  return String(v ?? "").trim();
}

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function slugifyCollegeName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
}

async function ensureCollegeByName(collegeProgram: string) {
  const existing = await prisma.college.findFirst({
    where: {
      name: {
        equals: collegeProgram,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  if (existing?.id) return existing;

  const baseSlug = slugifyCollegeName(collegeProgram) || "college";
  let slug = baseSlug;
  let counter = 2;

  for (;;) {
    const clash = await prisma.college.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!clash?.id) break;

    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return prisma.college.create({
    data: {
      name: collegeProgram,
      slug,
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });
}

export async function POST(req: Request) {
  let stage = "start";

  try {
    stage = "parse-body";
    const reqBody = (await req.json().catch(() => ({}))) as Partial<Body>;

    const name = normalizeText(reqBody?.name);
    const staffTitle = normalizeText(reqBody?.role);
    const collegeProgram = normalizeText(reqBody?.collegeProgram);

    const workEmail = normalizeEmail(reqBody?.workEmail);
    const workPhone = digitsOnly(reqBody?.workPhone).slice(0, 10);
    const workPhoneExt = digitsOnly(reqBody?.workPhoneExt).slice(0, 6);
    const phonePrivate = reqBody?.phonePrivate === false ? false : true;

    stage = "validate-input";
    if (!workEmail) {
      return NextResponse.json(
        { ok: false, error: "Work email is required." },
        { status: 400 }
      );
    }

    if (!isEmail(workEmail)) {
      return NextResponse.json(
        { ok: false, error: "Valid work email is required." },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { ok: false, error: "Coach name is required." },
        { status: 400 }
      );
    }

    if (!staffTitle) {
      return NextResponse.json(
        { ok: false, error: "Role is required." },
        { status: 400 }
      );
    }

    if (!collegeProgram) {
      return NextResponse.json(
        { ok: false, error: "College / University is required." },
        { status: 400 }
      );
    }

    stage = "lookup-existing-user";
    const existing = await prisma.user.findUnique({
      where: { email: workEmail },
      select: {
        id: true,
        slug: true,
        passwordHash: true,
      },
    });

    let slugToSet: string | undefined;
    if (!existing?.slug && name) {
      stage = "generate-user-slug";
      const base = slugifyName(name);
      slugToSet = await generateUniqueSlug(prisma, base);
    }

    stage = "ensure-college";
    const college = await ensureCollegeByName(collegeProgram);

    stage = "upsert-user-and-coach-profile";
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { email: workEmail },
        update: {
          name,
          role: "COACH",
          program: collegeProgram,
          workPhone: workPhone || null,
          workPhoneExt: workPhoneExt || null,
          phonePrivate,
          collegeId: college.id,
          ...(slugToSet ? { slug: slugToSet } : {}),
          updatedAt: new Date(),
        },
        create: {
          email: workEmail,
          name,
          role: "COACH",
          program: collegeProgram,
          workPhone: workPhone || null,
          workPhoneExt: workPhoneExt || null,
          phonePrivate,
          collegeId: college.id,
          ...(slugToSet ? { slug: slugToSet } : {}),
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

      const coachProfile = await tx.coachProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          staffTitle,
          coachAccountType: "COLLEGE_COACH" as any,
          coachBillingStatus: "NONE" as any,
          contactEmail: workEmail,
          recruitingTargets: [],
        },
        update: {
          staffTitle,
          coachAccountType: "COLLEGE_COACH" as any,
          coachBillingStatus: "NONE" as any,
          contactEmail: workEmail,
          updatedAt: new Date(),
        },
        select: {
          id: true,
        },
      });

      return { user, coachProfile };
    });

    const needsSetPassword = !result.user.passwordHash;

    let rawToken: string | null = null;
    let setPasswordLink: string | null = null;
    let expiresAt: Date | null = null;

    if (needsSetPassword) {
      stage = "invalidate-existing-set-password-tokens";
      await invalidateExistingTokens({
        email: workEmail,
        purpose: "SET_PASSWORD",
      });

      stage = "create-set-password-token";
      const tokenResult = await createVerificationToken({
        email: workEmail,
        purpose: "SET_PASSWORD",
      });

      rawToken = tokenResult.rawToken;
      expiresAt = tokenResult.token.expiresAt;
      setPasswordLink = `${getBaseUrl()}/set-password?token=${encodeURIComponent(
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
          workPhone: workPhone || null,
          workPhoneExt: workPhoneExt || null,
          phonePrivate,
        },
        coachProfileId: result.coachProfile.id,
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
        error: `Coach onboarding failed at stage: ${stage}. ${err?.message || "Server error"}`,
      },
      { status: 500 }
    );
  }
}