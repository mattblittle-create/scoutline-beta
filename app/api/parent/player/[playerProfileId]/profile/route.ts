// app/api/parent/player/[playerProfileId]/profile/route.ts
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { prisma } from "@/lib/prisma";
import { getLinkedParentPlayer } from "@/lib/parent/getLinkedParentPlayer";

type RouteCtx = {
  params: {
    playerProfileId: string;
  };
};

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function normalizeString(v: unknown) {
  return String(v ?? "").trim();
}

function normalizeNullableString(v: unknown) {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

function normalizeEmail(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

function normalizeNumberString(v: unknown) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? String(n) : s;
}

export async function GET(_req: Request, ctx: RouteCtx) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const playerProfileId = String(ctx?.params?.playerProfileId || "").trim();
    if (!playerProfileId) {
      return NextResponse.json(
        { ok: false, error: "Missing player profile id." },
        { status: 400 }
      );
    }

    const linked = await getLinkedParentPlayer({
      userId: user.id,
      playerProfileId,
    });

    if (!linked?.playerProfile) {
      return NextResponse.json(
        { ok: false, error: "Parent access not allowed for this player." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      ok: true,
      data: {
        playerProfile: linked.playerProfile,
        relationship: linked.relationship || "Parent",
        isPrimary: Boolean(linked.isPrimary),
      },
    });
  } catch (err: any) {
    console.error("[parent profile GET] error", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to load profile." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, ctx: RouteCtx) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const playerProfileId = String(ctx?.params?.playerProfileId || "").trim();
    if (!playerProfileId) {
      return NextResponse.json(
        { ok: false, error: "Missing player profile id." },
        { status: 400 }
      );
    }

    const linked = await getLinkedParentPlayer({
      userId: user.id,
      playerProfileId,
    });

    if (!linked?.playerProfile) {
      return NextResponse.json(
        { ok: false, error: "Parent access not allowed for this player." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const existing = asRecord(linked.playerProfile.data);

    const nextData = {
      ...existing,

      firstName: normalizeString(body?.firstName),
      lastName: normalizeString(body?.lastName),
      gradYear: normalizeNullableString(body?.gradYear),
      school: normalizeNullableString(body?.school),
      travelTeam: normalizeNullableString(body?.travelTeam),
      hometown: normalizeNullableString(body?.hometown),
      state: normalizeNullableString(body?.state),
      gpa: normalizeNullableString(body?.gpa),

      primaryPosition: normalizeNullableString(body?.primaryPosition),
      secondaryPosition: normalizeNullableString(body?.secondaryPosition),
      bats: normalizeNullableString(body?.bats),
      throws: normalizeNullableString(body?.throws),
      height: normalizeNullableString(body?.height),
      weight: normalizeNullableString(body?.weight),

      bio: normalizeNullableString(body?.bio),

      instagramUrl: normalizeNullableString(body?.instagramUrl),
      xUrl: normalizeNullableString(body?.xUrl),
      youtubeUrl: normalizeNullableString(body?.youtubeUrl),
      tiktokUrl: normalizeNullableString(body?.tiktokUrl),
      highlightVideoUrl: normalizeNullableString(body?.highlightVideoUrl),

      parentEmail: user.email ? normalizeEmail(user.email) : existing.parentEmail ?? null,
    };

    const updated = await prisma.playerProfile.update({
      where: { id: playerProfileId },
      data: {
        data: nextData,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        updatedAt: true,
        data: true,
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        playerProfile: updated,
      },
    });
  } catch (err: any) {
    console.error("[parent profile PATCH] error", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to save profile." },
      { status: 500 }
    );
  }
}