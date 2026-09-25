// app/api/player/billing/payment-method-token/save/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createBillingAuditLog } from "@/lib/billing/billingAudit";

export const dynamic = "force-dynamic";

function clean(value: unknown) {
  return String(value ?? "").trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const playerProfileId = clean(body?.playerProfileId);
    const cardToken = clean(body?.cardToken);
    const last4 = clean(body?.last4);
    const brand = clean(body?.brand);
    const paymentType = clean(body?.paymentType);

    if (!playerProfileId) {
      return NextResponse.json(
        { ok: false, error: "Missing playerProfileId." },
        { status: 400 }
      );
    }

    if (!cardToken) {
      return NextResponse.json(
        { ok: false, error: "Missing card token." },
        { status: 400 }
      );
    }

    const profile = await prisma.playerProfile.findUnique({
      where: { id: playerProfileId },
      select: {
        id: true,
      },
    });

    if (!profile) {
      return NextResponse.json(
        { ok: false, error: "Player profile not found." },
        { status: 404 }
      );
    }

    await prisma.playerBillingProfile.upsert({
      where: {
        playerProfileId,
      },
      update: {
        provider: "VALOR",
        providerPaymentRef: cardToken,
        last4: last4 || undefined,
        brand: brand || undefined,
        paymentType: paymentType || undefined,
      },
      create: {
        playerProfileId,
        provider: "VALOR",
        providerPaymentRef: cardToken,
        last4: last4 || null,
        brand: brand || null,
        paymentType: paymentType || null,
      },
    });

    await createBillingAuditLog({
      actorType: "PLAYER",
      targetType: "PLAYER_PROFILE",
      targetId: playerProfileId,
      eventType: "PAYMENT_METHOD_TOKEN_UPDATED",
      message: "Stored payment method updated successfully.",
      metadata: {
        provider: "VALOR",
        last4,
        brand,
        paymentType,
      },
    });

    return NextResponse.json({
      ok: true,
      saved: true,
    });
  } catch (error) {
    console.error("SAVE_PAYMENT_METHOD_TOKEN_ERROR", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to save payment method token.",
      },
      { status: 500 }
    );
  }
}