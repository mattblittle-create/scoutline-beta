// lib/payments/providers/valorWebhook.ts

import crypto from "crypto";
import { getValorPaymentOutcome } from "@/lib/payments/providers/valorPaymentOutcome";
import type { NormalizedPaymentWebhook } from "@/lib/payments/types";

type VerifyValorSignatureInput = {
  rawBody: string;
  timestamp: string;
  signature: string;
  secret: string;
};

export function verifyValorSignature({
  rawBody,
  timestamp,
  signature,
  secret,
}: VerifyValorSignatureInput) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody + timestamp, "utf8")
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "utf8"),
      Buffer.from(signature, "utf8")
    );
  } catch {
    return false;
  }
}

function toUpperString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim().toUpperCase();
    }
  }

  return "";
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function toNumberOrNull(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

export function isValorValidationPing(payload: unknown) {
  const value = payload as any;

  return (
    String(value?.event || "").toLowerCase() === "test" ||
    String(value?.test || "").toUpperCase() === "TEST"
  );
}

export function normalizeValorWebhook(
  payload: unknown
): NormalizedPaymentWebhook {
  const value = payload as any;

  const rawEvent = firstString(
    value?.event,
    value?.type,
    value?.eventType
  );

  const event = toUpperString(rawEvent);

  const data = value?.data ?? value?.payload ?? value;

  const { status, approved } = getValorPaymentOutcome(payload);

  const reference = firstString(
    data?.invoice_no,
    data?.invoicenumber,
    data?.reference_descriptive_data?.invoicenumber,
    data?.invoiceNumber,
    data?.invoice,
    data?.order_id,
    data?.orderId,
    data?.merchant_reference,
    data?.merchantReference,
    data?.reference,
    value?.reference
  );

  const transactionId = firstString(
    data?.transaction_id,
    data?.transactionId,
    data?.txn_id,
    data?.txnId,
    data?.txn_id != null ? String(data.txn_id) : "",
    data?.rrn,
    data?.id,
    value?.id
  );

  const providerPaymentRef = firstString(
    data?.vault_tokenization?.vtToken,
    data?.vault_tokenization?.vault_id,
    data?.token,
    data?.payment_token,
    data?.cardToken,
    data?.card_token
  );

  const receiptUrl =
    firstString(
      data?.receipt_url,
      data?.receiptUrl,
      data?.receipt,
      data?.hostedUrl
    ) || null;

  const amount =
    toNumberOrNull(
      data?.amount,
      data?.transaction_amount,
      data?.txn_amount,
      value?.amount
    ) ?? null;

// Valor may report an added customer fee as custom_fee_amount
// or surcharge_fee_amount depending on the merchant configuration.
// Both values are expressed in cents for card transaction webhooks.
const surcharge =
  toNumberOrNull(
    data?.custom_fee_amount,
    data?.surcharge_fee_amount,
    data?.surcharge,
    data?.fee,
    data?.processing_fee,
    value?.surcharge
  ) ?? null;

  const paymentType =
    firstString(
      data?.payment_type,
      data?.paymentType,
      data?.card_type,
      data?.card_metadata?.card_type,
      data?.tender_type
    ) || null;

  const brand =
    firstString(
      data?.brand,
      data?.card_brand,
      data?.card_scheme,
      data?.cardType
    ) || null;

  const maskedCard = firstString(data?.masked_card_no);

  const last4 =
    firstString(
      data?.last4,
      data?.card_last4,
      data?.acctlast4,
      maskedCard ? maskedCard.slice(-4) : ""
    ) || null;

  return {
    event,
    rawEvent,
    status,
    approved,
    reference,
    transactionId,
    providerPaymentRef,
    receiptUrl,
    amount,
    surcharge,
    paymentType,
    brand,
    last4,
    payload,
  };
}