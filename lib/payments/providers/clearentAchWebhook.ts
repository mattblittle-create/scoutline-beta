// lib/payments/providers/clearentAchWebhook.ts

import type {
  NormalizedPaymentWebhook,
} from "@/lib/payments/types";

function clean(
  value: unknown
): string {
  return String(value ?? "").trim();
}

function normalizeStatus(
  value: unknown
): string {
  return clean(value)
    .toUpperCase()
    .replace(/[\s:-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function dollarsToCents(
  value: unknown
): number | null {
  const raw = clean(value);

  if (!raw) {
    return null;
  }

  const parsed = Number(raw);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.round(parsed * 100);
}

export function normalizeClearentAchWebhook(
  payload: unknown
): NormalizedPaymentWebhook {
  const value = payload as any;

  const data =
    value?.Payload ??
    value?.payload ??
    value?.data ??
    value;

  const rawEvent =
    clean(
      value?.PayLoadType ??
      value?.payloadType ??
      value?.event ??
      value?.type
    );

  const status =
    normalizeStatus(
      data?.new_status ??
      data?.newStatus ??
      data?.status
    );

  const transactionId =
    clean(
      data?.transaction_id ??
      data?.transactionId ??
      data?.["transaction-id"]
    );

  const amount =
    dollarsToCents(
      data?.amount
    );

  const responseCode =
    clean(
      data?.return_reason_code ??
      data?.rejection_reason_code
    );

  const responseMessage =
    clean(
      data?.return_reason_description ??
      data?.rejection_reason_description
    );

  const approved =
    status === "SETTLED";

  return {
    event:
      rawEvent.toUpperCase(),

    rawEvent,

    status,

    approved,

    /*
     * ACH status webhooks do not contain
     * ScoutLine's invoice/reference. The
     * webhook route resolves it by looking
     * up BillingTransaction using
     * transactionId.
     */
    reference: "",

    transactionId,

    providerPaymentRef: "",

    receiptUrl: null,

    /*
     * All NormalizedPaymentWebhook monetary
     * amounts are cents.
     */
    amount,
    surcharge: 0,

    paymentType: "ACH",
    brand: null,
    last4: null,

    payload: {
      raw: payload,
      responseCode:
        responseCode || null,
      responseMessage:
        responseMessage || null,
    },
  };
}