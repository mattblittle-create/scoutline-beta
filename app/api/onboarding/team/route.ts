// app/api/onboarding/team/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { SignJWT } from "jose";
import { sha256 } from "@/lib/hash";

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

  // ✅ NEW
  logoUrl?: string | null;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function digitsOnly(v: any) {
  return String(v ?? "").replace(/\D+/g, "");
}

function normalizeEmail(v: any) {
  return String(v ?? "").trim().toLowerCase();
}

function normalizeText(v: any) {
  return String(v ?? "").trim();
}

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function getSecret(): Uint8Array {
  const secret = process.env.APP_SECRET;
  if (!secret) throw new Error("Missing APP_SECRET");
  return new TextEncoder().encode(secret);
}

async function makeSetPasswordJwt(email: string) {
  // must match /api/auth/set-password expectation: "set-password"
  return new SignJWT({ email, purpose: "set-password" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(getSecret());
}

function getOriginFromHeaders(req: Request) {
  const h = req.headers;
  const proto = (h.get("x-forwarded-proto") || "http").split(",")[0].trim();
  const host = (h.get("x-forwarded-host") || h.get("host") || "").split(",")[0].trim();
  if (!host) return "";
  return `${proto}://${host}`;
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

function normalizeLogoUrl(v: any) {
  const s = String(v ?? "").trim();
  if (!s) return null;

  // allow data URLs (from file upload)
  if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(s)) return s;

  // allow absolute URLs
  if (/^https?:\/\//i.test(s)) return s;

  // allow protocol-relative
  if (s.startsWith("//")) return `https:${s}`;

  // allow "www.example.com/.." bare domains
  if (/^[a-z0-9.-]+\.[a-z]{2,}([/].*)?$/i.test(s)) return `https://${s}`;

  return null;
}

export async function POST(req: Request) {
  try {
    const reqBody = (await req.json().catch(() => ({}))) as Partial<Body>;

    const adminEmail = normalizeEmail(reqBody?.adminEmail);
    const adminFirstName = normalizeText(reqBody?.adminFirstName);
    const adminLastName = normalizeText(reqBody?.adminLastName);

    const adminPhone = digitsOnly(reqBody?.adminPhone || "").slice(0, 10);
    const adminPhoneExt = digitsOnly(reqBody?.adminPhoneExt || "").slice(0, 6);
    const phonePrivate = reqBody?.phonePrivate === false ? false : true;

    const teamName = normalizeText(reqBody?.teamName);
    const city = normalizeText(reqBody?.city);
    const state = normalizeText(reqBody?.state).toUpperCase();
    const website = normalizeText(reqBody?.website) || null;

    // ✅ NEW
    const logoUrl = normalizeLogoUrl(reqBody?.logoUrl);

    if (!adminEmail) return jsonError("Admin email is required.");
    if (!isEmail(adminEmail)) return jsonError("Admin email must be a valid email address.");
    if (!adminFirstName) return jsonError("Admin first name is required.");
    if (!adminLastName) return jsonError("Admin last name is required.");
    if (adminPhone.length !== 10) return jsonError("Admin phone must be 10 digits.");

    if (!teamName) return jsonError("Team name is required.");
    if (!city) return jsonError("City is required.");
    if (!state) return jsonError("State is required.");

    // Look up existing user to enforce "one email per role"
    const existing = await prisma.user.findUnique({
      where: { email: adminEmail },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        Player: { select: { id: true } },
        coachProfile: { select: { id: true } },
        teamMemberships: { select: { id: true } },
      },
    });

    // ✅ Enforce strict separation: TEAM_ADMIN email cannot be an existing player or coach account
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

    const shouldMintSetPassword = !existing?.passwordHash;

    const result = await prisma.$transaction(async (tx) => {
      // Upsert admin user (do not clobber role; just set basics)
      const user = await tx.user.upsert({
        where: { email: adminEmail },
        update: {
          name: `${adminFirstName} ${adminLastName}`.trim(),
          workPhone: adminPhone || null,
          workPhoneExt: adminPhoneExt || null,
          phonePrivate,
        },
        create: {
          email: adminEmail,
          name: `${adminFirstName} ${adminLastName}`.trim(),
          role: "TEAM_ADMIN",
          workPhone: adminPhone || null,
          workPhoneExt: adminPhoneExt || null,
          phonePrivate,
        },
        select: { id: true, email: true, name: true, passwordHash: true },
      });

      // Reuse existing TEAM_ADMIN membership team if it exists
      const existingAdminMembership = await tx.teamMembership.findFirst({
        where: { userId: user.id, role: "TEAM_ADMIN" as any },
        include: { team: true },
      });

      let teamId: string;
      let teamSlug: string | null = null;

      if (existingAdminMembership?.team) {
        teamId = existingAdminMembership.team.id;
        teamSlug = existingAdminMembership.team.slug ?? null;

        await tx.team.update({
          where: { id: teamId },
          data: {
            name: teamName,
            city,
            state,
            websiteUrl: website,
            // ✅ NEW: only set if provided (avoid wiping existing)
            ...(logoUrl ? { logoUrl } : {}),
          },
        });
      } else {
        const baseSlug = slugifyTeamName(teamName);
        let slug = baseSlug;
        for (let i = 0; i < 25; i++) {
          const exists = await tx.team.findUnique({ where: { slug }, select: { id: true } });
          if (!exists) break;
          slug = `${baseSlug}-${i + 2}`;
        }

        const team = await tx.team.create({
          data: {
            name: teamName,
            slug,
            city,
            state,
            websiteUrl: website,
            // ✅ NEW
            logoUrl: logoUrl,
          },
          select: { id: true, slug: true },
        });

        teamId = team.id;
        teamSlug = team.slug;

        const existingAdminForTeam = await tx.teamMembership.findFirst({
          where: { teamId: teamId, role: "TEAM_ADMIN" as any },
          select: { id: true },
        });
        if (existingAdminForTeam) {
          throw new Error("This team already has an admin assigned.");
        }

        await tx.teamMembership.create({
          data: {
            userId: user.id,
            teamId: teamId,
            role: "TEAM_ADMIN" as any,
            season: null,
            isPrimaryForProfile: true,
          },
        });
      }

      // Mint set-password token if needed + store verificationToken
      let setPasswordToken: string | null = null;

      if (!user.passwordHash) {
        const jwt = await makeSetPasswordJwt(user.email);
        const tokenHashDb = sha256(jwt);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        await tx.verificationToken.updateMany({
          where: { email: user.email, purpose: "SET_PASSWORD" as any, consumedAt: null },
          data: { consumedAt: new Date() },
        });

        await tx.verificationToken.create({
          data: {
            id: crypto.randomUUID(),
            email: user.email,
            tokenHash: tokenHashDb,
            purpose: "SET_PASSWORD" as any,
            expiresAt,
          },
        });

        setPasswordToken = jwt;
      }

      // Return current team snapshot (including logo)
      const team = await tx.team.findUnique({
        where: { id: teamId },
        select: { id: true, slug: true, name: true, city: true, state: true, websiteUrl: true, logoUrl: true },
      });

      return { user, team, setPasswordToken };
    });

    const origin = getOriginFromHeaders(req);
    const setPasswordLink =
      result.setPasswordToken && origin
        ? `${origin}/auth/set-password?token=${encodeURIComponent(result.setPasswordToken)}`
        : null;

    return NextResponse.json({
      ok: true,
      data: {
        needsSetPassword: shouldMintSetPassword,
        setPasswordToken: result.setPasswordToken,
        setPasswordLink,
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
          // ✅ NEW
          logoUrl: result.team?.logoUrl ?? null,
        },
      },
    });
  } catch (err: any) {
    console.error("team onboarding error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Server error" }, { status: 500 });
  }
}
