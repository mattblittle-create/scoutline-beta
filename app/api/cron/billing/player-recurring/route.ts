// app/api/cron/billing/player-recurring/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
  const provided = req.headers.get("x-cron-secret") || req.nextUrl.searchParams.get("secret");

  if (!secret || provided !== secret) {
    return unauthorized();
  }

  const dryRun = req.nextUrl.searchParams.get("dryRun") !== "false";

  const now = new Date();
  const todayEnd = endOfToday();

  const invoices = await prisma.playerInvoice.findMany({
    where: {
      status: "UPCOMING",
      dueDate: {
        lte: todayEnd,
      },
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

  return NextResponse.json({
    ok: true,
    dryRun,
    checkedAt: now.toISOString(),
    dueThrough: todayEnd.toISOString(),
    count: candidates.length,
    candidates,
    message: dryRun
      ? "Dry run only. No charges were attempted."
      : "Live recurring charge mode is not enabled yet.",
  });
}