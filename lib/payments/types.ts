// lib/payments/types.ts

import type {
  PaymentProviderCode,
} from "@/lib/billing/constants";

export type {
  PaymentProviderCode,
} from "@/lib/billing/constants";

export enum PaymentMethod {
  CARD = "card",
  ACH = "ach",
}

export type PaymentMethodKind = PaymentMethod;

export type NormalizedPaymentWebhook = {
  event: string;
  rawEvent: string;
  status: string;
  approved: boolean;

  reference: string;
  transactionId: string;
  providerPaymentRef: string;

  receiptUrl: string | null;

  amount: number | null;
  surcharge: number | null;

  paymentType: string | null;
  brand: string | null;
  last4: string | null;

  payload: unknown;
};

export type CreateCheckoutInput = {
  reference: string;

  amountCents: number;
  surchargeCents: number;

  description: string;
  customerName: string;
  customerEmail?: string | null;

  successUrl: string;
  failureUrl: string;
  redirectUrl: string;
};

export type CreateCheckoutResult = {
  ok: boolean;
  provider: PaymentProviderCode;

  checkoutUrl?: string;
  reference: string;

  error?: string;
  code?: string;
};

export type AchAccountType =
  | "Checking"
  | "Savings";

export type AchStandardEntryClassCode =
  | "PPD"
  | "WEB";

export type AchTransactionStatus =
  | "PENDING"
  | "APPROVED"
  | "SETTLING"
  | "SETTLED"
  | "RETURNED"
  | "CHARGEBACK"
  | "FAILED"
  | "VOIDED"
  | "UNKNOWN";

export type InitialAchDebitInput = {
  mobileJwt: string;

  reference: string;
  amountCents: number;

  accountType: AchAccountType;
  individualName: string;

  standardEntryClassCode:
    AchStandardEntryClassCode;

  softwareType: string;
  softwareTypeVersion: string;

  createToken?: boolean;
};

export type InitialAchDebitResult = {
  ok: boolean;
  provider: PaymentProviderCode;

  reference: string;
  status: AchTransactionStatus;

  transactionId?: string | null;
  tokenId?: string | null;
  last4?: string | null;

  accountType?: AchAccountType | null;
  individualName?: string | null;

  responseCode?: string | null;
  responseMessage?: string | null;

  raw?: unknown;

  error?: string;
  code?: string;
};

export type StoredPaymentChargeInput = {
  token: string;
  invoiceNumber: string;
  amountCents: number;
  cardFeeCents?: number;
  description: string;
  customerName?: string | null;
  email?: string | null;
};

export type StoredPaymentChargeResult = {
  ok: boolean;
  skipped: boolean;
  reason?: string;

  invoiceNumber: string;
  amountPaidCents?: number;
  cardFeeCents?: number;

  transactionId?: string | null;
  responseCode?: string | null;
  approvalCode?: string | null;
  rrn?: string | null;
  receiptUrl?: string | null;

  raw?: unknown;
};

export type PaymentProvider = {
  code: PaymentProviderCode;
  method: PaymentMethodKind;

  createCheckout(
    input: CreateCheckoutInput
  ): Promise<CreateCheckoutResult>;

  createInitialAchDebit?(
    input: InitialAchDebitInput
  ): Promise<InitialAchDebitResult>;

  chargeStoredMethod(
    input: StoredPaymentChargeInput
  ): Promise<StoredPaymentChargeResult>;
};