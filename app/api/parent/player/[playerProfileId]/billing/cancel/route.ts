// app/api/parent/player/[playerProfileId]/billing/cancel/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

type Ctx = {
  params: {
    playerProfileId: string;
  };
};

function computeEffectiveDate(cadence?: string | null) {
  const now = new Date();
  const result = new Date(now);

  const c = String(cadence || "").trim().toLowerCase();

  if (c === "annual" || c === "yearly") {
    result.setFullYear(result.getFullYear() + 1);
    return result;
  }

  result.setMonth(result.getMonth() + 1);
  return result;
}

export async function POST(_req: Request, ctx: Ctx) {
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

    const parentProfile = await prisma.parentProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!parentProfile?.id) {
      return NextResponse.json(
        { ok: false, error: "Parent profile not found." },
        { status: 403 }
      );
    }

    const link = await prisma.parentPlayerLink.findUnique({
      where: {
        parentProfileId_playerProfileId: {
          parentProfileId: parentProfile.id,
          playerProfileId,
        },
      },
      select: {
        id: true,
        playerProfile: {
          select: {
            id: true,
            playerBillingCadence: true,
            playerCancelRequestedAt: true,
            playerCancelEffectiveAt: true,
          },
        },
      },
    });

    if (!link?.playerProfile?.id) {
      return NextResponse.json(
        { ok: false, error: "Parent access not allowed for this player." },
        { status: 403 }
      );
    }

    if (link.playerProfile.playerCancelRequestedAt) {
      return NextResponse.json({
        ok: true,
        alreadyRequested: true,
        requestedAt: link.playerProfile.playerCancelRequestedAt,
        effectiveAt: link.playerProfile.playerCancelEffectiveAt,
      });
    }

    const requestedAt = new Date();
    const effectiveAt = computeEffectiveDate(
      link.playerProfile.playerBillingCadence
    );

    const updated = await prisma.playerProfile.update({
      where: { id: playerProfileId },
      data: {
        playerCancelRequestedAt: requestedAt,
        playerCancelEffectiveAt: effectiveAt,
      },
      select: {
        id: true,
        playerCancelRequestedAt: true,
        playerCancelEffectiveAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      requestedAt: updated.playerCancelRequestedAt,
      effectiveAt: updated.playerCancelEffectiveAt,
    });
  } catch (err: any) {
    console.error("[parent billing cancel] error", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Failed to request cancellation." },
      { status: 500 }
    );
  }
}