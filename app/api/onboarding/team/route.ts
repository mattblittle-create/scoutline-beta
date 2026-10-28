// app/api/onboarding/team/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createVerificationToken,
  invalidateExistingTokens,
} from "@/lib/auth/tokens";
import { sendSetPasswordEmail } from "@/lib/email/sendSetPasswordEmail";
import { getBaseUrl } from "@/lib/email/senders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  adminEmail?: string | null;
  adminFirstName?: string | null;
  adminLastName?: string | null;

  adminPhone?: string | null;
  adminPhoneExt?: string | null;
  phonePrivate?: boolean | null;

  teamName?: string | null;
  city?: string | null;
  state?: string | null;

  website?: string | null;
  logoUrl?: string | null;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function digitsOnly(v: unknown) {
  return String(v ?? "").replace(/\D+/g, "");
}

function normalizeEmail(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

function normalizeText(v: unknown) {
  return String(v ?? "").trim();
}

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function slugifyTeamName(name: string) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "team"
  );
}

function normalizeLogoUrl(v: unknown) {
  const s = String(v ?? "").trim();
  if (!s) return null;

  if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(s)) return s;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("//")) return `https:${s}`;
  if (/^[a-z0-9.-]+\.[a-z]{2,}([/].*)?$/i.test(s)) return `https://${s}`;

  return null;
}

async function ensureUniqueTeamSlug(tx: any, teamName: string) {
  const baseSlug = slugifyTeamName(teamName);
  let slug = baseSlug;

  for (let i = 0; i < 25; i++) {
    const exists = await tx.team.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!exists) return slug;
    slug = `${baseSlug}-${i + 2}`;
  }

  throw new Error("Could not generate a unique team slug.");
}

export async function POST(req: Request) {
  let stage = "start";

  try {
    stage = "parse-body";
    const reqBody = (await req.json().catch(() => ({}))) as Partial<Body>;

    const adminEmail = normalizeEmail(reqBody?.adminEmail);
    const adminFirstName = normalizeText(reqBody?.adminFirstName);
    const adminLastName = normalizeText(reqBody?.adminLastName);

    const adminPhone = digitsOnly(reqBody?.adminPhone).slice(0, 10);
    const adminPhoneExt = digitsOnly(reqBody?.adminPhoneExt).slice(0, 6);
    const phonePrivate = reqBody?.phonePrivate === false ? false : true;

    const teamName = normalizeText(reqBody?.teamName);
    const city = normalizeText(reqBody?.city);
    const state = normalizeText(reqBody?.state).toUpperCase();
    const website = normalizeText(reqBody?.website) || null;
    const logoUrl = normalizeLogoUrl(reqBody?.logoUrl);

    stage = "validate-input";
    if (!adminEmail) return jsonError("Admin email is required.");
    if (!isEmail(adminEmail)) return jsonError("Admin email must be a valid email address.");
    if (!adminFirstName) return jsonError("Admin first name is required.");
    if (!adminLastName) return jsonError("Admin last name is required.");
    if (adminPhone.length !== 10) return jsonError("Admin phone must be 10 digits.");

    if (!teamName) return jsonError("Team name is required.");
    if (!city) return jsonError("City is required.");
    if (!state) return jsonError("State is required.");

    stage = "lookup-existing-user";
    const existing = await prisma.user.findUnique({
      where: { email: adminEmail },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        Player: { select: { id: true } },
        coachProfile: { select: { id: true } },
        teamMemberships: {
          select: { id: true, role: true, teamId: true },
        },
      },
    });

    if (existing?.coachProfile?.id) {
      return jsonError(
        "This email is already registered as a Coach account. Please use a different email for Team Admin.",
        409
      );
    }

    if (existing?.Player?.id) {
      return jsonError(
        "This email is already registered as a Player account. Please use a different email for Team Admin.",
        409
      );
    }

    stage = "upsert-user-team-membership-team";
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.upsert({
        where: { email: adminEmail },
        update: {
          name: `${adminFirstName} ${adminLastName}`.trim(),
          role: "TEAM_ADMIN",
          workPhone: adminPhone || null,
          workPhoneExt: adminPhoneExt || null,
          phonePrivate,
          updatedAt: new Date(),
        },
        create: {
          email: adminEmail,
          name: `${adminFirstName} ${adminLastName}`.trim(),
          role: "TEAM_ADMIN",
          workPhone: adminPhone || null,
          workPhoneExt: adminPhoneExt || null,
          phonePrivate,
          emailPrivate: false,
        },
        select: { id: true, email: true, name: true, passwordHash: true },
      });

      const existingAdminMembership = await tx.teamMembership.findFirst({
        where: { userId: user.id, role: "TEAM_ADMIN" as any },
        include: { team: true },
      });

      let teamId: string;

      if (existingAdminMembership?.team) {
        teamId = existingAdminMembership.team.id;

        await tx.team.update({
          where: { id: teamId },
          data: {
            name: teamName,
            city,
            state,
            websiteUrl: website,
            ...(logoUrl ? { logoUrl } : {}),
          },
        });
      } else {
        const slug = await ensureUniqueTeamSlug(tx, teamName);

        const team = await tx.team.create({
          data: {
            name: teamName,
            slug,
            teamType: "TRAVEL" as any,
            city,
            state,
            websiteUrl: website,
            logoUrl,
          },
          select: { id: true },
        });

        teamId = team.id;

        const existingAdminForTeam = await tx.teamMembership.findFirst({
          where: {
            teamId,
            role: "TEAM_ADMIN" as any,
          },
          select: { id: true },
        });

        if (existingAdminForTeam) {
          throw new Error("This team already has an admin assigned.");
        }

        await tx.teamMembership.create({
          data: {
            userId: user.id,
            teamId,
            role: "TEAM_ADMIN" as any,
            season: null,
            isPrimaryForProfile: true,
            isActive: true,
          },
        });
      }

      const team = await tx.team.findUnique({
        where: { id: teamId },
        select: {
          id: true,
          slug: true,
          name: true,
          city: true,
          state: true,
          websiteUrl: true,
          logoUrl: true,
        },
      });

      return { user, team };
    });

    const needsSetPassword = !result.user.passwordHash;

    let rawToken: string | null = null;
    let setPasswordLink: string | null = null;
    let expiresAt: Date | null = null;

    if (needsSetPassword) {
      stage = "invalidate-existing-set-password-tokens";
      await invalidateExistingTokens({
        email: adminEmail,
        purpose: "SET_PASSWORD",
      });

      stage = "create-set-password-token";
      const tokenResult = await createVerificationToken({
        email: adminEmail,
        purpose: "SET_PASSWORD",
      });

      rawToken = tokenResult.rawToken;
      expiresAt = tokenResult.token.expiresAt;
      setPasswordLink = `${getBaseUrl()}/set-password?token=${encodeURIComponent(
        rawToken
      )}`;

      stage = "send-set-password-email";
      await sendSetPasswordEmail({
        to: adminEmail,
        rawToken,
        roleLabel: "ScoutLine team admin account",
      });
    }

    stage = "return-success";
    return NextResponse.json({
      ok: true,
      data: {
        needsSetPassword,
        setPasswordToken: rawToken,
        setPasswordLink,
        expiresAt,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name ?? null,
          workPhone: adminPhone || null,
          workPhoneExt: adminPhoneExt || null,
          phonePrivate,
        },
        team: {
          id: result.team?.id,
          slug: result.team?.slug,
          name: result.team?.name,
          city: result.team?.city,
          state: result.team?.state,
          websiteUrl: result.team?.websiteUrl,
          logoUrl: result.team?.logoUrl ?? null,
        },
        emailDispatch: {
          sent: needsSetPassword,
          to: adminEmail,
        },
      },
    });
  } catch (err: any) {
    console.error("team onboarding error:", {
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
        error: `Team onboarding failed at stage: ${stage}. ${err?.message || "Server error"}`,
      },
      { status: 500 }
    );
  }
}