// app/api/cron/billing/player-recurring/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chargeStoredPaymentMethod } from "@/lib/billing/chargeStoredPaymentMethod";
import { markPlayerInvoicePaymentFailed } from "@/lib/billing/playerDunning";
import { maybeAutoSuspendPlayerForDunning } from "@/lib/billing/playerAutoSuspension";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json(
    { ok: false, error: "Unauthorized." },
    { status: 401 }
  );
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function endOfToday() {
  const start = startOfToday();
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization") || "";
  const provided =
    authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret");

  if (!secret || provided !== secret) {
    return unauthorized();
  }

  const dryRun = req.nextUrl.searchParams.get("dryRun") !== "false";

  const now = new Date();
  const todayEnd = endOfToday();

  const invoices = await prisma.playerInvoice.findMany({
where: {
  status: {
    in: ["UPCOMING", "PAST_DUE"],
  },
  dueDate: {
    lte: todayEnd,
  },
  OR: [
    { nextRetryAt: null },
    { nextRetryAt: { lte: now } },
  ],
      playerProfile: {
        hasActivePlayerBilling: true,
        playerBillingStatus: "Active",
        OR: [
          { playerCancelEffectiveAt: null },
          { playerCancelEffectiveAt: { gt: now } },
        ],
        playerBillingProfile: {
          provider: "VALOR",
          providerPaymentRef: {
            not: null,
          },
        },
      },
    },
    orderBy: {
      dueDate: "asc",
    },
    take: 100,
    include: {
      playerProfile: {
        select: {
          id: true,
          email: true,
          playerPlanTier: true,
          playerBillingCadence: true,
          playerBillingProfile: {
            select: {
              provider: true,
              providerPaymentRef: true,
              paymentType: true,
              brand: true,
              last4: true,
            },
          },
        },
      },
    },
  });

  const candidates = invoices.map((invoice) => ({
    invoiceId: invoice.id,
    invoiceNumber: invoice.externalId,
    playerProfileId: invoice.playerProfileId,
    email: invoice.playerProfile.email,
    plan: invoice.playerProfile.playerPlanTier,
    cadence: invoice.playerProfile.playerBillingCadence,
    amountCents: invoice.amountCents,
    cardFeeCents: invoice.cardFeeCents,
    amountPaidCents: invoice.amountPaidCents,
    paymentDraftDate: invoice.dueDate,
    billingMethod: {
      provider: invoice.playerProfile.playerBillingProfile?.provider,
      paymentType: invoice.playerProfile.playerBillingProfile?.paymentType,
      brand: invoice.playerProfile.playerBillingProfile?.brand,
      last4: invoice.playerProfile.playerBillingProfile?.last4,
      hasProviderPaymentRef: Boolean(
        invoice.playerProfile.playerBillingProfile?.providerPaymentRef
      ),
    },
  }));

const chargeResults = [];

if (!dryRun) {
  for (const invoice of invoices) {
    const billing = invoice.playerProfile.playerBillingProfile;
    const token = billing?.providerPaymentRef || "";

const result = await chargeStoredPaymentMethod({
  token,
  provider: billing?.provider,
  paymentType: billing?.paymentType,
  invoiceNumber: invoice.externalId || invoice.id,
  amountCents: invoice.amountCents,
  cardFeeCents: invoice.cardFeeCents,
  description: `ScoutLine ${String(
    invoice.playerProfile.playerPlanTier
  )} ${String(
    invoice.playerProfile.playerBillingCadence || "monthly"
  )} recurring billing`,
  customerName: invoice.playerProfile.email,
  email: invoice.playerProfile.email,
});

let dunningResult = null;

let autoSuspensionResult = null;

if (!result.ok && !result.skipped) {
  dunningResult = await markPlayerInvoicePaymentFailed({
    invoiceId: invoice.id,
    reason:
      "Recurring payment attempt failed or was declined by the payment processor.",
  });

  autoSuspensionResult = await maybeAutoSuspendPlayerForDunning({
    invoiceId: invoice.id,
  });
}

chargeResults.push({
  invoiceId: invoice.id,
  invoiceNumber: invoice.externalId,
  result,
  dunningResult,
  autoSuspensionResult,
});
  }
}

return NextResponse.json({
  ok: true,
  dryRun,
  checkedAt: now.toISOString(),
  dueThrough: todayEnd.toISOString(),
  count: candidates.length,
  candidates,
  chargeResults,
  message: dryRun
    ? "Dry run only. No charges were attempted."
    : "The stored-payment adapter was called. Card charges remain controlled by VALOR_RECURRING_CHARGES_ENABLED, and ACH charges remain disabled until the Clearent integration is configured.",
});
}