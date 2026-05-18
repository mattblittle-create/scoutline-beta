// app/api/player/billing/payment-portal/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ReturnTo = "onboarding" | "player-dashboard";

function getBaseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://www.myscoutline.com").replace(/\/$/, "");
}

function getReturnPath(returnTo: ReturnTo) {
  if (returnTo === "player-dashboard") {
    return "/dashboard/player/profile";
  }

  return "/onboarding/player/billing";
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

    const profile = await prisma.playerProfile.findUnique({
      where: { id: playerProfileId },
      include: { user: true },
    });

    if (!profile) {
      return NextResponse.json(
        { ok: false, error: "Player profile not found." },
        { status: 404 }
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
    const reference = `pm_${Date.now()}`;
    const returnPath = getReturnPath(returnTo);

    const successUrl =
      `${baseUrl}${returnPath}?payment=method-updated` +
      `&playerProfileId=${encodeURIComponent(playerProfileId)}` +
      `&ref=${encodeURIComponent(reference)}`;

    const failureUrl =
      `${baseUrl}${returnPath}?payment=method-failed` +
      `&playerProfileId=${encodeURIComponent(playerProfileId)}` +
      `&ref=${encodeURIComponent(reference)}`;

    const params = new URLSearchParams({
      appid: process.env.VALOR_APP_ID || "",
      appkey: process.env.VALOR_APP_KEY || "",
      epi: process.env.VALOR_EPI || "",

      // Valor rejects 0.00 sales.
      // This is a temporary payment method verification transaction.
      txn_type: "sale",
      amount: "0.01",

      invoicenumber: reference,
      orderdescription: "ScoutLine payment method verification",
      tax: "0.00",
      surcharge: "0.00",
      ignore_surcharge_calc: "0",
      epage: "1",
      customer_name: profile.user?.name || "ScoutLine Player",
      shipping_country: "US",
      success_url: successUrl,
      failure_url: failureUrl,
      redirect_url: successUrl,
    });

    const joiner = baseHpp.includes("?") ? "&" : "?";
    const url = `${baseHpp}${joiner}${params.toString()}`;

    return NextResponse.json({ ok: true, url });
  } catch (err) {
    console.error("PLAYER_PAYMENT_PORTAL_ERROR", err);

    return NextResponse.json(
      { ok: false, error: "Could not open payment portal." },
      { status: 500 }
    );
  }
}