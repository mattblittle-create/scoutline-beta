// app/api/player/billig/payment-portal/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function getBaseUrl(req: NextRequest) {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://www.myscoutline.com").replace(/\/$/, "");
}

export async function POST(req: NextRequest) {
  try {
    const { playerProfileId } = await req.json();

    if (!playerProfileId || typeof playerProfileId !== "string") {
      return NextResponse.json({ ok: false, error: "Missing playerProfileId." }, { status: 400 });
    }

    const profile = await prisma.playerProfile.findUnique({
      where: { id: playerProfileId },
      include: { user: true },
    });

    if (!profile) {
      return NextResponse.json({ ok: false, error: "Player profile not found." }, { status: 404 });
    }

    const baseUrl = getBaseUrl(req);
    const reference = `pm_${Date.now()}`;

    const successUrl =
      `${baseUrl}/onboarding/player/billing?payment=method-updated` +
      `&playerProfileId=${encodeURIComponent(playerProfileId)}` +
      `&ref=${encodeURIComponent(reference)}`;

    const failureUrl =
      `${baseUrl}/onboarding/player/billing?payment=method-failed` +
      `&playerProfileId=${encodeURIComponent(playerProfileId)}` +
      `&ref=${encodeURIComponent(reference)}`;

    const params = new URLSearchParams({
      appid: process.env.VALOR_APP_ID || "",
      appkey: process.env.VALOR_APP_KEY || "",
      epi: process.env.VALOR_EPI || "",
      txn_type: "sale",
      amount: "0.00",
      invoicenumber: reference,
      orderdescription: "ScoutLine payment method update",
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

    const baseHpp = process.env.VALOR_HPP_BASE_URL;

    if (!baseHpp) {
      return NextResponse.json({ ok: false, error: "Missing VALOR_HPP_BASE_URL." }, { status: 500 });
    }

    const url = `${baseHpp}&${params.toString()}`;

    return NextResponse.json({ ok: true, url });
  } catch (err) {
    console.error("PLAYER_PAYMENT_PORTAL_ERROR", err);
    return NextResponse.json({ ok: false, error: "Could not open payment portal." }, { status: 500 });
  }
}