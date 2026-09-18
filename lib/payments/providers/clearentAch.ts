// lib/payments/providers/clearentAch.ts

import type {
  AchAccountType,
  AchStandardEntryClassCode,
  AchTransactionStatus,
} from "@/lib/payments/types";

export type ClearentAchEnvironment = {
  baseUrl: string;
  apiKey: string;
  standardEntryClassCode:
    AchStandardEntryClassCode;
  softwareType: string;
  softwareTypeVersion: string;
};

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function firstString(
  ...values: unknown[]
): string {
  for (const value of values) {
    const normalized = clean(value);

    if (normalized) {
      return normalized;
    }
  }

  return "";
}

export function getClearentAchEnvironment():
  ClearentAchEnvironment {
  const baseUrl = clean(
    process.env.CLEARENT_GATEWAY_URL ||
      process.env.XPLOR_GATEWAY_URL ||
      "https://gateway-int.clearent.net"
  ).replace(/\/+$/, "");

  const apiKey = clean(
    process.env.CLEARENT_API_KEY ||
      process.env.XPLOR_API_KEY
  );

  const rawSecCode = clean(
    process.env.CLEARENT_ACH_SEC_CODE ||
      process.env.XPLOR_ACH_SEC_CODE ||
      "PPD"
  ).toUpperCase();

  const standardEntryClassCode:
    AchStandardEntryClassCode =
    rawSecCode === "WEB" ? "WEB" : "PPD";

  const softwareType =
    clean(
      process.env.CLEARENT_SOFTWARE_TYPE ||
        process.env.XPLOR_SOFTWARE_TYPE
    ) || "ScoutLine";

  const softwareTypeVersion =
    clean(
      process.env.CLEARENT_SOFTWARE_VERSION ||
        process.env.XPLOR_SOFTWARE_VERSION
    ) || "1.0";

  return {
    baseUrl,
    apiKey,
    standardEntryClassCode,
    softwareType,
    softwareTypeVersion,
  };
}

export function normalizeAchAccountType(
  value: unknown
): AchAccountType | null {
  const normalized = clean(value).toLowerCase();

  if (
    normalized === "checking" ||
    normalized === "check"
  ) {
    return "Checking";
  }

  if (
    normalized === "savings" ||
    normalized === "saving"
  ) {
    return "Savings";
  }

  return null;
}

export function normalizeClearentAchStatus(
  value: unknown
): AchTransactionStatus {
  const normalized = clean(value)
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  switch (normalized) {
    case "PENDING":
      return "PENDING";

    case "APPROVED":
    case "ACCEPTED":
      return "APPROVED";

    case "SETTLING":
    case "IN_SETTLEMENT":
      return "SETTLING";

    case "SETTLED":
      return "SETTLED";

    case "RETURNED":
    case "RETURN":
      return "RETURNED";

    case "CHARGEBACK":
    case "CHARGE_BACK":
      return "CHARGEBACK";

    case "FAILED":
    case "DECLINED":
    case "REJECTED":
      return "FAILED";

    case "VOID":
    case "VOIDED":
      return "VOIDED";

    default:
      return "UNKNOWN";
  }
}

function getClearentAchTransaction(
  payload: unknown
): any {
  const value = payload as any;

  const data =
    value?.payload ??
    value?.data ??
    value?.object ??
    value;

  return (
    data?.["ach-transaction"] ??
    data?.achTransaction ??
    data?.transaction ??
    data
  );
}

export function extractClearentTransactionId(
  payload: unknown
): string | null {
  const value = payload as any;
  const transaction =
    getClearentAchTransaction(payload);

  return (
    firstString(
      transaction?.id,
      transaction?.transactionId,
      transaction?.transaction_id,
      transaction?.["transaction-id"],
      transaction?.providerTransactionId,
      transaction?.["provider-transaction-id"],
      value?.id
    ) || null
  );
}

export function extractClearentTokenId(
  payload: unknown
): string | null {
  const transaction =
    getClearentAchTransaction(payload);

  return (
    firstString(
      transaction?.tokenId,
      transaction?.token_id,
      transaction?.["token-id"],
      transaction?.token?.id,

      transaction?.achToken?.tokenId,
      transaction?.achToken?.["token-id"],

      transaction?.["ach-token"]?.tokenId,
      transaction?.["ach-token"]?.["token-id"],

      transaction?.account?.tokenId,
      transaction?.account?.["token-id"]
    ) || null
  );
}

export function extractClearentLast4(
  payload: unknown
): string | null {
  const transaction =
    getClearentAchTransaction(payload);

  const explicit = firstString(
    transaction?.last4,
    transaction?.["last-four"],
    transaction?.accountLast4,

    transaction?.account?.last4,

    transaction?.achToken?.accountNumber,
    transaction?.achToken?.["account-number"],

    transaction?.["ach-token"]?.accountNumber,
    transaction?.["ach-token"]?.["account-number"],

    transaction?.accountNumber,
    transaction?.["account-number"]
  );

  if (explicit) {
    const digits =
      explicit.replace(/\D+/g, "");

    return digits.slice(-4) || null;
  }

  const masked = firstString(
    transaction?.maskedAccountNumber,
    transaction?.masked_account_number,
    transaction?.["masked-account-number"],
    transaction?.account?.maskedAccountNumber
  );

  return masked
    ? masked.replace(/\D+/g, "").slice(-4) || null
    : null;
}

export function extractClearentStatus(
  payload: unknown
): AchTransactionStatus {
  const value = payload as any;

  const transaction =
    getClearentAchTransaction(payload);

  return normalizeClearentAchStatus(
    firstString(
      transaction?.status,
      transaction?.transactionStatus,
      transaction?.transaction_status,
      transaction?.["transaction-status"],
      transaction?.result,
      value?.status
    )
  );
}

export function extractClearentResponseMessage(
  payload: unknown
): string | null {
  const value = payload as any;

  const transaction =
    getClearentAchTransaction(payload);

  return (
    firstString(
      transaction?.displayMessage,
      transaction?.["display-message"],
      transaction?.responseMessage,
      transaction?.response_message,
      transaction?.["response-message"],
      transaction?.returnedMessage,
      transaction?.["returned-message"],
      value?.message,
      value?.error
    ) || null
  );
}

export function extractClearentResponseCode(
  payload: unknown
): string | null {
  const value = payload as any;
  const data =
    value?.payload ??
    value?.data ??
    value?.object ??
    value;

  return (
    firstString(
      data?.responseCode,
      data?.response_code,
      data?.["response-code"],
      data?.returnedCode,
      data?.["returned-code"],
      value?.code
    ) || null
  );
}