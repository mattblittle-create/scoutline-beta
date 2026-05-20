// app/api/team/player-profile/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { getByEmail, getBySlug } from "@/lib/devStore";

function jsonError(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

function isObj(v: any) {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function normText(v: unknown) {
  return String(v ?? "").trim();
}

async function assertTeamAdminCanAccessPlayer(playerProfileId: string) {
  const currentUser = await getCurrentUser().catch(() => null);

  if (!currentUser?.id) {
    return {
      ok: false as const,
      status: 401,
      error: "You must be logged in.",
      playerProfile: null,
      team: null,
    };
  }

  const adminMembership = await prisma.teamMembership.findFirst({
    where: {
      userId: currentUser.id,
      role: "TEAM_ADMIN" as any,
      isActive: true,
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  if (!adminMembership?.teamId) {
    return {
      ok: false as const,
      status: 403,
      error: "No active Team Admin membership found.",
      playerProfile: null,
      team: null,
    };
  }

  const playerMembership = await prisma.teamMembership.findFirst({
    where: {
      teamId: adminMembership.teamId,
      playerProfileId,
      role: "PLAYER" as any,
      isActive: true,
    },
    include: {
      playerProfile: {
        select: {
          id: true,
          email: true,
          userId: true,
          data: true,
        },
      },
    },
  });

  if (!playerMembership?.playerProfile) {
    return {
      ok: false as const,
      status: 404,
      error: "Player is not active on this team roster.",
      playerProfile: null,
      team: adminMembership.team,
    };
  }

return {
  ok: true as const,
  status: 200,
  error: null,
  user: currentUser,
  playerProfile: playerMembership.playerProfile,
  team: adminMembership.team,
};
}

/**
 * Team Admin may update ONLY:
 * - Core: heightFt, heightIn, weightLb
 * - Athletics: primaryPos, secondaryPos, isPitcher, pitcherHand, throws, bats
 * - Metrics: metrics
 * - Stats: statsSeasons
 * - Video/Social: videoSocial, externalVideos, localVideos, social
 * - References: coaches, references, coachesReferences
 *
 * Everything else remains preserved from DB.
 */
function buildAllowedTeamAdminPatch(incomingAtomic: any) {
  const patch: any = {};

  // Core allowed fields only
  for (const key of ["heightFt", "heightIn", "weightLb"]) {
    if (Object.prototype.hasOwnProperty.call(incomingAtomic, key)) {
      patch[key] = incomingAtomic[key];
    }
  }

  // Athletics allowed fields only
  for (const key of [
    "primaryPos",
    "secondaryPos",
    "isPitcher",
    "pitcherHand",
    "throws",
    "bats",
  ]) {
    if (Object.prototype.hasOwnProperty.call(incomingAtomic, key)) {
      patch[key] = incomingAtomic[key];
    }
  }

  // Metrics
  if (isObj(incomingAtomic?.metrics)) {
    patch.metrics = incomingAtomic.metrics;
  }

  // Stats
  if (Array.isArray(incomingAtomic?.statsSeasons)) {
    patch.statsSeasons = incomingAtomic.statsSeasons;
  }

  // Video/Social
  if (isObj(incomingAtomic?.videoSocial)) {
    patch.videoSocial = incomingAtomic.videoSocial;
  }

  if (Array.isArray(incomingAtomic?.externalVideos)) {
    patch.externalVideos = incomingAtomic.externalVideos;
  }

  if (Array.isArray(incomingAtomic?.localVideos)) {
    patch.localVideos = incomingAtomic.localVideos;
  }

  if (isObj(incomingAtomic?.social)) {
    patch.social = incomingAtomic.social;
  }

  // References
  if (Array.isArray(incomingAtomic?.coaches)) {
    patch.coaches = incomingAtomic.coaches;
  }

  if (Array.isArray(incomingAtomic?.references)) {
    patch.references = incomingAtomic.references;
  }

  if (Array.isArray(incomingAtomic?.coachesReferences)) {
    patch.coachesReferences = incomingAtomic.coachesReferences;
  }

  // If editor stores normalized data, apply the same whitelist inside normalized.
  if (isObj(incomingAtomic?.normalized)) {
    const normalizedPatch = buildAllowedTeamAdminPatch(incomingAtomic.normalized);

    if (Object.keys(normalizedPatch).length > 0) {
      patch.normalized = normalizedPatch;
    }
  }

  return patch;
}

function deepMergeAllowed(existing: any, patch: any) {
  const merged = {
    ...(isObj(existing) ? existing : {}),
    ...patch,
  };

  if (isObj(existing?.normalized) || isObj(patch?.normalized)) {
    merged.normalized = {
      ...(isObj(existing?.normalized) ? existing.normalized : {}),
      ...(isObj(patch?.normalized) ? patch.normalized : {}),
    };
  }

  return merged;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const playerProfileId = normText(searchParams.get("playerProfileId"));

    if (!playerProfileId) {
      return jsonError("Missing playerProfileId", 400);
    }

    const access = await assertTeamAdminCanAccessPlayer(playerProfileId);

    if (access.ok && access.playerProfile) {
      const row = access.playerProfile;
      const email = row.email ? String(row.email).trim().toLowerCase() : null;

      let user: { slug: string | null; photoUrl: string | null } | null = null;

      if (row.userId) {
        user = await prisma.user.findUnique({
          where: { id: row.userId },
          select: { slug: true, photoUrl: true },
        });
      } else if (email) {
        user = await prisma.user.findFirst({
          where: { email: { equals: email, mode: "insensitive" } },
          select: { slug: true, photoUrl: true },
        });
      }

      return NextResponse.json({
        ok: true,
        data: {
          playerProfileId: row.id,
          email,
          slug: user?.slug ?? null,
          photoUrl: user?.photoUrl ?? null,
          atomic: (row.data as any) ?? {},
          team: access.team,
        },
        source: "db",
      });
    }

    // Dev fallbacks remain read-only-ish for local convenience.
    const looksLikeEmail = playerProfileId.includes("@");

    if (looksLikeEmail) {
      const email = playerProfileId.trim().toLowerCase();
      const dev = await getByEmail(email);

      if (dev) {
        return NextResponse.json({
          ok: true,
          data: {
            playerProfileId,
            email,
            slug: (dev as any)?.slug ?? null,
            photoUrl: (dev as any)?.photoUrl ?? null,
            atomic: dev,
          },
          source: "devStore",
        });
      }
    }

    if (/^demo_pp_/i.test(playerProfileId)) {
      const demoMap: Record<string, string> = {
        demo_pp_1: "braden-little",
        demo_pp_2: "jaxson-little",
      };

      const mappedSlug = demoMap[playerProfileId.toLowerCase()];

      if (mappedSlug) {
        const u = await prisma.user.findFirst({
          where: { slug: mappedSlug },
          select: { id: true, email: true, slug: true, photoUrl: true },
        });

        if (u) {
          const pp =
            (await prisma.playerProfile.findFirst({
              where: { userId: u.id },
              select: { id: true, email: true, data: true },
            })) ||
            (u.email
              ? await prisma.playerProfile.findFirst({
                  where: { email: { equals: u.email, mode: "insensitive" } },
                  select: { id: true, email: true, data: true },
                })
              : null);

          if (pp) {
            return NextResponse.json({
              ok: true,
              data: {
                playerProfileId: pp.id,
                email: (pp.email || u.email || "").toLowerCase(),
                slug: u.slug ?? mappedSlug,
                photoUrl: u.photoUrl ?? null,
                atomic: (pp.data as any) ?? {},
              },
              source: "demo->slug->db",
            });
          }
        }
      }

      return jsonError(
        "Demo playerProfileId does not exist in DB. Load roster from /api/team/roster using real IDs.",
        404
      );
    }

    return jsonError(access.error || "Player profile not found", access.status || 404);
  } catch (e: any) {
    return jsonError(e?.message || "Server error", 500);
  }
}

async function saveTeamAdminProfile(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const playerProfileId = normText(searchParams.get("playerProfileId"));

    if (!playerProfileId) {
      return jsonError("Missing playerProfileId", 400);
    }

    const access = await assertTeamAdminCanAccessPlayer(playerProfileId);

    if (!access.ok || !access.playerProfile) {
      return jsonError(access.error || "Unauthorized", access.status || 403);
    }

    const body = await req.json().catch(() => ({}));
    const incomingAtomic =
  body?.atomic ||
  body?.data ||
  body?.profile ||
  body;

if (!isObj(incomingAtomic)) {
  return jsonError("Missing profile payload", 400);
}

    const existing = (access.playerProfile.data as any) ?? {};
    const patch = buildAllowedTeamAdminPatch(incomingAtomic);
    const merged = deepMergeAllowed(existing, patch);

const updated = await prisma.playerProfile.update({
  where: { id: access.playerProfile.id },
  data: {
    data: merged as any,
    updatedAt: new Date(),
  },
  select: {
    id: true,
    data: true,
  },
});

const ip =
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  req.headers.get("x-real-ip") ||
  null;

const userAgent = req.headers.get("user-agent") || null;

await prisma.adminAuditLog
  .create({
    data: {
      actingUserId: access.user?.id || null,
      action: "TEAM_ADMIN_PLAYER_PROFILE_UPDATE",
      entityType: "PlayerProfile",
      entityId: access.playerProfile.id,
      ip,
      userAgent,
      beforeJson: {
        teamId: access.team?.id || null,
        teamName: access.team?.name || null,
        previousAllowedKeys: Object.keys(patch),
      } as any,
      afterJson: {
        teamId: access.team?.id || null,
        teamName: access.team?.name || null,
        updatedAllowedKeys: Object.keys(patch),
      } as any,
    },
  })
  .catch(() => null);

    return NextResponse.json({
      ok: true,
      data: {
        playerProfileId: updated.id,
        atomic: (updated.data as any) ?? {},
      },
    });
  } catch (e: any) {
    return jsonError(e?.message || "Server error", 500);
  }
}

export async function PATCH(req: Request) {
  return saveTeamAdminProfile(req);
}

export async function POST(req: Request) {
  return saveTeamAdminProfile(req);
}