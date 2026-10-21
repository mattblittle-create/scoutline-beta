// app/api/public/player/view-event/route.ts

import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { prisma } from "@/lib/prisma";

function cleanString(value: unknown) {
  return String(value ?? "").trim();
}

function hashValue(value: string) {
  if (!value) return null;
  return crypto.createHash("sha256").update(value).digest("hex");
}

function getIp(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    ""
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    const playerProfileId = cleanString(body?.playerProfileId);
    const slug = cleanString(body?.slug);
    const sourceRaw = cleanString(body?.source) || "PUBLIC_PROFILE";

    if (!playerProfileId && !slug) {
      return NextResponse.json(
        { ok: false, error: "Missing player profile id or slug." },
        { status: 400 }
      );
    }

    let playerProfile:
      | {
          id: string;
          userId: string | null;
          email: string;
        }
      | null = null;

    const profileSelect = {
      id: true,
      userId: true,
      email: true,
    } as const;

    if (playerProfileId) {
      playerProfile = await prisma.playerProfile.findUnique({
        where: { id: playerProfileId },
        select: profileSelect,
      });
    }

    if (!playerProfile && slug) {
      playerProfile = await prisma.playerProfile.findFirst({
        where: {
          data: {
            path: ["profile", "slug"],
            equals: slug,
          },
        },
        select: profileSelect,
      });
    }

    if (!playerProfile && slug) {
      playerProfile = await prisma.playerProfile.findFirst({
        where: {
          data: {
            path: ["slug"],
            equals: slug,
          },
        },
        select: profileSelect,
      });
    }

    if (!playerProfile && slug) {
      playerProfile = await prisma.playerProfile.findFirst({
        where: {
          data: {
            path: ["normalized", "slug"],
            equals: slug,
          },
        },
        select: profileSelect,
      });
    }

    if (!playerProfile && slug) {
  const cached = await prisma.publicProfileCache.findUnique({
    where: { slug },
    select: {
      userId: true,
    },
  });

  if (cached?.userId) {
    playerProfile = await prisma.playerProfile.findFirst({
      where: { userId: cached.userId },
      select: profileSelect,
    });
  }
}

    if (!playerProfile) {
      return NextResponse.json(
        { ok: false, error: "Player profile not found." },
        { status: 404 }
      );
    }

    let playerUserId = playerProfile.userId;

    if (!playerUserId && playerProfile.email) {
      const playerUser = await prisma.user.findUnique({
        where: { email: playerProfile.email },
        select: { id: true },
      });

      playerUserId = playerUser?.id || null;
    }

const currentUser = await getCurrentUser();

const viewerUser = currentUser?.id
  ? await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: {
            id: true,
            role: true,
            program: true,
            collegeId: true,
            college: {
              select: {
                id: true,
                name: true,
                division: true,
              },
            },
            teamMemberships: {
              where: { isActive: true },
              select: {
                teamId: true,
                role: true,
              },
              take: 1,
            },
          },
        })
      : null;

    let viewerType:
      | "ANONYMOUS"
      | "PLAYER_SELF"
      | "PARENT"
      | "TEAM_COACH"
      | "TEAM_ADMIN"
      | "COLLEGE_COACH"
      | "SCOUTLINE_ADMIN" = "ANONYMOUS";

    let collegeId: string | null = null;
    let teamId: string | null = null;

    const role = String(viewerUser?.role || "").toUpperCase();

    if (viewerUser?.id && viewerUser.id === playerUserId) {
      viewerType = "PLAYER_SELF";
    } else if (
      role.includes("COLLEGE") ||
      role === "COACH" ||
      role.includes("COACH") ||
      viewerUser?.collegeId ||
      viewerUser?.program
    ) {
      viewerType = "COLLEGE_COACH";
      collegeId = viewerUser?.collegeId || null;
    } else if (role.includes("PARENT")) {
      viewerType = "PARENT";
    } else if (role.includes("TEAM_ADMIN")) {
      viewerType = "TEAM_ADMIN";
      teamId = viewerUser?.teamMemberships?.[0]?.teamId || null;
    } else if (role.includes("TEAM")) {
      viewerType = "TEAM_COACH";
      teamId = viewerUser?.teamMemberships?.[0]?.teamId || null;
    } else if (role.includes("ADMIN")) {
      viewerType = "SCOUTLINE_ADMIN";
    }

    const source =
      sourceRaw === "SHARED_LINK" ? "SHARED_LINK" : "PUBLIC_PROFILE";

    const event = await prisma.profileViewEvent.create({
      data: {
        playerProfileId: playerProfile.id,
        viewerUserId: viewerUser?.id || null,
        viewerType,
        source,
        collegeId,
        teamId,
        ipHash: hashValue(getIp(req)),
        userAgentHash: hashValue(req.headers.get("user-agent") || ""),
      },
      select: {
        id: true,
        viewerType: true,
        collegeId: true,
      },
    });

    if (viewerType === "COLLEGE_COACH" && playerUserId) {
      const collegeName =
        viewerUser?.college?.name ||
        viewerUser?.program ||
        "a college program";

      await prisma.notification.create({
        data: {
          userId: playerUserId,
          type: "PLAYER_PROFILE_VIEWED_BY_COACH",
          message: `A coach from ${collegeName} viewed your profile.`,
          data: {
            profileViewEventId: event.id,
            collegeId: collegeId || null,
            collegeName,
          },
        },
      });

      await prisma.profileViewEvent.update({
        where: { id: event.id },
        data: { notifiedPlayer: true },
      });
    }

    console.log("PROFILE_VIEW_EVENT_DEBUG", {
      viewerType,
      viewerRole: role,
      viewerUserId: viewerUser?.id || null,
      viewerProgram: viewerUser?.program || null,
      collegeId,
      playerProfileId: playerProfile.id,
      playerUserId,
      notified: viewerType === "COLLEGE_COACH" && !!playerUserId,
    });

    return NextResponse.json({
      ok: true,
      event,
    });
  } catch (err: any) {
    console.error("PUBLIC_PLAYER_VIEW_EVENT_ERROR", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Could not track profile view." },
      { status: 500 }
    );
  }
}