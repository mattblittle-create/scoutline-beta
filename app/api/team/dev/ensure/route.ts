// app/api/team/dev/ensure/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function normalizeEmail(v: any) {
  return String(v || "").trim().toLowerCase();
}

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function slugify(input: string) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

async function uniqueTeamSlug(base: string) {
  const root = slugify(base) || "team";
  let candidate = root;
  let i = 1;

  // avoid collisions
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const exists = await prisma.team.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!exists) return candidate;
    i += 1;
    candidate = `${root}-${i}`;
  }
}

export async function POST(req: Request) {
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const email = normalizeEmail(body?.email);
  if (!email) return jsonError("Missing email.", 400);
  if (!isEmail(email)) return jsonError("Invalid email.", 400);

  try {
    // 1) Ensure User
    const user =
      (await prisma.user.findUnique({ where: { email } })) ??
      (await prisma.user.create({
        data: {
          email,
          name: email.split("@")[0],
          role: "TEAM_ADMIN", // optional convenience; real auth is via TeamMembership.role
        },
      }));

    // 2) Find an existing TEAM_ADMIN membership (active) and reuse its team if possible
    const existing = await prisma.teamMembership.findFirst({
      where: {
        userId: user.id,
        role: "TEAM_ADMIN",
        isActive: true,
      },
      include: { team: true },
    });

    if (existing?.team) {
      return NextResponse.json({
        ok: true,
        teamId: existing.team.id,
        teamSlug: existing.team.slug,
        userId: user.id,
        reused: true,
      });
    }

    // 3) Otherwise create a new Team + membership
    const baseName = `${email.split("@")[0]} Team`;
    const slug = await uniqueTeamSlug(baseName);

    const team = await prisma.team.create({
      data: {
        name: baseName,
        slug,
        teamType: "TRAVEL",
        // billing defaults for dev
        planTier: "TEAM",
        billingCadence: "monthly",
        billingStatus: "Active",
        billingMode: "NORMAL",
      },
      select: { id: true, slug: true },
    });

    await prisma.teamMembership.create({
      data: {
        teamId: team.id,
        userId: user.id,
        role: "TEAM_ADMIN",
        isActive: true,
      },
    });

    return NextResponse.json({
      ok: true,
      teamId: team.id,
      teamSlug: team.slug,
      userId: user.id,
      reused: false,
    });
  } catch (e: any) {
    return jsonError(e?.message || "Failed to ensure dev team.", 500);
  }
}
