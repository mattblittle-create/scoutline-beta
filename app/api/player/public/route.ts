// app/api/player/public/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type PublicPayload = {
  planTier: "Redshirt" | "Walk-On" | "All-American" | "Teams";
  visibility: {
    profilePublic?: boolean;
    metricsPublic?: boolean;
    statsPublic?: boolean;
    videosPublic?: boolean;
    academicsPublic?: boolean;
    coachesPublic?: boolean;
    [k: string]: boolean | undefined;
  };
  demoMode?: "global" | "allowlist" | "query" | null;

  // Example fields — extend to your schema:
  name?: string;
  classYear?: number | null;
  committed?: boolean;
  committedCollege?: string | null;
  photoUrl?: string | null;

  metrics?: Record<string, string | number | null>;
  stats?: Array<{ team: string; seasonYear: number | null; hitting?: any; pitching?: any; fielding?: any; catching?: any }>;
  videos?: Array<{ title?: string; url: string }>;
  academics?: { gpa?: string | number | null; sat?: number | null; act?: number | null };
  coaches?: Array<{ firstName?: string; lastName?: string; team?: string; email?: string; phone?: string; focus?: string }>;
};

const DEMO_EMAILS = (process.env.SC_DEMO_EMAILS ?? "")
  .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
const DEMO_SLUGS  = (process.env.SC_DEMO_SLUGS ?? "")
  .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);

const FORCE_FULL  = process.env.SC_FORCE_PUBLIC_FULL === "1";
const IS_PROD     = process.env.NODE_ENV === "production";
// Safety valve: only allow FORCE in prod if explicitly permitted
const FORCE_FULL_ALLOWED = FORCE_FULL && (!IS_PROD || process.env.SC_FORCE_PUBLIC_FULL_PROD_OK === "1");

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url  = new URL(req.url);
  const slug = url.searchParams.get("slug")?.trim().toLowerCase();
  const qpDemo = url.searchParams.get("demo") === "1";

  if (!slug) {
    return NextResponse.json({ ok: false, error: "Missing slug" }, { status: 400 });
  }

// ✅ Slug is stored on User.slug (not Player.publicSlug).
// Pull user by slug, then load the related player.
const user = await prisma.user.findFirst({
  where: { slug },
  select: {
    email: true,
    firstName: true,
    lastName: true,
    player: {
      select: {
        publicEnabled: true,
        planTier: true,
        profilePublic: true,
        metricsPublic: true,
        statsPublic: true,
        videosPublic: true,
        academicsPublic: true,
        coachesPublic: true,
        committed: true,
        committedCollege: true,
        classYear: true,
        photoUrl: true,
        metrics: true,
        stats: true,
        videos: true,
        academics: true,
        coaches: true,
      },
    },
  },
});

const player = user?.player
  ? { ...user.player, user: { email: user.email, firstName: user.firstName, lastName: user.lastName } }
  : null;

  if (!player) {
    return NextResponse.json({ ok: false, error: "Player not found" }, { status: 404 });
  }

  // ✅ Step 1: enforce publicEnabled gate (return 404 to avoid confirming existence)
  if (!player.publicEnabled) {
    return NextResponse.json({ ok: false, error: "Player not found" }, { status: 404 });
  }

  // Map DB -> public payload
  const payload = buildPublicPayloadFromDB(player);

  // Determine override (Priority: Global > Allowlist > Query)
  let demoMode: PublicPayload["demoMode"] = null;
  if (FORCE_FULL_ALLOWED) {
    demoMode = "global";
  } else if (
    DEMO_SLUGS.includes(slug) ||
    (player.user?.email && DEMO_EMAILS.includes(player.user.email.toLowerCase()))
  ) {
    demoMode = "allowlist";
  } else if (qpDemo) {
    demoMode = "query";
  }

  if (demoMode) {
    payload.planTier = "Teams";
    payload.visibility = Object.fromEntries(
      Object.keys(payload.visibility || {}).map(k => [k, true])
    ) as PublicPayload["visibility"];
    payload.demoMode = demoMode;
  }

  const res = NextResponse.json({ ok: true, player: payload });
  if (demoMode) {
    res.headers.set("Cache-Control", "private, no-store, no-cache, must-revalidate");
  }
  return res;
}

// ---- Replace this with your real mapper when ready
function buildPublicPayloadFromDB(p: any): PublicPayload {
  const name = [p?.user?.firstName, p?.user?.lastName].filter(Boolean).join(" ").trim();
  return {
    planTier: p?.planTier ?? "Teams",
    visibility: {
      profilePublic: !!p?.profilePublic,
      metricsPublic: !!p?.metricsPublic,
      statsPublic: !!p?.statsPublic,
      videosPublic: !!p?.videosPublic,
      academicsPublic: !!p?.academicsPublic,
      coachesPublic: !!p?.coachesPublic,
    },
    name: name || undefined,
    classYear: p?.classYear ?? null,
    committed: !!p?.committed,
    committedCollege: p?.committedCollege ?? null,
    photoUrl: p?.photoUrl ?? null,

    // stubbed sections — wire to your real tables:
    metrics: p?.metrics ?? {},
    stats: p?.stats ?? [],
    videos: p?.videos ?? [],
    academics: p?.academics ?? null,
    coaches: p?.coaches ?? [],
    demoMode: null,
  };
}
