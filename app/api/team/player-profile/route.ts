// app/api/team/player-profile/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getByEmail, getBySlug } from "@/lib/devStore";

/**
 * GET /api/team/player-profile?playerProfileId=...
 * POST /api/team/player-profile?playerProfileId=...
 *
 * GET Returns:
 * {
 *   ok: true,
 *   data: {
 *     playerProfileId,
 *     email,
 *     slug,
 *     photoUrl,
 *     atomic
 *   }
 * }
 *
 * POST Body:
 * { atomic: any }
 *
 * POST Behavior:
 * - Team Admin may ONLY update: metrics, statsSeasons, videoSocial (and legacy externalVideos/localVideos/social),
 *   coaches (and legacy references/coachesReferences if present)
 * - Core/Academics/Athletics (and everything else) are preserved from DB.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const playerProfileId = String(searchParams.get("playerProfileId") || "").trim();

    if (!playerProfileId) {
      return NextResponse.json({ ok: false, error: "Missing playerProfileId" }, { status: 400 });
    }

    // -----------------------------
    // 1) Primary: DB lookup by PlayerProfile.id
    // -----------------------------
    const row = await prisma.playerProfile.findUnique({
      where: { id: playerProfileId },
      select: { id: true, email: true, userId: true, data: true },
    });

    if (row) {
      const email = row.email ? String(row.email).trim().toLowerCase() : null;

      // Prefer resolving public slug/photo via userId (most reliable)
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
        },
        source: "db",
      });
    }

    // -----------------------------
    // 2) Dev fallbacks
    // -----------------------------

    // If caller passes an email as the "playerProfileId", allow it in dev mode
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

// demo_pp_* mapping (temporary but super useful)
if (/^demo_pp_/i.test(playerProfileId)) {
  const demoMap: Record<string, string> = {
    demo_pp_1: "braden-little",
    demo_pp_2: "jaxson-little",
  };

  const mappedSlug = demoMap[playerProfileId.toLowerCase()];

  if (mappedSlug) {
    // 1) Resolve user by slug
    const u = await prisma.user.findFirst({
      where: { slug: mappedSlug },
      select: { id: true, email: true, slug: true, photoUrl: true },
    });

    if (u) {
      // 2) Resolve player profile by userId (preferred)
      const pp =
        (await prisma.playerProfile.findFirst({
          where: { userId: u.id },
          select: { id: true, email: true, data: true },
        })) ||
        // fallback by email
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
            playerProfileId: pp.id, // ✅ real DB id
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

  // If we can’t resolve demo id to a real DB player, give a clearer error:
  return NextResponse.json(
    {
      ok: false,
      error:
        "Demo playerProfileId does not exist in DB. Either load roster from /api/team/roster (real IDs) or create a user+player profile for this demo slug.",
    },
    { status: 404 }
  );
}

    return NextResponse.json({ ok: false, error: "Player profile not found" }, { status: 404 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

function isObj(v: any) {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

/**
 * Only allow Team Admin to modify these namespaces.
 * Everything else must remain as-is from DB.
 */
function buildAllowedTeamAdminPatch(incomingAtomic: any) {
  const patch: any = {};

  // Metrics
  if (isObj(incomingAtomic?.metrics)) patch.metrics = incomingAtomic.metrics;

  // Stats seasons
  if (Array.isArray(incomingAtomic?.statsSeasons)) patch.statsSeasons = incomingAtomic.statsSeasons;

  // Video/Social (preferred namespace)
  if (isObj(incomingAtomic?.videoSocial)) patch.videoSocial = incomingAtomic.videoSocial;

  // Legacy video shapes that you may still store at top-level in dev
  if (Array.isArray(incomingAtomic?.externalVideos)) patch.externalVideos = incomingAtomic.externalVideos;
  if (Array.isArray(incomingAtomic?.localVideos)) patch.localVideos = incomingAtomic.localVideos;
  if (isObj(incomingAtomic?.social)) patch.social = incomingAtomic.social;

  // Coaches / References (preferred key in this page is "coaches")
  if (Array.isArray(incomingAtomic?.coaches)) patch.coaches = incomingAtomic.coaches;

  // Also allow these legacy keys if they exist in your system
  if (Array.isArray(incomingAtomic?.references)) patch.references = incomingAtomic.references;
  if (Array.isArray(incomingAtomic?.coachesReferences)) patch.coachesReferences = incomingAtomic.coachesReferences;

  return patch;
}

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const playerProfileId = String(searchParams.get("playerProfileId") || "").trim();

    if (!playerProfileId) {
      return NextResponse.json({ ok: false, error: "Missing playerProfileId" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const incomingAtomic = body?.atomic;

    if (!incomingAtomic || (typeof incomingAtomic !== "object" && typeof incomingAtomic !== "function")) {
      return NextResponse.json({ ok: false, error: "Missing atomic payload" }, { status: 400 });
    }

    // Must be a real DB profile to persist (devStore can remain read-only for now)
    const row = await prisma.playerProfile.findUnique({
      where: { id: playerProfileId },
      select: { id: true, data: true, email: true, userId: true },
    });

    if (!row) {
      return NextResponse.json(
        { ok: false, error: "Player profile not found (cannot save in devStore mode)." },
        { status: 404 }
      );
    }

    const existing = (row.data as any) ?? {};
    const patch = buildAllowedTeamAdminPatch(incomingAtomic);

    // Preserve everything else; only overwrite allowed keys
    const merged = {
      ...existing,
      ...patch,
    };

    const updated = await prisma.playerProfile.update({
      where: { id: playerProfileId },
      data: { data: merged as any },
      select: { id: true, data: true },
    });

    return NextResponse.json({
      ok: true,
      data: {
        playerProfileId: updated.id,
        atomic: (updated.data as any) ?? {},
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
