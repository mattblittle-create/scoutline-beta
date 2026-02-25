// app/api/team/org/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function normalizeEmail(v: any): string {
  return String(v || "").trim().toLowerCase();
}

function normalizeText(v: any): string {
  return String(v || "").trim();
}

function digitsOnly(v: any) {
  return String(v ?? "").replace(/\D+/g, "");
}

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function splitName(full: string | null | undefined) {
  const s = normalizeText(full);
  if (!s) return { first: "", last: "" };
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

/**
 * TeamType enum in schema:
 * TRAVEL | HS | TRAINING | COLLEGE | OTHER
 *
 * UI dropdown:
 * HS | TRAVEL | COLLEGE | OTHER
 */
function normalizeTeamType(v: any): "TRAVEL" | "HS" | "COLLEGE" | "OTHER" | null {
  const raw = normalizeText(v);
  if (!raw) return null;

  const s = raw.toUpperCase();

  if (s === "TRAVEL") return "TRAVEL";
  if (s === "HS" || s === "HIGH_SCHOOL" || s === "HIGHSCHOOL") return "HS";
  if (s === "COLLEGE") return "COLLEGE";
  if (s === "OTHER") return "OTHER";

  if (s === "TRAINING") return "OTHER";

  return null;
}

function slugify(input: string) {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

// Keep these out of /team/[slug]
const RESERVED_TEAM_SLUGS = new Set([
  "team",
  "teams",
  "dashboard",
  "admin",
  "api",
  "player",
  "players",
  "coach",
  "coaches",
  "auth",
  "login",
  "logout",
  "signup",
  "settings",
  "account",
  "billing",
  "public",
  "privacy",
  "terms",
  "help",
  "support",
]);

async function ensureUniqueTeamSlug(desiredSlug: string, teamId: string) {
  let base = slugify(desiredSlug);
  if (!base) base = `team-${teamId.slice(0, 6)}`;

  // avoid reserved
  if (RESERVED_TEAM_SLUGS.has(base)) base = `${base}-org`;

  // If base is unused (or used by this team), we're good
  const existing = await prisma.team.findUnique({
    where: { slug: base },
    select: { id: true },
  });

  if (!existing || existing.id === teamId) return base;

  // otherwise, add suffixes
  for (let i = 2; i <= 200; i++) {
    const candidate = `${base}-${i}`;
    const hit = await prisma.team.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!hit || hit.id === teamId) return candidate;
  }

  // final fallback
  return `${base}-${teamId.slice(0, 6)}`;
}

type OrgPayload = {
  // Admin fields (User)
  adminFirstName?: string | null;
  adminLastName?: string | null;
  adminPhone?: string | null;
  adminPhoneExt?: string | null;
  phonePrivate?: boolean | null;

  // Team fields (Team)
  teamType?: "TRAVEL" | "HS" | "COLLEGE" | "OTHER" | string | null;
  name?: string | null;
  city?: string | null;
  state?: string | null;
  websiteUrl?: string | null;

  // Public contact + socials + branding (Team)
  contactEmail?: string | null;
  phone?: string | null;
  phoneExt?: string | null;
  teamPhonePrivate?: boolean | null;
  xUrl?: string | null;
  instagramUrl?: string | null;
  logoUrl?: string | null;
};

async function getAdminTeamByEmail(adminEmail: string) {
  const user = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      workPhone: true,
      workPhoneExt: true,
      phonePrivate: true,
    },
  });
  if (!user) return null;

  const adminMembership = await prisma.teamMembership.findFirst({
    where: {
      userId: user.id,
      role: "TEAM_ADMIN",
    },
    include: { team: true },
  });

  if (!adminMembership?.team) return null;
  return { user, membership: adminMembership, team: adminMembership.team };
}

function pickEmailFromRequest(req: Request): string {
  const url = new URL(req.url);
  return normalizeEmail(url.searchParams.get("email") || url.searchParams.get("username"));
}

async function resolveEmail(req: Request): Promise<string> {
  const qEmail = pickEmailFromRequest(req);
  if (qEmail) return qEmail;

  const viewer = await getCurrentUser();
  const viewerEmail = normalizeEmail((viewer as any)?.email);
  return viewerEmail;
}

export async function GET(req: Request) {
  const email = await resolveEmail(req);

  if (!email) return jsonError("Missing email.", 400);
  if (!isEmail(email)) return jsonError("Invalid email.", 400);

  try {
    const found = await getAdminTeamByEmail(email);
    if (!found) return jsonError("No TEAM_ADMIN membership found for this user.", 404);

    const { team, user } = found;
    const n = splitName(user.name);

    return NextResponse.json({
      ok: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name ?? null,
          adminFirstName: n.first || null,
          adminLastName: n.last || null,
          workPhone: user.workPhone ?? null,
          workPhoneExt: user.workPhoneExt ?? null,
          phonePrivate: user.phonePrivate ?? true,
          role: user.role ?? null,
        },
        team: {
          teamId: team.id,
          id: team.id,
          slug: (team as any).slug ?? null,
          teamType: (team as any).teamType ?? null,

          name: (team as any).name ?? null,
          city: (team as any).city ?? null,
          state: (team as any).state ?? null,
          websiteUrl: (team as any).websiteUrl ?? null,
          logoUrl: (team as any).logoUrl ?? null,

          contactEmail: (team as any).contactEmail ?? null,
          phone: (team as any).phone ?? null,
          phoneExt: (team as any).phoneExt ?? null,
          phonePrivate: typeof (team as any).phonePrivate === "boolean" ? (team as any).phonePrivate : true,
          xUrl: (team as any).xUrl ?? null,
          instagramUrl: (team as any).instagramUrl ?? null,
        },
      },
    });
  } catch (e: any) {
    return jsonError(e?.message || "Failed to load org profile.", 500);
  }
}

export async function POST(req: Request) {
  const email = await resolveEmail(req);

  if (!email) return jsonError("Missing email.", 400);
  if (!isEmail(email)) return jsonError("Invalid email.", 400);

  let body: OrgPayload;
  try {
    body = (await req.json()) as OrgPayload;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  try {
    const found = await getAdminTeamByEmail(email);
    if (!found) return jsonError("No TEAM_ADMIN membership found for this user.", 404);

    const userId = found.user.id;
    const teamId = found.team.id;

    // ---- normalize user/admin ----
    const adminFirstName = normalizeText(body.adminFirstName) || null;
    const adminLastName = normalizeText(body.adminLastName) || null;

    const adminPhone = digitsOnly(body.adminPhone ?? "").slice(0, 10) || null;
    const adminPhoneExt = digitsOnly(body.adminPhoneExt ?? "").slice(0, 6) || null;

    const phonePrivate = typeof body.phonePrivate === "boolean" ? body.phonePrivate : undefined;

    // ---- normalize team ----
    const teamType = normalizeTeamType(body.teamType);

    // If client attempts to set teamType, it must be valid/non-empty.
    if (body.teamType !== undefined && teamType == null) {
      return jsonError("Team Type is required.", 400);
    }

    const name = normalizeText(body.name) || null;
    const city = normalizeText(body.city) || null;
    const state = normalizeText(body.state).toUpperCase() || null;

    const websiteUrl = normalizeText(body.websiteUrl) || null;

    const contactEmail = normalizeText(body.contactEmail) || null;

    const teamPhone = digitsOnly(body.phone ?? "").slice(0, 10) || null;
    const teamPhoneExt = digitsOnly(body.phoneExt ?? "").slice(0, 6) || null;

    const teamPhonePrivate = typeof body.teamPhonePrivate === "boolean" ? body.teamPhonePrivate : undefined;

    const xUrl = normalizeText(body.xUrl) || null;
    const instagramUrl = normalizeText(body.instagramUrl) || null;

    const logoUrl = normalizeText(body.logoUrl) || null;

    // light validation
    if (name && name.length < 2) return jsonError("Team / Organization name is too short.", 400);
    if (state && state.length > 2) return jsonError("State must be a 2-letter abbreviation.", 400);
    if (contactEmail && !isEmail(contactEmail)) return jsonError("Contact email looks invalid.", 400);

    const result = await prisma.$transaction(async (tx) => {
      // update user/admin fields if present
      const userData: Record<string, any> = {};
      if (body.adminFirstName !== undefined || body.adminLastName !== undefined) {
        const full = `${adminFirstName || ""} ${adminLastName || ""}`.trim();
        if (full) userData.name = full;
      }
      if (body.adminPhone !== undefined) userData.workPhone = adminPhone;
      if (body.adminPhoneExt !== undefined) userData.workPhoneExt = adminPhoneExt;
      if (phonePrivate !== undefined) userData.phonePrivate = phonePrivate;

      if (Object.keys(userData).length > 0) {
        await tx.user.update({ where: { id: userId }, data: userData });
      }

      // fetch current team slug so we can set it if missing (canonical)
      const currentTeam = await tx.team.findUnique({
        where: { id: teamId },
        select: { id: true, slug: true, name: true },
      });

      // update team fields if present
      const teamData: Record<string, any> = {};
      if (body.teamType !== undefined) teamData.teamType = teamType;

      if (body.name !== undefined) teamData.name = name;
      if (body.city !== undefined) teamData.city = city;
      if (body.state !== undefined) teamData.state = state;
      if (body.websiteUrl !== undefined) teamData.websiteUrl = websiteUrl;

      if (body.contactEmail !== undefined) teamData.contactEmail = contactEmail;

      if (body.phone !== undefined) teamData.phone = teamPhone;
      if (body.phoneExt !== undefined) teamData.phoneExt = teamPhoneExt;
      if (teamPhonePrivate !== undefined) teamData.phonePrivate = teamPhonePrivate;

      if (body.xUrl !== undefined) teamData.xUrl = xUrl;
      if (body.instagramUrl !== undefined) teamData.instagramUrl = instagramUrl;

      if (body.logoUrl !== undefined) teamData.logoUrl = logoUrl;

      // ✅ Canonical slug rules:
      // - If slug is blank/missing, set it once based on team name (collision-safe).
      // - Do NOT auto-change slug later when name changes (stable public URLs).
      const existingSlug = normalizeText(currentTeam?.slug);
      const nameForSlug = normalizeText(name || currentTeam?.name || "");
      if (!existingSlug && nameForSlug) {
        const desired = slugify(nameForSlug);
        const unique = await ensureUniqueTeamSlug(desired, teamId);
        teamData.slug = unique;
      }

      const updatedTeam = await tx.team.update({
        where: { id: teamId },
        data: teamData,
      });

      const updatedUser = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          workPhone: true,
          workPhoneExt: true,
          phonePrivate: true,
          role: true,
        },
      });

      return { updatedTeam, updatedUser };
    });

    const n = splitName(result.updatedUser?.name);

    return NextResponse.json({
      ok: true,
      data: {
        user: {
          id: result.updatedUser?.id,
          email: result.updatedUser?.email,
          name: result.updatedUser?.name ?? null,
          adminFirstName: n.first || null,
          adminLastName: n.last || null,
          workPhone: result.updatedUser?.workPhone ?? null,
          workPhoneExt: result.updatedUser?.workPhoneExt ?? null,
          phonePrivate: result.updatedUser?.phonePrivate ?? true,
          role: result.updatedUser?.role ?? null,
        },
        team: {
          teamId: result.updatedTeam.id,
          id: result.updatedTeam.id,
          slug: (result.updatedTeam as any).slug ?? null,
          teamType: result.updatedTeam.teamType,

          name: result.updatedTeam.name,
          city: (result.updatedTeam as any).city ?? null,
          state: (result.updatedTeam as any).state ?? null,
          websiteUrl: (result.updatedTeam as any).websiteUrl ?? null,
          logoUrl: (result.updatedTeam as any).logoUrl ?? null,

          contactEmail: (result.updatedTeam as any).contactEmail ?? null,
          phone: (result.updatedTeam as any).phone ?? null,
          phoneExt: (result.updatedTeam as any).phoneExt ?? null,
          phonePrivate: typeof (result.updatedTeam as any).phonePrivate === "boolean" ? (result.updatedTeam as any).phonePrivate : true,
          xUrl: (result.updatedTeam as any).xUrl ?? null,
          instagramUrl: (result.updatedTeam as any).instagramUrl ?? null,
        },
      },
    });
  } catch (e: any) {
    return jsonError(e?.message || "Failed to save org profile.", 500);
  }
}
