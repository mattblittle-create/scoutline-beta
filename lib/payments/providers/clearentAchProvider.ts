// lib/payments/providers/clearentAchProvider.ts

import {
  CreateCheckoutInput,
  CreateCheckoutResult,
  InitialAchDebitInput,
  InitialAchDebitResult,
  PaymentMethod,
  PaymentProvider,
  StoredPaymentChargeInput,
  StoredPaymentChargeResult,
} from "@/lib/payments/types";

import {
  PAYMENT_PROVIDER_CODE,
} from "@/lib/billing/constants";

import {
  extractClearentLast4,
  extractClearentResponseCode,
  extractClearentResponseMessage,
  extractClearentStatus,
  extractClearentTokenId,
  extractClearentTransactionId,
  getClearentAchEnvironment,
} from "@/lib/payments/providers/clearentAch";

function centsToXplorAmount(
  amountCents: number
): string {
  if (
    !Number.isInteger(amountCents) ||
    amountCents <= 0
  ) {
    throw new Error(
      "ACH amount must be a positive integer number of cents."
    );
  }

  return (amountCents / 100).toFixed(2);
}

async function parseResponseBody(
  response: Response
): Promise<unknown> {
  const contentType =
    response.headers.get("content-type") || "";

  if (
    contentType
      .toLowerCase()
      .includes("application/json")
  ) {
    return response.json().catch(() => null);
  }

  const text =
    await response.text().catch(() => "");

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      message: text,
    };
  }
}

export type ClearentAchTransactionStatusResult = {
  found: boolean;
  transactionId: string | null;
  providerTransactionId: string | null;
  type: string | null;
  amount: string | null;
  status: string | null;
  accountType: string | null;
  invoice: string | null;
  statusChangeDate: string | null;
  traceNumber: string | null;
  settledDate: string | null;
  returnedDate: string | null;
  returnedCode: string | null;
  returnedMessage: string | null;
};

export async function getClearentAchTransaction(
  transactionId: string
): Promise<ClearentAchTransactionStatusResult> {
  const environment =
    getClearentAchEnvironment();

  const id =
    String(transactionId || "").trim();

  if (!environment.apiKey) {
    throw new Error(
      "Missing Xplor ACH API key."
    );
  }

  if (!id) {
    throw new Error(
      "Missing Xplor ACH transaction ID."
    );
  }

  const url =
    new URL(
      `${environment.baseUrl}/rest/v2/ach/transactions`
    );

  url.searchParams.set("id", id);

  const response =
    await fetch(url.toString(), {
      method: "GET",

      headers: {
        Accept: "application/json",
        "api-key":
          environment.apiKey,
      },

      cache: "no-store",
    });

  const payload =
    await parseResponseBody(response);

  if (!response.ok) {
    throw new Error(
      extractClearentResponseMessage(
        payload
      ) ||
        `Xplor ACH status lookup failed with HTTP ${response.status}.`
    );
  }

  const root =
    payload &&
    typeof payload === "object"
      ? (payload as Record<string, any>)
      : {};

  const payloadObject =
    root.payload &&
    typeof root.payload === "object"
      ? (root.payload as Record<string, any>)
      : {};

  const transactionsObject =
    payloadObject["ach-transactions"] &&
    typeof payloadObject["ach-transactions"] ===
      "object"
      ? (payloadObject[
          "ach-transactions"
        ] as Record<string, any>)
      : {};

  const transactions =
    Array.isArray(
      transactionsObject[
        "ach-transaction"
      ]
    )
      ? transactionsObject[
          "ach-transaction"
        ]
      : [];

  const transaction =
    transactions.find(
      (item: any) =>
        String(item?.id || "").trim() === id
    ) || null;

  if (!transaction) {
    return {
      found: false,
      transactionId: null,
      providerTransactionId: null,
      type: null,
      amount: null,
      status: null,
      accountType: null,
      invoice: null,
      statusChangeDate: null,
      traceNumber: null,
      settledDate: null,
      returnedDate: null,
      returnedCode: null,
      returnedMessage: null,
    };
  }

  const cleanValue = (
    value: unknown
  ): string | null => {
    const normalized =
      String(value ?? "").trim();

    return normalized || null;
  };

  return {
    found: true,

    transactionId:
      cleanValue(transaction.id),

    providerTransactionId:
      cleanValue(
        transaction[
          "provider-transaction-id"
        ]
      ),

    type:
      cleanValue(transaction.type),

    amount:
      cleanValue(transaction.amount),

    status:
      cleanValue(
        transaction.status
      )?.toUpperCase() || null,

    accountType:
      cleanValue(
        transaction["account-type"]
      )?.toUpperCase() || null,

    invoice:
      cleanValue(transaction.invoice),

    statusChangeDate:
      cleanValue(
        transaction[
          "status-change-date"
        ]
      ),

    traceNumber:
      cleanValue(
        transaction["trace-number"]
      ),

    settledDate:
      cleanValue(
        transaction["settled-date"]
      ),

    returnedDate:
      cleanValue(
        transaction["returned-date"]
      ),

    returnedCode:
      cleanValue(
        transaction["returned-code"]
      ),

    returnedMessage:
      cleanValue(
        transaction["returned-message"]
      ),
  };
}

export const clearentAchProvider:
  PaymentProvider = {
  code:
    PAYMENT_PROVIDER_CODE.CLEARENT_ACH,

  method:
    PaymentMethod.ACH,

  async createCheckout(
    input: CreateCheckoutInput
  ): Promise<CreateCheckoutResult> {
    return {
      ok: false,
      provider:
        PAYMENT_PROVIDER_CODE.CLEARENT_ACH,
      reference: input.reference,
      error:
        "Bank-account payments are no longer available. Use a debit or credit card.",
      code:
        "ACH_RETIRED",
    };
  },

  async createInitialAchDebit(input: InitialAchDebitInput): Promise<InitialAchDebitResult> {
    return { ok: false, provider: PAYMENT_PROVIDER_CODE.CLEARENT_ACH,
      reference: input.reference, status: "FAILED", code: "ACH_RETIRED",
      error: "Bank-account payments are no longer available. Use a debit or credit card." };
  },

  async chargeStoredMethod(input: StoredPaymentChargeInput): Promise<StoredPaymentChargeResult> {
    return { ok: false, skipped: true, invoiceNumber: input.invoiceNumber,
      paymentCompleted: false, reason: "ACH payments have been retired. Update the payment method to a debit or credit card." };
  },
};
