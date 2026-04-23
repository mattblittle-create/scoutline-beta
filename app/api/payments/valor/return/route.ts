// app/api/payments/valor/return/route.ts

import { NextRequest, NextResponse } from "next/server";
import { PrismaClient, InvoiceStatus } from "@prisma/client";

const prisma = new PrismaClient();

function getAppBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL || "https://www.myscoutline.com"
  ).replace(/\/$/, "");
}

function isTruthyParam(value: string | null) {
  if (!value) return false;
  const v = value.toLowerCase().trim();
  return ["1", "true", "yes", "y", "success", "approved", "paid"].includes(v);
}

function isFailureParam(value: string | null) {
  if (!value) return false;
  const v = value.toLowerCase().trim();
  return [
    "0",
    "false",
    "no",
    "n",
    "failed",
    "failure",
    "declined",
    "error",
    "cancelled",
    "canceled",
  ].includes(v);
}

export async function GET(req: NextRequest) {
  try {
    const baseUrl = getAppBaseUrl();
    const { searchParams } = new URL(req.url);

    const ref =
      searchParams.get("ref") ||
      searchParams.get("invoicenumber") ||
      "";

    const plan = searchParams.get("plan") || "";
    const cadence = searchParams.get("cadence") || "";

    const success =
      searchParams.get("success") ||
      searchParams.get("approved") ||
      searchParams.get("paid") ||
      "";

    const failure =
      searchParams.get("failure") ||
      searchParams.get("failed") ||
      searchParams.get("declined") ||
      "";

    const status =
      searchParams.get("status") ||
      searchParams.get("result") ||
      searchParams.get("response") ||
      searchParams.get("txn_status") ||
      searchParams.get("transaction_status") ||
      "";

    const redirect = new URL("/onboarding/player/billing", baseUrl);

    if (ref) redirect.searchParams.set("ref", ref);
    if (plan) redirect.searchParams.set("plan", plan);
    if (cadence) redirect.searchParams.set("cadence", cadence);

    // Missing reference = we can't match anything reliably.
    if (!ref) {
      redirect.searchParams.set("payment", "error");
      redirect.searchParams.set(
        "message",
        "Missing payment reference. Please contact support if your card was charged."
      );
      return NextResponse.redirect(redirect, { status: 302 });
    }

    const invoice = await prisma.playerInvoice.findFirst({
      where: { externalId: ref },
      include: {
        playerProfile: true,
      },
    });

    if (!invoice) {
      redirect.searchParams.set("payment", "error");
      redirect.searchParams.set(
        "message",
        "We could not find your payment record. Please contact support if your card was charged."
      );
      return NextResponse.redirect(redirect, { status: 302 });
    }

    // If webhook already marked this invoice paid, trust DB first.
    if (invoice.status === InvoiceStatus.PAID) {
      redirect.searchParams.set("payment", "success");
      redirect.searchParams.set(
        "message",
        "Payment confirmed. Your account is active."
      );
      redirect.searchParams.set("playerProfileId", invoice.playerProfileId);
      return NextResponse.redirect(redirect, { status: 302 });
    }

    // Explicit failure signal from Valor redirect
    if (isFailureParam(failure) || isFailureParam(status)) {
      await prisma.playerProfile.update({
        where: { id: invoice.playerProfileId },
        data: {
          hasActivePlayerBilling: false,
          playerBillingStatus: "Past Due",
        },
      });

      redirect.searchParams.set("payment", "failed");
      redirect.searchParams.set(
        "message",
        "Your payment was not completed."
      );
      redirect.searchParams.set("playerProfileId", invoice.playerProfileId);
      return NextResponse.redirect(redirect, { status: 302 });
    }

    // Success redirect does NOT guarantee final activation yet.
    // Webhook remains source of truth.
    if (isTruthyParam(success) || isTruthyParam(status)) {
      redirect.searchParams.set("payment", "processing");
      redirect.searchParams.set(
        "message",
        "Payment received. We’re confirming your activation now."
      );
      redirect.searchParams.set("playerProfileId", invoice.playerProfileId);
      return NextResponse.redirect(redirect, { status: 302 });
    }

    // Unknown / ambiguous redirect state
    redirect.searchParams.set("payment", "pending");
    redirect.searchParams.set(
      "message",
      "We’re verifying your payment status now."
    );
    redirect.searchParams.set("playerProfileId", invoice.playerProfileId);
    return NextResponse.redirect(redirect, { status: 302 });
  } catch (error) {
    console.error("VALOR_RETURN_HANDLER_ERROR", error);

    const fallback = new URL("/onboarding/player/billing", getAppBaseUrl());
    fallback.searchParams.set("payment", "error");
    fallback.searchParams.set(
      "message",
      "We’re unable to verify your payment return right now."
    );

    return NextResponse.redirect(fallback, { status: 302 });
  }
}