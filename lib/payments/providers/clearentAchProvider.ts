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
            "Content-Type":
              "application/json",

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
    return {
      ok: false,
      skipped: true,
      reason:
        "Clearent ACH recurring charges are not wired yet.",
      invoiceNumber:
        input.invoiceNumber,
      cardFeeCents: 0,
    };
  },
};