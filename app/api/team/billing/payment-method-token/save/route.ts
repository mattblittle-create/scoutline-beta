// app/api/team/billing/payment-method-token/save/route.ts

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

    const teamId = clean(body?.teamId);
    const cardToken = clean(body?.cardToken);
    const last4 = clean(body?.last4);
    const brand = clean(body?.brand);
    const paymentType = clean(body?.paymentType);

    if (!teamId) {
      return NextResponse.json(
        { ok: false, error: "Missing teamId." },
        { status: 400 }
      );
    }

    if (!cardToken) {
      return NextResponse.json(
        { ok: false, error: "Missing card token." },
        { status: 400 }
      );
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, name: true },
    });

    if (!team) {
      return NextResponse.json(
        { ok: false, error: "Team not found." },
        { status: 404 }
      );
    }

    await prisma.teamBillingProfile.upsert({
      where: {
        teamId,
      },
      update: {
        provider: "VALOR",
        providerPaymentRef: cardToken,
        last4: last4 || undefined,
        brand: brand || undefined,
        paymentType: paymentType || undefined,
      },
      create: {
        teamId,
        provider: "VALOR",
        providerPaymentRef: cardToken,
        last4: last4 || null,
        brand: brand || null,
        paymentType: paymentType || null,
      },
    });

    await createBillingAuditLog({
      actorType: "TEAM_ADMIN",
      targetType: "TEAM",
      targetId: teamId,
      eventType: "PAYMENT_METHOD_TOKEN_UPDATED",
      message: `Stored payment method updated for ${team.name || "team"}.`,
      metadata: {
        provider: "VALOR",
        teamId,
        teamName: team.name,
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
    console.error("SAVE_TEAM_PAYMENT_METHOD_TOKEN_ERROR", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to save team payment method token.",
      },
      { status: 500 }
    );
  }
}