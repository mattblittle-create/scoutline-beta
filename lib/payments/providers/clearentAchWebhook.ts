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

function getPayloadObject(
  value: any
): any {
  /*
   * Xplor production/documented ACH webhook:
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
   * Xplor's INT manual webhook sender has
   * been observed wrapping that payload:
   *
   * {
   *   "PayLoadType": "ach.status.updated",
   *   "Payload": {
   *     "PayLoadType": "ach.status.settled",
   *     "Payload": {
   *       "transaction_id": "...",
   *       "new_status": "SETTLED",
   *       ...
   *     },
   *     "metadata": {
   *       ...
   *     }
   *   }
   * }
   *
   * First resolve the normal outer payload.
   */
  const outerData =
    value?.Payload ??
    value?.payload ??
    value?.data ??
    value;

  /*
   * If the resolved payload is itself another
   * Xplor webhook envelope, descend one more
   * level to reach the ACH transaction data.
   *
   * We intentionally key this off the nested
   * webhook-envelope shape rather than merely
   * the existence of a Payload property.
   */
  const hasNestedWebhookEnvelope =
    outerData &&
    typeof outerData === "object" &&
    (
      outerData?.PayLoadType != null ||
      outerData?.PayloadType != null ||
      outerData?.payloadType != null
    ) &&
    (
      outerData?.Payload != null ||
      outerData?.payload != null ||
      outerData?.data != null
    );

  if (hasNestedWebhookEnvelope) {
    return (
      outerData?.Payload ??
      outerData?.payload ??
      outerData?.data ??
      outerData
    );
  }

  return outerData;
}

function getRawEvent(
  value: any
): string {
  const outerData =
    value?.Payload ??
    value?.payload ??
    value?.data;

  /*
   * Prefer the nested event type when Xplor's
   * INT sender wraps the real webhook inside
   * an outer ach.status.updated envelope.
   *
   * For the documented production structure,
   * there is no nested PayLoadType, so this
   * falls back to the top-level event.
   */
  return clean(
    outerData?.PayLoadType ??
    outerData?.PayloadType ??
    outerData?.payloadType ??
    outerData?.event ??
    outerData?.type ??
    value?.PayLoadType ??
    value?.PayloadType ??
    value?.payloadType ??
    value?.event ??
    value?.type
  );
}

export function normalizeClearentAchWebhook(
  payload: unknown
): NormalizedPaymentWebhook {
  const value = payload as any;

  /*
   * Resolve the actual ACH transaction object.
   *
   * This supports both:
   *
   * 1. Xplor's documented production webhook
   *    structure.
   *
   * 2. The additional envelope currently used
   *    by Xplor's INT manual webhook sender.
   */
  const data =
    getPayloadObject(value);

  const rawEvent =
    getRawEvent(value);

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
     * Preserve the complete original provider
     * payload for downstream audit/debugging.
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