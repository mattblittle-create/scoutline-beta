// app/api/admin/billing/restore-player/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createBillingAuditLog } from "@/lib/billing/billingAudit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const playerProfileId = String(body?.playerProfileId || "").trim();

    if (!playerProfileId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing playerProfileId.",
        },
        { status: 400 }
      );
    }

    const profile = await prisma.playerProfile.findUnique({
      where: {
        id: playerProfileId,
      },
    });

    if (!profile) {
      return NextResponse.json(
        {
          ok: false,
          error: "Player profile not found.",
        },
        { status: 404 }
      );
    }

    await prisma.playerProfile.update({
      where: {
        id: playerProfileId,
      },
      data: {
        hasActivePlayerBilling: true,
        playerBillingStatus: "Active",
      },
    });

    await createBillingAuditLog({
      actorType: "ADMIN",

      targetType: "PLAYER_PROFILE",
      targetId: playerProfileId,

      eventType: "ACCOUNT_RESTORED",

      message: `Player billing access manually restored.`,

      metadata: {
        playerProfileId,
        previousBillingStatus: profile.playerBillingStatus,
      },
    });

    return NextResponse.json({
      ok: true,
      playerProfileId,
    });
  } catch (error) {
    console.error("ADMIN_RESTORE_PLAYER_ERROR", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to restore player.",
      },
      { status: 500 }
    );
  }
}