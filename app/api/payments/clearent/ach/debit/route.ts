// app/api/payments/clearent/ach/debit/route.ts

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  InvoiceStatus,
  Plan,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

import {
  PaymentMethod,
} from "@/lib/payments/types";

import {
  getPaymentProviderForMethod,
} from "@/lib/payments/providerRegistry";

import {
  getClearentAchEnvironment,
  normalizeAchAccountType,
} from "@/lib/payments/providers/clearentAch";

import {
  PAYMENT_PROVIDER_CODE,
  PLAYER_BILLING_CADENCE,
  PLAYER_BILLING_STATUS,
} from "@/lib/billing/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RequestBody = {
  playerProfileId?: unknown;
  plan?: unknown;
  cadence?: unknown;
  discountCode?: unknown;

  mobileJwt?: unknown;
  accountHolderName?: unknown;
  accountType?: unknown;
};

function clean(
  value: unknown
): string {
  return String(value ?? "").trim();
}

function normalizePlan(
  value: unknown
): Plan {
  const normalized =
    clean(value).toUpperCase();

  if (normalized === "WALK_ON") {
    return Plan.WALK_ON;
  }

  if (
    normalized === "ALL_AMERICAN"
  ) {
    return Plan.ALL_AMERICAN;
  }

  throw new Error("Invalid plan.");
}

function addMonths(
  date: Date,
  months: number
): Date {
  const next = new Date(date);

  next.setMonth(
    next.getMonth() + months
  );

  return next;
}

function jsonError(
  error: string,
  status: number,
  code?: string
) {
  return NextResponse.json(
    {
      ok: false,
      error,
      code,
    },
    {
      status,
    }
  );
}

export async function POST(
  req: NextRequest
) {
  let transactionReference = "";

  try {
    const body =
      (await req
        .json()
        .catch(() => ({}))) as RequestBody;

    const playerProfileId =
      clean(body.playerProfileId);

    const mobileJwt =
      clean(body.mobileJwt);

    const accountHolderName =
      clean(body.accountHolderName);

    const accountType =
      normalizeAchAccountType(
        body.accountType
      );

    const cadence =
      clean(body.cadence).toLowerCase();

    const discountCode =
      clean(body.discountCode);

    if (!playerProfileId) {
      return jsonError(
        "Missing player profile ID.",
        400,
        "PLAYER_PROFILE_ID_MISSING"
      );
    }

    if (!mobileJwt) {
      return jsonError(
        "Missing ACH payment token.",
        400,
        "ACH_MOBILE_JWT_MISSING"
      );
    }

    if (!accountHolderName) {
      return jsonError(
        "Account holder name is required.",
        400,
        "ACH_ACCOUNT_HOLDER_MISSING"
      );
    }

    if (!accountType) {
      return jsonError(
        "Account type must be Checking or Savings.",
        400,
        "ACH_ACCOUNT_TYPE_INVALID"
      );
    }

    if (
      cadence !==
      PLAYER_BILLING_CADENCE.MONTHLY
    ) {
      return jsonError(
        "Only monthly billing is currently available.",
        400,
        "BILLING_CADENCE_INVALID"
      );
    }

    let normalizedPlan: Plan;

    try {
      normalizedPlan =
        normalizePlan(body.plan);
    } catch {
      return jsonError(
        "Invalid player plan.",
        400,
        "PLAYER_PLAN_INVALID"
      );
    }

    const profile =
      await prisma.playerProfile.findUnique({
        where: {
          id: playerProfileId,
        },
        include: {
          user: true,
        },
      });

    if (!profile) {
      return jsonError(
        "Player profile not found.",
        404,
        "PLAYER_PROFILE_NOT_FOUND"
      );
    }

    /*
     * Pricing must always be calculated
     * on the server. Never trust an amount
     * received from the browser.
     */
    const baseUrl = (
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://www.myscoutline.com"
    ).replace(/\/$/, "");

    const summaryResponse =
      await fetch(
        `${baseUrl}/api/player/billing/activation-summary`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            plan: normalizedPlan,
            cadence,
            discountCode,
            paymentMethod:
              PaymentMethod.ACH,
          }),
          cache: "no-store",
        }
      );

    const summary =
      await summaryResponse
        .json()
        .catch(() => null);

    if (
      !summaryResponse.ok ||
      !summary
    ) {
      return jsonError(
        summary?.error ||
          "Failed to calculate ACH pricing.",
        400,
        summary?.code ||
          "ACH_PRICING_FAILED"
      );
    }

    const amountCents =
      Number(summary.finalPrice);

    if (
      !Number.isInteger(amountCents) ||
      amountCents <= 0
    ) {
      return jsonError(
        "ACH amount must be greater than zero.",
        400,
        "ACH_AMOUNT_INVALID"
      );
    }

    transactionReference =
      `sc_ach_${Date.now()}_${profile.id.slice(
        -6
      )}`;

    const environment =
      getClearentAchEnvironment();

    const provider =
      getPaymentProviderForMethod(
        PaymentMethod.ACH
      );

    if (
      !provider.createInitialAchDebit
    ) {
      return jsonError(
        "ACH debit is not supported.",
        503,
        "ACH_DEBIT_UNSUPPORTED"
      );
    }

    const achResult =
      await provider.createInitialAchDebit({
        mobileJwt,
        reference:
          transactionReference,
        amountCents,
        accountType,
        individualName:
          accountHolderName,
        standardEntryClassCode:
          environment.standardEntryClassCode,
        softwareType:
          environment.softwareType,
        softwareTypeVersion:
          environment.softwareTypeVersion,
        createToken: true,
      });

    const now = new Date();
    const periodEnd =
      addMonths(now, 1);

    /*
     * Create the invoice even when Xplor
     * declines the submission. This leaves
     * a traceable billing record.
     */
    const invoice =
      await prisma.playerInvoice.create({
        data: {
          playerProfileId:
            profile.id,
          status: InvoiceStatus.OPEN,
          cadence,
          periodStart: now,
          periodEnd,
          invoiceDate: now,
          dueDate: now,
          amountCents,
          cardFeeCents: 0,
          amountPaidCents: 0,
          externalId:
            transactionReference,
        },
      });

    await prisma.billingTransaction.create({
      data: {
        playerProfileId:
          profile.id,
        invoiceId: invoice.id,

        provider:
          PAYMENT_PROVIDER_CODE.CLEARENT_ACH,

        providerTransactionId:
          achResult.transactionId ||
          transactionReference,

        providerReference:
          transactionReference,

      transactionType: "ACH_DEBIT",

      transactionStatus:
        achResult.status,

        amountCents,
        cardFeeCents: 0,

        responseCode:
          achResult.responseCode,

        responseMessage:
          achResult.responseMessage,

        rawPayload:
          achResult.raw == null
            ? undefined
            : (achResult.raw as any),
      },
    });

    if (!achResult.ok) {
      return NextResponse.json(
        {
          ok: false,
          error:
            achResult.error ||
            "ACH payment was not accepted.",
          code:
            achResult.code ||
            "ACH_DEBIT_FAILED",
          reference:
            transactionReference,
          status:
            achResult.status,
        },
        {
          status: 402,
        }
      );
    }

    /*
     * APPROVED means submitted/accepted,
     * not fully settled. Do not mark the
     * invoice paid or activate billing yet.
     */
    await prisma.playerProfile.update({
      where: {
        id: profile.id,
      },
      data: {
        hasActivePlayerBilling:
          false,

        playerBillingStatus:
          PLAYER_BILLING_STATUS.PENDING,

        playerBillingCadence:
          cadence,

        playerPlanTier:
          normalizedPlan,
      },
    });

    if (achResult.tokenId) {
      await prisma.playerBillingProfile.upsert({
        where: {
          playerProfileId:
            profile.id,
        },
        create: {
          playerProfileId:
            profile.id,

          provider:
            PAYMENT_PROVIDER_CODE.CLEARENT_ACH,

          providerPaymentRef:
            achResult.tokenId,

          paymentType: "ACH",

          last4:
            achResult.last4,

          brand: null,

          accountHolderName:
            accountHolderName,

          accountType,
        },
        update: {
          provider:
            PAYMENT_PROVIDER_CODE.CLEARENT_ACH,

          providerPaymentRef:
            achResult.tokenId,

          paymentType: "ACH",

          last4:
            achResult.last4,

          brand: null,

          accountHolderName:
            accountHolderName,

          accountType,
        },
      });
    }

    return NextResponse.json({
      ok: true,

      provider:
        PAYMENT_PROVIDER_CODE.CLEARENT_ACH,

      reference:
        transactionReference,

      transactionId:
        achResult.transactionId,

      status:
        achResult.status,

      tokenCreated:
        Boolean(
          achResult.tokenId
        ),

      last4:
        achResult.last4,

      accountType,

      amountCents,

      message:
        achResult.responseMessage ||
        "ACH payment submitted.",
    });
  } catch (error) {
    console.error(
      "CLEARENT_ACH_DEBIT_ROUTE_ERROR",
      {
        transactionReference,
        error,
      }
    );

    return jsonError(
      "Failed to submit ACH payment.",
      500,
      "ACH_DEBIT_INTERNAL_ERROR"
    );
  }
}