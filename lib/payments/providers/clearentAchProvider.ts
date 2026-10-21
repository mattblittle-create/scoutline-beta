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
        "ACH requires the embedded Xplor bank-account form instead of a redirect checkout.",
      code:
        "ACH_EMBEDDED_CHECKOUT_REQUIRED",
    };
  },

  async createInitialAchDebit(
    input: InitialAchDebitInput
  ): Promise<InitialAchDebitResult> {
    const environment =
      getClearentAchEnvironment();

    if (!environment.apiKey) {
      return {
        ok: false,
        provider:
          PAYMENT_PROVIDER_CODE.CLEARENT_ACH,
        reference: input.reference,
        status: "FAILED",
        error:
          "Missing Xplor ACH API key.",
        code:
          "ACH_API_KEY_MISSING",
      };
    }

    if (!input.mobileJwt?.trim()) {
      return {
        ok: false,
        provider:
          PAYMENT_PROVIDER_CODE.CLEARENT_ACH,
        reference: input.reference,
        status: "FAILED",
        error:
          "Missing Xplor ACH mobile JWT.",
        code:
          "ACH_MOBILE_JWT_MISSING",
      };
    }

    const requestBody = {
      amount:
        centsToXplorAmount(
          input.amountCents
        ),

      type: "DEBIT",

      "individual-name":
        input.individualName,

      "account-type":
        input.accountType,

      "standard-entry-class-code":
        input.standardEntryClassCode,

      invoice:
        input.reference.slice(0, 100),

      description:
        `ScoutLine subscription ${input.reference}`,

      "software-type":
        input.softwareType,

      "software-type-version":
        input.softwareTypeVersion,

      "create-token":
        input.createToken === false
          ? "false"
          : "true",

      "validate-account": "true",

      "token-description":
        "ScoutLine recurring ACH",
    };

    let response: Response;

    try {
      response = await fetch(
        `${environment.baseUrl}/rest/v2/ach/mobile/transactions/debit`,
        {
          method: "POST",
headers: {
  Accept: "application/json",
  "Content-Type": "application/json",

  "api-key":
    environment.apiKey,

  achmobilejwt:
    input.mobileJwt.trim(),
},
          body:
            JSON.stringify(requestBody),
          cache: "no-store",
        }
      );
    } catch (error) {
      console.error(
        "CLEARENT_ACH_NETWORK_ERROR",
        error
      );

      return {
        ok: false,
        provider:
          PAYMENT_PROVIDER_CODE.CLEARENT_ACH,
        reference: input.reference,
        status: "FAILED",
        error:
          "Could not connect to Xplor ACH.",
        code:
          "ACH_NETWORK_ERROR",
      };
    }

    const payload =
      await parseResponseBody(response);

    const status =
      extractClearentStatus(payload);

    const transactionId =
      extractClearentTransactionId(
        payload
      );

    const tokenId =
      extractClearentTokenId(payload);

    const last4 =
      extractClearentLast4(payload);

    const responseCode =
      extractClearentResponseCode(
        payload
      );

    const responseMessage =
      extractClearentResponseMessage(
        payload
      );

    if (!response.ok) {
      console.error(
        "CLEARENT_ACH_DEBIT_FAILED",
        {
          httpStatus: response.status,
          responseCode,
          responseMessage,
          payload,
        }
      );

      return {
        ok: false,
        provider:
          PAYMENT_PROVIDER_CODE.CLEARENT_ACH,
        reference: input.reference,
        status:
          status === "UNKNOWN"
            ? "FAILED"
            : status,
        transactionId,
        tokenId,
        last4,
        accountType:
          input.accountType,
        individualName:
          input.individualName,
        responseCode:
          responseCode ||
          String(response.status),
        responseMessage,
        raw: payload,
        error:
          responseMessage ||
          "Xplor ACH debit failed.",
        code:
          `ACH_HTTP_${response.status}`,
      };
    }

    if (!transactionId) {
      return {
        ok: false,
        provider:
          PAYMENT_PROVIDER_CODE.CLEARENT_ACH,
        reference: input.reference,
        status,
        tokenId,
        last4,
        accountType:
          input.accountType,
        individualName:
          input.individualName,
        responseCode,
        responseMessage,
        raw: payload,
        error:
          "Xplor did not return an ACH transaction ID.",
        code:
          "ACH_TRANSACTION_ID_MISSING",
      };
    }

    return {
      ok: true,
      provider:
        PAYMENT_PROVIDER_CODE.CLEARENT_ACH,
      reference: input.reference,
      status,
      transactionId,
      tokenId,
      last4,
      accountType:
        input.accountType,
      individualName:
        input.individualName,
      responseCode,
      responseMessage,
      raw: payload,
    };
  },

async chargeStoredMethod(
  input: StoredPaymentChargeInput
): Promise<StoredPaymentChargeResult> {
  const environment =
    getClearentAchEnvironment();

  if (!environment.apiKey) {
    return {
      ok: false,
      skipped: false,
      reason:
        "Missing Xplor ACH API key.",
      invoiceNumber:
        input.invoiceNumber,
      status: "FAILED",
      paymentCompleted: false,
      cardFeeCents: 0,
    };
  }

  const token =
    String(input.token || "").trim();

  if (!token) {
    return {
      ok: false,
      skipped: false,
      reason:
        "Missing stored Xplor ACH token.",
      invoiceNumber:
        input.invoiceNumber,
      status: "FAILED",
      paymentCompleted: false,
      cardFeeCents: 0,
    };
  }

  const requestBody = {
    type: "Debit",

    amount:
      centsToXplorAmount(
        input.amountCents
      ),

    "standard-entry-class-code":
      environment.standardEntryClassCode,

    invoice:
      input.invoiceNumber.slice(0, 100),

    description:
      input.description.slice(0, 255),

    "software-type":
      environment.softwareType,

    "software-type-version":
      environment.softwareTypeVersion,

    "token-id":
      token,
  };

  let response: Response;

  try {
    response = await fetch(
      `${environment.baseUrl}/rest/v2/ach/transactions/debit`,
      {
        method: "POST",

        headers: {
          Accept: "application/json",
          "Content-Type":
            "application/json",
          "api-key":
            environment.apiKey,
        },

        body:
          JSON.stringify(requestBody),

        cache: "no-store",
      }
    );
} catch (error) {
  console.error(
    "CLEARENT_ACH_RECURRING_NETWORK_ERROR",
    error
  );

  /*
   * A network failure does NOT prove that
   * Xplor failed to receive the debit.
   *
   * The request may have reached Xplor and
   * only the response was lost. Treating this
   * as FAILED could allow an automatic retry
   * and create a duplicate bank draft.
   *
   * UNKNOWN therefore means:
   * do not automatically retry this invoice
   * until the submission has been reconciled.
   */
  return {
    ok: false,
    skipped: false,

    reason:
      "Xplor ACH submission outcome is unknown due to a network error.",

    invoiceNumber:
      input.invoiceNumber,

    status: "UNKNOWN",

    paymentCompleted: false,

    cardFeeCents: 0,
  };
}

  const payload =
    await parseResponseBody(response);

  const status =
    extractClearentStatus(payload);

  const transactionId =
    extractClearentTransactionId(
      payload
    );

  const responseCode =
    extractClearentResponseCode(
      payload
    );

  const responseMessage =
    extractClearentResponseMessage(
      payload
    );

  if (!response.ok) {
    console.error(
      "CLEARENT_ACH_RECURRING_DEBIT_FAILED",
      {
        httpStatus:
          response.status,
        responseCode,
        responseMessage,
        payload,
      }
    );

    return {
      ok: false,
      skipped: false,

      reason:
        responseMessage ||
        "Xplor recurring ACH debit failed.",

      invoiceNumber:
        input.invoiceNumber,

      status:
        status === "UNKNOWN"
          ? "FAILED"
          : status,

      paymentCompleted: false,

      cardFeeCents: 0,

      transactionId,

      responseCode:
        responseCode ||
        String(response.status),

      responseMessage,

      raw: payload,
    };
  }

if (!transactionId) {
  /*
   * Xplor returned a successful HTTP response,
   * but ScoutLine did not receive a provider
   * transaction ID.
   *
   * We cannot safely assume that no debit was
   * created. Treat the submission as UNKNOWN
   * so this invoice cannot be automatically
   * submitted again until reconciled.
   */
  return {
    ok: false,
    skipped: false,

    reason:
      "Xplor ACH submission may have been accepted, but no transaction ID was returned.",

    invoiceNumber:
      input.invoiceNumber,

    status: "UNKNOWN",

    paymentCompleted: false,

    cardFeeCents: 0,

    responseCode,
    responseMessage,

    raw: payload,
  };
}

  /*
   * ACH submission is asynchronous.
   *
   * A successful API response means Xplor accepted
   * the debit for processing. It does NOT mean the
   * customer's invoice has been paid.
   *
   * The Xplor SETTLED webhook remains authoritative
   * for payment completion.
   */
  return {
    ok: true,
    skipped: false,

    invoiceNumber:
      input.invoiceNumber,

    status,

    paymentCompleted:
      status === "SETTLED",

    amountPaidCents:
      status === "SETTLED"
        ? input.amountCents
        : undefined,

    cardFeeCents: 0,

    transactionId,

    responseCode,
    responseMessage,

    receiptUrl: null,

    raw: payload,
  };
},
};