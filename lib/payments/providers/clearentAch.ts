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

export function extractClearentTransactionId(
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
      data?.id,
      data?.transactionId,
      data?.transaction_id,
      data?.["transaction-id"],
      data?.providerTransactionId,
      data?.["provider-transaction-id"],
      data?.transaction?.id,
      value?.id
    ) || null
  );
}

export function extractClearentTokenId(
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
      data?.tokenId,
      data?.token_id,
      data?.["token-id"],
      data?.token?.id,
      data?.achToken?.tokenId,
      data?.achToken?.["token-id"],
      data?.["ach-token"]?.tokenId,
      data?.["ach-token"]?.["token-id"],
      data?.account?.tokenId,
      data?.account?.["token-id"]
    ) || null
  );
}

export function extractClearentLast4(
  payload: unknown
): string | null {
  const value = payload as any;
  const data =
    value?.payload ??
    value?.data ??
    value?.object ??
    value;

  const explicit = firstString(
    data?.last4,
    data?.["last-four"],
    data?.accountLast4,
    data?.account?.last4,
    data?.achToken?.accountNumber,
    data?.achToken?.["account-number"],
    data?.["ach-token"]?.accountNumber,
    data?.["ach-token"]?.["account-number"]
  );

  if (explicit) {
    const digits = explicit.replace(/\D+/g, "");

    return digits.slice(-4) || null;
  }

  const masked = firstString(
    data?.maskedAccountNumber,
    data?.masked_account_number,
    data?.["masked-account-number"],
    data?.account?.maskedAccountNumber
  );

  return masked
    ? masked.replace(/\D+/g, "").slice(-4) || null
    : null;
}

export function extractClearentStatus(
  payload: unknown
): AchTransactionStatus {
  const value = payload as any;
  const data =
    value?.payload ??
    value?.data ??
    value?.object ??
    value;

  return normalizeClearentAchStatus(
    firstString(
      data?.status,
      data?.transactionStatus,
      data?.transaction_status,
      data?.["transaction-status"],
      data?.result,
      value?.status
    )
  );
}

export function extractClearentResponseMessage(
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
      data?.displayMessage,
      data?.["display-message"],
      data?.responseMessage,
      data?.response_message,
      data?.["response-message"],
      data?.returnedMessage,
      data?.["returned-message"],
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