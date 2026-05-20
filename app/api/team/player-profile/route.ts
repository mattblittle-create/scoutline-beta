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
 * - Video/Social: localVideos only; videoSocial.localVideos only
 * - References: coaches, references, coachesReferences
 *
 * Everything else remains preserved from DB.
 */
function buildAllowedTeamAdminPatch(
  incomingAtomic: any,
  actor?: any,
  team?: any,
  existingAtomic?: any
) {
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
  patch.metrics = protectAndTagMetricsByKey(
    incomingAtomic.metrics,
    existingAtomic?.metrics || {},
    actor,
    team
  );
}

// Stats
if (Array.isArray(incomingAtomic?.statsSeasons)) {
  const safeStatsSeasons = preserveProtectedRemovedItems(
    incomingAtomic.statsSeasons,
    existingAtomic?.statsSeasons || [],
    actor,
    team
  );

  patch.statsSeasons = tagTeamAdminOwnedItems(
    safeStatsSeasons,
    actor,
    team,
    existingAtomic?.statsSeasons || []
  );
}

// Video/Social
// Team Admin may only update uploaded/local videos.
// External videos, social links, and primary selection are preserved from DB.
if (Array.isArray(incomingAtomic?.localVideos)) {
const safeLocalVideos = preserveProtectedRemovedItems(
  incomingAtomic.localVideos,
  existingAtomic?.localVideos || [],
  actor,
  team
);

patch.localVideos = tagTeamAdminOwnedItems(
  safeLocalVideos,
  actor,
  team,
  existingAtomic?.localVideos || []
);
}

if (isObj(incomingAtomic?.videoSocial)) {
  const videoSocialPatch: any = {};

  if (Array.isArray(incomingAtomic.videoSocial.localVideos)) {
const safeVideoSocialLocalVideos = preserveProtectedRemovedItems(
  incomingAtomic.videoSocial.localVideos,
  existingAtomic?.videoSocial?.localVideos || [],
  actor,
  team
);

videoSocialPatch.localVideos = tagTeamAdminOwnedItems(
  safeVideoSocialLocalVideos,
  actor,
  team,
  existingAtomic?.videoSocial?.localVideos || []
);
  }

  if (Object.keys(videoSocialPatch).length > 0) {
    patch.videoSocial = videoSocialPatch;
  }
}

  // References
if (Array.isArray(incomingAtomic?.coaches)) {
const safeCoaches = preserveProtectedRemovedItems(
  incomingAtomic.coaches,
  existingAtomic?.coaches || [],
  actor,
  team
);

patch.coaches = tagTeamAdminOwnedReferences(
  safeCoaches,
  actor,
  team,
  existingAtomic?.coaches || []
);
}

if (Array.isArray(incomingAtomic?.references)) {
const safeReferences = preserveProtectedRemovedItems(
  incomingAtomic.references,
  existingAtomic?.references || [],
  actor,
  team
);

patch.references = tagTeamAdminOwnedReferences(
  safeReferences,
  actor,
  team,
  existingAtomic?.references || []
);
}

if (Array.isArray(incomingAtomic?.coachesReferences)) {
const safeCoachesReferences = preserveProtectedRemovedItems(
  incomingAtomic.coachesReferences,
  existingAtomic?.coachesReferences || [],
  actor,
  team
);

patch.coachesReferences = tagTeamAdminOwnedReferences(
  safeCoachesReferences,
  actor,
  team,
  existingAtomic?.coachesReferences || []
);
}

  // If editor stores normalized data, apply the same whitelist inside normalized.
  if (isObj(incomingAtomic?.normalized)) {
const normalizedPatch = buildAllowedTeamAdminPatch(
  incomingAtomic.normalized,
  actor,
  team,
  existingAtomic?.normalized || {}
);

    if (Object.keys(normalizedPatch).length > 0) {
      patch.normalized = normalizedPatch;
    }
  }

  return patch;
}

function tagTeamAdminOwnedItems(
  items: any[],
  actor: any,
  team: any,
  existingItems?: any[]
) {
  const now = new Date().toISOString();
  const existingById = new Map<string, any>();

  for (const item of Array.isArray(existingItems) ? existingItems : []) {
    if (!isObj(item)) continue;
    const id = normText(item.id);
    if (id) existingById.set(id, item);
  }

  return items.map((item) => {
    if (!isObj(item)) return item;

    const id = normText(item.id);
    const previous = id ? existingById.get(id) : null;

    const originalCreatedByRole =
      previous?.createdByRole || item.createdByRole || "TEAM_ADMIN";

    const originalCreatedByUserId =
      previous?.createdByUserId || item.createdByUserId || actor?.id || null;

    const originalCreatedByTeamId =
      previous?.createdByTeamId || item.createdByTeamId || team?.id || null;

    const originalCreatedAt =
      previous?.createdAt || item.createdAt || now;

    return {
      ...item,
      createdByRole: originalCreatedByRole,
      createdByUserId: originalCreatedByUserId,
      createdByTeamId: originalCreatedByTeamId,
      createdAt: originalCreatedAt,
      updatedByRole: "TEAM_ADMIN",
      updatedByUserId: actor?.id || null,
      updatedAt: now,
    };
  });
}

function isTeamAdminOwnedByActor(item: any, actor: any, team: any) {
  if (!isObj(item)) return false;

  const createdByRole = normText(item.createdByRole).toUpperCase();
  const sourceRole = normText(item.sourceRole).toUpperCase();

  const roleLooksTeamAdmin =
    createdByRole === "TEAM_ADMIN" || sourceRole === "TEAM_ADMIN";

  const userMatches =
    !item.createdByUserId || !actor?.id || item.createdByUserId === actor.id;

  const teamMatches =
    !item.createdByTeamId || !team?.id || item.createdByTeamId === team.id;

  return roleLooksTeamAdmin && userMatches && teamMatches;
}

function preserveProtectedRemovedItems(
  incomingItems: any[],
  existingItems: any[],
  actor: any,
  team: any
) {
  const incoming = Array.isArray(incomingItems) ? incomingItems : [];
  const existing = Array.isArray(existingItems) ? existingItems : [];

  const incomingIds = new Set(
    incoming
      .map((item) => (isObj(item) ? normText(item.id) : ""))
      .filter(Boolean)
  );

  const protectedRemoved = existing.filter((item) => {
    if (!isObj(item)) return false;

    const id = normText(item.id);
    if (!id) return false;

    const wasRemoved = !incomingIds.has(id);
    if (!wasRemoved) return false;

    return !isTeamAdminOwnedByActor(item, actor, team);
  });

  return [...incoming, ...protectedRemoved];
}

function protectAndTagMetricsByKey(
  incomingMetrics: any,
  existingMetrics: any,
  actor: any,
  team: any
) {
  const incoming = isObj(incomingMetrics) ? incomingMetrics : {};
  const existing = isObj(existingMetrics) ? existingMetrics : {};

  const metricKeys = new Set<string>([
    ...Object.keys(existing),
    ...Object.keys(incoming),
  ]);

  const next: any = {};

  for (const key of metricKeys) {
    const incomingItems = Array.isArray(incoming[key]) ? incoming[key] : [];
    const existingItems = Array.isArray(existing[key]) ? existing[key] : [];

    const safeItems = preserveProtectedRemovedItems(
      incomingItems,
      existingItems,
      actor,
      team
    );

    next[key] = tagTeamAdminOwnedItems(
      safeItems,
      actor,
      team,
      existingItems
    );
  }

  return next;
}

function tagTeamAdminOwnedReferences(
  items: any[],
  actor: any,
  team: any,
  existingItems?: any[]
) {
  return tagTeamAdminOwnedItems(items, actor, team, existingItems).map((item) => {
    if (!isObj(item)) return item;

    return {
      ...item,
      sourceRole: item.sourceRole || item.createdByRole || "TEAM_ADMIN",
      sourceUserId: item.sourceUserId || item.createdByUserId || actor?.id || null,
      sourceTeamId: item.sourceTeamId || item.createdByTeamId || team?.id || null,
    };
  });
}

function pickAuditValues(source: any, patch: any) {
  const out: any = {};

  for (const key of Object.keys(patch || {})) {
    if (key === "normalized" && isObj(patch.normalized)) {
      out.normalized = pickAuditValues(source?.normalized || {}, patch.normalized);
    } else {
      out[key] = source?.[key] ?? null;
    }
  }

  return out;
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
const patch = buildAllowedTeamAdminPatch(
  incomingAtomic,
  access.user,
  access.team,
  existing
);
    const merged = deepMergeAllowed(existing, patch);

const beforeAllowed = pickAuditValues(existing, patch);
const afterAllowed = pickAuditValues(merged, patch);  
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
  values: beforeAllowed,
} as any,
afterJson: {
  teamId: access.team?.id || null,
  teamName: access.team?.name || null,
  values: afterAllowed,
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