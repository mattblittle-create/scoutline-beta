// app/api/player/billing/activation-summary/route.ts

import { NextRequest, NextResponse } from "next/server";

type Plan = "WALK_ON" | "ALL_AMERICAN";
type Cadence = "monthly" | "annual";
type PaymentMethod = "card" | "ach";

const PRICING: Record<Plan, Record<Cadence, number>> = {
  WALK_ON: {
    monthly: 2495,
    annual: 26500,
  },
  ALL_AMERICAN: {
    monthly: 4995,
    annual: 51000,
  },
};

function isPlan(value: unknown): value is Plan {
  return value === "WALK_ON" || value === "ALL_AMERICAN";
}

function isCadence(value: unknown): value is Cadence {
  // Annual disabled per underwriting.
  return value === "monthly";
}

function normalizePaymentMethod(value: unknown): PaymentMethod {
  return value === "ach" ? "ach" : "card";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const plan = body?.plan;
    const cadence = body?.cadence;
    const paymentMethod = normalizePaymentMethod(body?.paymentMethod);
    const discountCode =
      typeof body?.discountCode === "string" ? body.discountCode.trim() : "";

    if (!isPlan(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    if (!isCadence(cadence)) {
      return NextResponse.json({ error: "Invalid cadence" }, { status: 400 });
    }

    const basePrice = PRICING[plan][cadence];

    let discountAmount = 0;

    if (discountCode.toUpperCase() === "HALFOFF") {
      discountAmount = Math.round(basePrice * 0.5);
    }

    const discountedPrice = Math.max(0, basePrice - discountAmount);

    const surchargeAmount =
      paymentMethod === "card" ? Math.round(discountedPrice * 0.03) : 0;

    const finalPrice = discountedPrice + surchargeAmount;

    return NextResponse.json({
      plan,
      cadence,
      paymentMethod,
      basePrice,
      discountAmount,
      discountedPrice,
      surchargeAmount,
      finalPrice,
    });
  } catch (err) {
    console.error("PLAYER_BILLING_ACTIVATION_SUMMARY_ERROR", err);

    return NextResponse.json(
      { error: "Failed to calculate summary" },
      { status: 500 }
    );
  }
}