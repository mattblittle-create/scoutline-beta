// app/api/team/invites/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function normalizeEmail(v: any): string {
  return String(v || "").trim().toLowerCase();
}

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/**
 * ✅ Dev supports:
 *  - ?email=... or ?username=...
 *
 * ✅ Session-path placeholder:
 *  - header: x-user-email
 *    (You can set this via middleware, or swap this function to your real session getter.)
 */
function pickEmailFromRequest(req: Request): string {
  const url = new URL(req.url);
  const qEmail = normalizeEmail(url.searchParams.get("email") || url.searchParams.get("username"));
  if (qEmail) return qEmail;

  const hdrEmail = normalizeEmail(req.headers.get("x-user-email"));
  if (hdrEmail) return hdrEmail;

  return "";
}

async function getAdminTeamByEmail(adminEmail: string) {
  const user = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true, email: true },
  });
  if (!user) return null;

  const adminMembership = await prisma.teamMembership.findFirst({
    where: { userId: user.id, role: "TEAM_ADMIN" },
    include: { team: true },
  });

  if (!adminMembership?.team) return null;
  return { user, membership: adminMembership, team: adminMembership.team };
}

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

type CreateInvitePayload = {
  invitedEmail: string;
  parentEmail?: string | null;
  expiresInDays?: number;
};

type UpdateInvitePayload = {
  id: string;
  action: "CANCEL";
};

export async function GET(req: Request) {
  const email = pickEmailFromRequest(req);

  if (!email) return jsonError("Unauthorized: missing email (dev) and no session email found.", 401);
  if (!isEmail(email)) return jsonError("Invalid email.", 400);

  try {
    const found = await getAdminTeamByEmail(email);
    if (!found) return jsonError("No TEAM_ADMIN membership found for this user.", 403);

    const invites = await prisma.teamInvite.findMany({
      where: { teamId: found.team.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        invitedEmail: true,
        parentEmail: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        acceptedAt: true,
        expiresAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        teamId: found.team.id,
        invites,
      },
    });
  } catch (e: any) {
    return jsonError(e?.message || "Failed to load invites.", 500);
  }
}

export async function POST(req: Request) {
  const email = pickEmailFromRequest(req);

  if (!email) return jsonError("Unauthorized: missing email (dev) and no session email found.", 401);
  if (!isEmail(email)) return jsonError("Invalid email.", 400);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  try {
    const found = await getAdminTeamByEmail(email);
    if (!found) return jsonError("No TEAM_ADMIN membership found for this user.", 403);

    // --- UPDATE (cancel) ---
    if (body?.action) {
      const payload = body as UpdateInvitePayload;

      if (!payload?.id) return jsonError("Missing invite id.", 400);
      if (payload.action !== "CANCEL") return jsonError("Unsupported action.", 400);

      // ✅ verify belongs BEFORE update
      const belongs = await prisma.teamInvite.findFirst({
        where: { id: payload.id, teamId: found.team.id },
        select: { id: true },
      });
      if (!belongs) return jsonError("Invite not found for this team.", 404);

      const updated = await prisma.teamInvite.update({
        where: { id: payload.id },
        data: { status: "CANCELLED" },
        select: {
          id: true,
          invitedEmail: true,
          parentEmail: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          acceptedAt: true,
          expiresAt: true,
        },
      });

      return NextResponse.json({ ok: true, data: { invite: updated } });
    }

    // --- CREATE ---
    const payload = body as CreateInvitePayload;

    const invitedEmail = normalizeEmail(payload.invitedEmail);
    if (!invitedEmail) return jsonError("Invited email is required.", 400);
    if (!isEmail(invitedEmail)) return jsonError("Invited email looks invalid.", 400);

    const parentEmail = payload.parentEmail ? normalizeEmail(payload.parentEmail) : null;
    if (parentEmail && !isEmail(parentEmail)) return jsonError("Parent email looks invalid.", 400);

    const expiresInDays = Number(payload.expiresInDays ?? 14);
    const expiresAt =
      Number.isFinite(expiresInDays) && expiresInDays > 0
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
        : null;

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = sha256Hex(rawToken);

    const existingPending = await prisma.teamInvite.findFirst({
      where: { teamId: found.team.id, invitedEmail, status: "PENDING" },
      select: { id: true },
    });
    if (existingPending) {
      return jsonError("A pending invite already exists for this email.", 409);
    }

    const created = await prisma.teamInvite.create({
      data: {
        teamId: found.team.id,
        invitedEmail,
        parentEmail,
        tokenHash,
        status: "PENDING",
        createdByUserId: found.user.id,
        expiresAt,
      },
      select: {
        id: true,
        invitedEmail: true,
        parentEmail: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        acceptedAt: true,
        expiresAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      data: { invite: created, rawToken },
    });
  } catch (e: any) {
    return jsonError(e?.message || "Failed to save invite.", 500);
  }
}
