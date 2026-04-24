// app/api/payments/valor/create-checkout/route.ts

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, InvoiceStatus, Plan } from "@prisma/client";

const prisma = new PrismaClient();

function getBaseUrl(req: NextRequest) {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://www.myscoutline.com"
  ).replace(/\/$/, "");
}

function normalizePlan(value: string): Plan {
  const v = value.trim().toUpperCase();
  if (v === "WALK_ON") return Plan.WALK_ON;
  if (v === "ALL_AMERICAN") return Plan.ALL_AMERICAN;
  throw new Error("Invalid plan");
}

function normalizeCadence(value: unknown): "monthly" | "annual" {
  // Annual is intentionally disabled for underwriting.
  // Keep the type support so we can turn it back on later.
  if (value === "monthly") return value;
  throw new Error("Invalid cadence");
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function addYears(date: Date, years: number) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + years);
  return next;
}

export async function POST(req: NextRequest) {
  try {
    const {
      plan,
      cadence: rawCadence,
      discountCode,
      playerProfileId,
      paymentMethod,
    } = await req.json();

const cadence = normalizeCadence(rawCadence);
const normalizedPlan = normalizePlan(plan);

    if (!playerProfileId || typeof playerProfileId !== "string") {
      return NextResponse.json(
        { error: "Missing playerProfileId." },
        { status: 400 }
      );
    }

    const baseUrl = getBaseUrl(req);

    const profile = await prisma.playerProfile.findUnique({
      where: { id: playerProfileId },
      include: { user: true },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Player profile not found." },
        { status: 404 }
      );
    }

    const summaryRes = await fetch(
      `${baseUrl}/api/player/billing/activation-summary`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, cadence, discountCode, paymentMethod }),
        cache: "no-store",
      }
    );

    const summary = await summaryRes.json();

    if (!summaryRes.ok || !summary?.finalPrice) {
      return NextResponse.json(
        { error: "Failed to calculate pricing." },
        { status: 400 }
      );
    }

    if (summary.finalPrice <= 0) {
      return NextResponse.json(
        { error: "Free flow — skip checkout." },
        { status: 400 }
      );
    }

    const reference = `sc_${Date.now()}`;
    const amount = (summary.finalPrice / 100).toFixed(2);
    const surcharge = (summary.surchargeAmount / 100).toFixed(2);

    const now = new Date();
    const periodEnd =
      cadence === "annual" ? addYears(now, 1) : addMonths(now, 1);

const invoice = await prisma.playerInvoice.create({
  data: {
    playerProfileId: profile.id,
    status: InvoiceStatus.OPEN,
    cadence,
    periodStart: now,
    periodEnd,
    invoiceDate: now,
    dueDate: now,
    amountCents: summary.finalPrice,
    amountPaidCents: 0,
    externalId: reference,
  },
});

    await prisma.playerProfile.update({
      where: { id: profile.id },
      data: {
        hasActivePlayerBilling: false,
        playerBillingStatus: "Pending",
        playerBillingCadence: cadence,
        playerPlanTier: normalizedPlan,
      },
    });

    const successUrl =
      `${baseUrl}/api/payments/valor/return?success=1` +
      `&ref=${encodeURIComponent(reference)}` +
      `&plan=${encodeURIComponent(plan)}` +
      `&cadence=${encodeURIComponent(cadence)}`;

    const failureUrl =
      `${baseUrl}/api/payments/valor/return?failure=1` +
      `&ref=${encodeURIComponent(reference)}` +
      `&plan=${encodeURIComponent(plan)}` +
      `&cadence=${encodeURIComponent(cadence)}`;

    const redirectUrl =
      `${baseUrl}/api/payments/valor/return` +
      `?ref=${encodeURIComponent(reference)}` +
      `&plan=${encodeURIComponent(plan)}` +
      `&cadence=${encodeURIComponent(cadence)}`;

    const params = new URLSearchParams({
      appid: process.env.VALOR_APP_ID!,
      appkey: process.env.VALOR_APP_KEY!,
      epi: process.env.VALOR_EPI!,
      txn_type: "sale",
      amount,
      invoicenumber: reference,
      orderdescription: `ScoutLine ${plan} ${cadence}`,
      surcharge,
      tax: "0.00",
      ignore_surcharge_calc: "0",
      epage: "1",
      customer_name: profile.user?.name || "ScoutLine Player",
      shipping_country: "US",
      redirect_url: redirectUrl,
      success_url: successUrl,
      failure_url: failureUrl,
    });

    const checkoutUrl = `${process.env.VALOR_HPP_BASE_URL}&${params.toString()}`;

await prisma.playerInvoice.update({
  where: { id: invoice.id },
  data: {
    hostedUrl: checkoutUrl,
  },
});

    return NextResponse.json({
      ok: true,
      checkoutUrl,
      reference,
      amount,
    });
  } catch (err) {
    console.error("VALOR_CHECKOUT_ERROR", err);

    return NextResponse.json(
      { error: "Failed to create checkout." },
      { status: 500 }
    );
  }
}