// lib/billing/constants.ts

export const CARD_PROCESSING_RATE = 0.03;

export const PLAYER_BILLING_CADENCE = {
  MONTHLY: "monthly",
  ANNUAL: "annual",
} as const;

export type PlayerBillingCadence =
  (typeof PLAYER_BILLING_CADENCE)[keyof typeof PLAYER_BILLING_CADENCE];

export const PLAYER_PLAN_CODE = {
  WALK_ON: "WALK_ON",
  ALL_AMERICAN: "ALL_AMERICAN",
} as const;

export type PlayerPlanCode =
  (typeof PLAYER_PLAN_CODE)[keyof typeof PLAYER_PLAN_CODE];

export const PAYMENT_PROVIDER_CODE = {
  VALOR: "VALOR",
  CLEARENT_ACH: "CLEARENT_ACH",
} as const;

export type PaymentProviderCode =
  (typeof PAYMENT_PROVIDER_CODE)[keyof typeof PAYMENT_PROVIDER_CODE];

export const PLAYER_BILLING_STATUS = {
  PENDING: "Pending",
  ACTIVE: "Active",
  PAST_DUE: "Past Due",
  SUSPENDED: "Suspended",
} as const;

export type PlayerBillingStatus =
  (typeof PLAYER_BILLING_STATUS)[keyof typeof PLAYER_BILLING_STATUS];