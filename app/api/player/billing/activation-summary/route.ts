// app/api/player/billing/activation-summary/route.ts

import { NextRequest, NextResponse } from "next/server";

const PRICING = {
  WALK_ON: {
    monthly: 2495,
    annual: 26500,
  },
  ALL_AMERICAN: {
    monthly: 4995,
    annual: 51000,
  },
};

export async function POST(req: NextRequest) {
  try {
    const { plan, cadence, discountCode } = await req.json();

    const basePrice = PRICING[plan]?.[cadence];

    if (!basePrice) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    let discountAmount = 0;

    // 🔥 SIMPLE DISCOUNT LOGIC (we will hook to DB later)
    if (discountCode === "HALFOFF") {
      discountAmount = Math.round(basePrice * 0.5);
    }

    const discountedPrice = basePrice - discountAmount;

    // 🔥 SURCHARGE (3%)
    const surchargeAmount = Math.round(discountedPrice * 0.03);

    const finalPrice = discountedPrice + surchargeAmount;

    return NextResponse.json({
      plan,
      cadence,
      basePrice,
      discountAmount,
      discountedPrice,
      surchargeAmount,
      finalPrice,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to calculate summary" },
      { status: 500 }
    );
  }
}