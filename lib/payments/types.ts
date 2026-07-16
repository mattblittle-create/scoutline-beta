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

  chargeStoredMethod(
    input: StoredPaymentChargeInput
  ): Promise<StoredPaymentChargeResult>;
};