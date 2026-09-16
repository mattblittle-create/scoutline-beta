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

  /*
   * Xplor's documented ACH webhook format:
   *
   * {
   *   "PayLoadType": "ach.status.settled",
   *   "Payload": {
   *     "transaction_id": "...",
   *     "new_status": "SETTLED",
   *     ...
   *   }
   * }
   *
   * Keep the fallback names below so the
   * normalizer remains tolerant of alternate
   * casing / representations.
   */
  const data =
    value?.Payload ??
    value?.payload ??
    value?.data ??
    value;

  const rawEvent =
    clean(
      value?.PayLoadType ??
      value?.PayloadType ??
      value?.payloadType ??
      value?.event ??
      value?.type
    );

  /*
   * The actual ACH transaction state comes
   * from Payload.new_status.
   *
   * This is especially important for
   * ach.status.updated because that event can
   * represent different resulting statuses.
   */
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

  /*
   * Xplor sends ACH webhook amounts as
   * decimal-dollar strings such as "24.95".
   *
   * ScoutLine's normalized payment layer
   * expects integer cents.
   */
  const amount =
    dollarsToCents(
      data?.amount
    );

  /*
   * Returned webhooks use return_reason_*.
   * Rejected / chargeback payloads can use
   * rejection_reason_*.
   */
  const responseCode =
    clean(
      data?.return_reason_code ??
      data?.rejection_reason_code ??
      data?.response_code ??
      data?.responseCode
    );

  const responseMessage =
    clean(
      data?.return_reason_description ??
      data?.rejection_reason_description ??
      data?.response_message ??
      data?.responseMessage
    );

  /*
   * For ACH, only SETTLED represents a
   * successful completed payment for
   * ScoutLine billing activation.
   *
   * PENDING / intermediate statuses must
   * never activate player billing.
   */
  const approved =
    status === "SETTLED";

  return {
    event:
      rawEvent.toUpperCase(),

    rawEvent,

    status,

    approved,

    /*
     * Xplor ACH status webhooks identify the
     * payment using transaction_id.
     *
     * They do not reliably contain
     * ScoutLine's invoice/reference in
     * production.
     *
     * The webhook route resolves the
     * ScoutLine reference by looking up the
     * BillingTransaction using transactionId.
     */
    reference: "",

    transactionId,

    providerPaymentRef: "",

    receiptUrl: null,

    /*
     * All NormalizedPaymentWebhook monetary
     * amounts are expressed in cents.
     */
    amount,

    surcharge: 0,

    paymentType: "ACH",

    brand: null,

    last4: null,

    /*
     * Preserve the original provider payload
     * for downstream audit/debug handling.
     *
     * INT-only metadata is intentionally not
     * used for transaction matching because
     * Xplor confirmed it will not exist in
     * production.
     */
    payload: {
      raw: payload,

      responseCode:
        responseCode || null,

      responseMessage:
        responseMessage || null,
    },
  };
}