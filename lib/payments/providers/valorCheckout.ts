// lib/payments/providers/valorCheckout.ts

import {
  CreateCheckoutInput,
  CreateCheckoutResult,
} from "@/lib/payments/types";

import { centsToDecimalString } from "@/lib/billing/money";

function getValorHostedPaymentBaseUrl() {
  const baseUrl = process.env.VALOR_HPP_BASE_URL || "";

  if (!baseUrl) {
    throw new Error("Missing VALOR_HPP_BASE_URL.");
  }

  return baseUrl;
}

function appendQueryString(baseUrl: string, params: URLSearchParams) {
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}${params.toString()}`;
}

export async function createValorCheckout(
  input: CreateCheckoutInput
): Promise<CreateCheckoutResult> {
  const appid = process.env.VALOR_APP_ID || "";
  const appkey = process.env.VALOR_APP_KEY || "";
  const epi = process.env.VALOR_EPI || "";

  if (!appid || !appkey || !epi) {
    return {
      ok: false,
      provider: "VALOR",
      reference: input.reference,
      error: "Missing Valor payment credentials.",
      code: "VALOR_CREDENTIALS_MISSING",
    };
  }

  try {
    const params = new URLSearchParams({
      appid,
      appkey,
      epi,

      txn_type: "sale",

      amount: centsToDecimalString(input.amountCents),
      invoicenumber: input.reference,
      orderdescription: input.description.slice(0, 50),

      merchant_email: "support@myscoutline.com",
      website: "https://www.myscoutline.com",

      surcharge: centsToDecimalString(input.surchargeCents),
      tax: "0.00",

      ignore_surcharge_calc: "0",
      epage: "1",

      customer_name: input.customerName,
      shipping_country: "US",

      redirect_url: input.redirectUrl,
      success_url: input.successUrl,
      failure_url: input.failureUrl,
    });

    if (input.customerEmail) {
      params.set("email", input.customerEmail);
    }

    const checkoutUrl = appendQueryString(
      getValorHostedPaymentBaseUrl(),
      params
    );

    return {
      ok: true,
      provider: "VALOR",
      checkoutUrl,
      reference: input.reference,
    };
  } catch (error) {
    return {
      ok: false,
      provider: "VALOR",
      reference: input.reference,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create Valor checkout.",
      code: "VALOR_CHECKOUT_ERROR",
    };
  }
}