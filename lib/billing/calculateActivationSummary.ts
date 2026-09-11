// lib/billing/calculateActivationSummary.ts

import {
  CARD_PROCESSING_RATE,
  PLAYER_BILLING_CADENCE,
  PLAYER_PLAN_CODE,
  type PlayerBillingCadence,
  type PlayerPlanCode,
} from "@/lib/billing/constants";

import { normalizeCents } from "@/lib/billing/money";
import { PaymentMethod } from "@/lib/payments/types";

const PRICING: Record<
  PlayerPlanCode,
  Record<PlayerBillingCadence, number>
> = {
  [PLAYER_PLAN_CODE.WALK_ON]: {
    [PLAYER_BILLING_CADENCE.MONTHLY]: 2495,
    [PLAYER_BILLING_CADENCE.ANNUAL]: 26500,
  },

  [PLAYER_PLAN_CODE.ALL_AMERICAN]: {
    [PLAYER_BILLING_CADENCE.MONTHLY]: 4995,
    [PLAYER_BILLING_CADENCE.ANNUAL]: 51000,
  },
};

export type ActivationSummaryInput = {
  plan: unknown;
  cadence: unknown;
  paymentMethod?: unknown;
  discountCode?: unknown;
};

export type ActivationSummaryResult = {
  plan: PlayerPlanCode;
  cadence: PlayerBillingCadence;
  paymentMethod: PaymentMethod;
  basePrice: number;
  discountAmount: number;
  discountedPrice: number;
  surchargeAmount: number;
  finalPrice: number;
};

export class ActivationSummaryError extends Error {
  code: "INVALID_PLAN" | "INVALID_CADENCE";

  constructor(
    code: "INVALID_PLAN" | "INVALID_CADENCE",
    message: string
  ) {
    super(message);
    this.name = "ActivationSummaryError";
    this.code = code;
  }
}

function isPlan(
  value: unknown
): value is PlayerPlanCode {
  return (
    value === PLAYER_PLAN_CODE.WALK_ON ||
    value === PLAYER_PLAN_CODE.ALL_AMERICAN
  );
}

function isCadence(
  value: unknown
): value is PlayerBillingCadence {
  // Annual remains disabled per underwriting.
  return (
    value ===
    PLAYER_BILLING_CADENCE.MONTHLY
  );
}

function normalizePaymentMethod(
  value: unknown
): PaymentMethod {
  return value === PaymentMethod.ACH
    ? PaymentMethod.ACH
    : PaymentMethod.CARD;
}

export function calculateActivationSummary(
  input: ActivationSummaryInput
): ActivationSummaryResult {
  const plan = input.plan;
  const cadence = input.cadence;

  if (!isPlan(plan)) {
    throw new ActivationSummaryError(
      "INVALID_PLAN",
      "Invalid plan"
    );
  }

  if (!isCadence(cadence)) {
    throw new ActivationSummaryError(
      "INVALID_CADENCE",
      "Invalid cadence"
    );
  }

  const paymentMethod =
    normalizePaymentMethod(
      input.paymentMethod
    );

  const discountCode =
    typeof input.discountCode === "string"
      ? input.discountCode.trim()
      : "";

  const basePrice =
    PRICING[plan][cadence];

  let discountAmount = 0;

  if (
    discountCode.toUpperCase() ===
    "HALFOFF"
  ) {
    discountAmount = normalizeCents(
      basePrice * 0.5
    );
  }

  const discountedPrice = Math.max(
    0,
    basePrice - discountAmount
  );

  const surchargeAmount =
    paymentMethod === PaymentMethod.CARD
      ? normalizeCents(
          discountedPrice *
            CARD_PROCESSING_RATE
        )
      : 0;

  const finalPrice =
    discountedPrice + surchargeAmount;

  return {
    plan,
    cadence,
    paymentMethod,
    basePrice,
    discountAmount,
    discountedPrice,
    surchargeAmount,
    finalPrice,
  };
}