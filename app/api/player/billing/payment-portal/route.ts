// app/api/player/billing/payment-portal/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ReturnTo = "onboarding" | "player-dashboard";
type Cadence = "monthly" | "annual";
type PlayerPlan = "REDSHIRT" | "WALK_ON" | "ALL_AMERICAN";

const BASE_PRICE_CENTS: Record<Cadence, Record<PlayerPlan, number>> = {
  monthly: { REDSHIRT: 0, WALK_ON: 2495, ALL_AMERICAN: 4995 },
  annual: { REDSHIRT: 0, WALK_ON: 26500, ALL_AMERICAN: 51000 },
};

function getBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://www.myscoutline.com").replace(/\/$/, "");
}

function getReturnPath(returnTo: ReturnTo) {
  if (returnTo === "player-dashboard") {
    return "/dashboard/player/profile";
  }

  return "/onboarding/player/billing";
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

async function calculatePlayerTotalDue(playerProfileId: string) {
  const profile = await prisma.playerProfile.findUnique({
    where: { id: playerProfileId },
    include: { user: true },
  });

  if (!profile) {
    return null;
  }

  const cadence = String(profile.playerBillingCadence || "monthly").toLowerCase() === "annual"
    ? "annual"
    : "monthly";

  const rawPlan = String(profile.playerPlanTier || "WALK_ON").toUpperCase();
  const planTier: PlayerPlan =
    rawPlan === "REDSHIRT" || rawPlan === "WALK_ON" || rawPlan === "ALL_AMERICAN"
      ? rawPlan
      : "WALK_ON";

  const baseAmountCents = BASE_PRICE_CENTS[cadence][planTier];

  const p: any = prisma as any;

  const activeApp =
    p.discountApplication?.findFirst
      ? await p.discountApplication.findFirst({
          where: {
            targetType: "PLAYER",
            targetId: playerProfileId,
            status: "ACTIVE",
            OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }],
          },
          include: {
            discountCode: true,
          },
        })
      : null;

  const discountType = activeApp?.discountCode?.type ?? null;
  const discountValue = activeApp?.discountCode?.value ?? null;

  let totalCents = baseAmountCents;

  if (discountType && typeof discountValue === "number") {
    switch (String(discountType)) {
      case "PERCENT": {
        const pct = Math.max(0, Math.min(100, discountValue));
        totalCents = Math.max(0, baseAmountCents - Math.round((baseAmountCents * pct) / 100));
        break;
      }
      case "FIXED": {
        totalCents = Math.max(0, baseAmountCents - Math.max(0, discountValue));
        break;
      }
      case "FREE_TRIAL": {
        totalCents = 0;
        break;
      }
      case "OVERRIDE_PRICE": {
        totalCents = Math.max(0, discountValue);
        break;
      }
      default:
        break;
    }
  }

  return {
    profile,
    cadence,
    planTier,
    baseAmountCents,
    totalCents,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const playerProfileId = body?.playerProfileId;
    const returnTo: ReturnTo =
      body?.returnTo === "player-dashboard" ? "player-dashboard" : "onboarding";

    if (!playerProfileId || typeof playerProfileId !== "string") {
      return NextResponse.json(
        { ok: false, error: "Missing playerProfileId." },
        { status: 400 }
      );
    }

    const billing = await calculatePlayerTotalDue(playerProfileId);

    if (!billing?.profile) {
      return NextResponse.json(
        { ok: false, error: "Player profile not found." },
        { status: 404 }
      );
    }

    if (billing.totalCents <= 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "There is no balance due for this plan. Payment method update without a charge requires Valor tokenization/card-on-file setup.",
        },
        { status: 400 }
      );
    }

    const baseHpp = process.env.VALOR_HPP_BASE_URL;

    if (!baseHpp) {
      return NextResponse.json(
        { ok: false, error: "Missing VALOR_HPP_BASE_URL." },
        { status: 500 }
      );
    }

    const baseUrl = getBaseUrl();
    const reference = `sc_${Date.now()}`;
    const returnPath = getReturnPath(returnTo);

    const now = new Date();
    const periodEnd =
      billing.cadence === "annual" ? addYears(now, 1) : addMonths(now, 1);

    await prisma.playerInvoice.create({
      data: {
        playerProfileId,
        externalId: reference,
        status: "OPEN",
        cadence: billing.cadence,
        periodStart: now,
        periodEnd,
        invoiceDate: now,
        dueDate: now,
        amountCents: billing.totalCents,
        amountPaidCents: 0,
      },
    });

    const successUrl =
      `${baseUrl}/api/payments/valor/return?returnTo=${encodeURIComponent(returnTo)}` +
      `&ref=${encodeURIComponent(reference)}` +
      `&playerProfileId=${encodeURIComponent(playerProfileId)}`;

const failureUrl =
  `${baseUrl}/api/payments/valor/return?returnTo=${encodeURIComponent(returnTo)}` +
  `&ref=${encodeURIComponent(reference)}` +
  `&playerProfileId=${encodeURIComponent(playerProfileId)}`;

    const params = new URLSearchParams({
      appid: process.env.VALOR_APP_ID || "",
      appkey: process.env.VALOR_APP_KEY || "",
      epi: process.env.VALOR_EPI || "",
      txn_type: "sale",
      amount: (billing.totalCents / 100).toFixed(2),
      invoicenumber: reference,
      orderdescription: `ScoutLine ${billing.planTier} ${billing.cadence} billing`,
      tax: "0.00",
      surcharge: "0.00",
      ignore_surcharge_calc: "0",
      epage: "1",
      customer_name: billing.profile.user?.name || "ScoutLine Player",
      shipping_country: "US",
      success_url: successUrl,
      failure_url: failureUrl,
      redirect_url: successUrl,
    });

    const joiner = baseHpp.includes("?") ? "&" : "?";
    const setupUrl = `${baseHpp}${joiner}${params.toString()}`;

    const valorRes = await fetch(setupUrl, {
      method: "GET",
      cache: "no-store",
    });

    const valorJson = await valorRes.json().catch(() => null);

    if (!valorRes.ok || !valorJson?.url) {
      console.error("VALOR_PLAYER_BILLING_SETUP_ERROR", {
        status: valorRes.status,
        response: valorJson,
      });

      return NextResponse.json(
        {
          ok: false,
          error:
            valorJson?.desc ||
            valorJson?.msg ||
            valorJson?.mesg ||
            "Valor did not return a hosted payment URL.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      url: String(valorJson.url),
      uid: valorJson?.uid ? String(valorJson.uid) : null,
      reference,
      amountCents: billing.totalCents,
    });
  } catch (err) {
    console.error("PLAYER_PAYMENT_PORTAL_ERROR", err);

    return NextResponse.json(
      { ok: false, error: "Could not open payment portal." },
      { status: 500 }
    );
  }
}