// app/api/team/join-link/route.ts

import { NextResponse } from "next/server";
import crypto from "crypto";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

function jsonError(message: string, status = 400) {
  return NextResponse.json(
    { ok: false, error: message },
    { status }
  );
}

function buildJoinUrl(code: string) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://www.myscoutline.com";

  return `${base}/team/invite/accept?code=${encodeURIComponent(code)}`;
}

async function getAdminTeam() {
  const currentUser = await getCurrentUser().catch(() => null);

  if (!currentUser?.id) {
    return null;
  }

  const membership = await prisma.teamMembership.findFirst({
    where: {
      userId: currentUser.id,
      role: "TEAM_ADMIN" as any,
      isActive: true,
    },
    include: {
      team: true,
    },
  });

  if (!membership?.team) {
    return null;
  }

  return membership.team;
}

export async function GET() {
  try {
    const team = await getAdminTeam();

    if (!team) {
      return jsonError(
        "No active Team Admin membership found.",
        403
      );
    }

    let joinLink = await prisma.teamJoinLink.findFirst({
      where: {
        teamId: team.id,
        isActive: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!joinLink) {
      joinLink = await prisma.teamJoinLink.create({
        data: {
          teamId: team.id,
          code: crypto.randomBytes(24).toString("hex"),
          isActive: true,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      data: {
        id: joinLink.id,
        code: joinLink.code,
        joinUrl: buildJoinUrl(joinLink.code),
        team: {
          id: team.id,
          name: team.name,
          slug: team.slug,
        },
      },
    });
  } catch (err: any) {
    console.error("[team join-link] GET error", err);

    return jsonError(
      err?.message || "Failed to load join link.",
      500
    );
  }
}

export async function POST() {
  try {
    const team = await getAdminTeam();

    if (!team) {
      return jsonError(
        "No active Team Admin membership found.",
        403
      );
    }

    await prisma.teamJoinLink.updateMany({
      where: {
        teamId: team.id,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    const joinLink = await prisma.teamJoinLink.create({
      data: {
        teamId: team.id,
        code: crypto.randomBytes(24).toString("hex"),
        isActive: true,
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        id: joinLink.id,
        code: joinLink.code,
        joinUrl: buildJoinUrl(joinLink.code),
      },
    });
  } catch (err: any) {
    console.error("[team join-link] POST error", err);

    return jsonError(
      err?.message || "Failed to regenerate join link.",
      500
    );
  }
}