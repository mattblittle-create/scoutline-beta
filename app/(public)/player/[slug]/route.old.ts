// app/(public)/player/[slug]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: {
    slug: string;
  };
};

type ErrorResponse = {
  ok: false;
  error: string;
};

type OkResponse = {
  ok: true;
  data: any;
};

export async function GET(
  req: NextRequest,
  ctx: RouteContext
): Promise<NextResponse<OkResponse | ErrorResponse>> {
  const { slug } = ctx.params;

  if (!slug) {
    return NextResponse.json(
      { ok: false, error: "Missing slug" },
      { status: 400 }
    );
  }

  // OPTIONAL: If you actually are using PublicProfileCache in prod,
  // we can keep this fast path; otherwise it will just be a no-op.
  const cached = await prisma.publicProfileCache.findUnique({
    where: { slug },
  });

  if (cached) {
    return NextResponse.json({
      ok: true,
      data: cached.data,
    });
  }

  // ------------------------------------------------------------
  // Email is the anchor.
  //
  // We try to find PlayerProfile rows where email matches this slug
  // in a forgiving way:
  //   - dash vs dot (braden-little vs braden.little)
  //   - numeric suffixes (braden.little2)
  //   - general "contains" match as a fallback
  // Then we pick the most recently updated profile.
  // ------------------------------------------------------------

  const dashed = slug.toLowerCase();             // "braden-little"
  const dotted = dashed.replace(/-/g, ".");      // "braden.little"

  const profiles = await prisma.playerProfile.findMany({
    where: {
      OR: [
        // Exact-ish patterns
        {
          email: {
            startsWith: `${dashed}@`,
            mode: "insensitive",
          },
        },
        {
          email: {
            startsWith: `${dotted}@`,
            mode: "insensitive",
          },
        },
        // More forgiving: email contains the dotted or dashed form
        {
          email: {
            contains: dotted,
            mode: "insensitive",
          },
        },
        {
          email: {
            contains: dashed,
            mode: "insensitive",
          },
        },
      ],
    },
    include: {
      user: {
        include: {
          Player: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: 1,
  });

  const profile = profiles[0];

  if (!profile) {
    return NextResponse.json(
      { ok: false, error: "Player not found" },
      { status: 404 }
    );
  }

  const profileData = (profile.data ?? {}) as any;
  const user = profile.user;
  const player = user?.Player ?? null;

  const userEmail = user?.email ?? profile.email ?? null;
  const userName =
    user?.name ??
    (userEmail ? userEmail.split("@")[0] : null) ??
    "Player";

  const isCommitted =
    player?.isCommitted ??
    (typeof profileData.isCommitted === "boolean"
      ? profileData.isCommitted
      : false);

  const committedProgram =
    player?.committedProgram ?? profileData.committedProgram ?? null;

  const payload = {
    // routing identity
    slug,
    email: userEmail,
    name: userName,

    // Core card fields – from Player first, then profileData fallback
    gradYear: player?.gradYear ?? profileData.gradYear ?? null,
    primaryPos:
      player?.primaryPos ?? profileData.primaryPos ?? null,
    secondaryPos:
      player?.secondaryPos ?? profileData.secondaryPos ?? null,
    bats: player?.bats ?? profileData.bats ?? null,
    throws: player?.throws ?? profileData.throws ?? null,
    hsName: player?.hsName ?? profileData.hsName ?? null,
    travelTeam: player?.travelTeam ?? profileData.travelTeam ?? null,
    hometown: player?.hometown ?? profileData.hometown ?? null,
    state: player?.state ?? profileData.state ?? null,

    isCommitted,
    committedProgram,

    // 👇 Keep ALL tab data available for the public profile + player card.
    ...profileData,
  };

  return NextResponse.json({ ok: true, data: payload });
}
