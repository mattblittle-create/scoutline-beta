// lib/billing/chargeStoredPaymentMethod.ts

import { getPaymentProvider } from "@/lib/payments/providerRegistry";
import {
  PaymentProviderCode,
  StoredPaymentChargeInput,
} from "@/lib/payments/types";

type ChargeStoredPaymentMethodInput = StoredPaymentChargeInput & {
  provider?: string | null;
  paymentType?: string | null;
};

function isAchPaymentType(paymentType: string | null | undefined) {
  const normalized = String(paymentType || "")
    .trim()
    .toUpperCase();

  return (
    normalized.includes("ACH") ||
    normalized.includes("ECHECK") ||
    normalized.includes("E-CHECK") ||
    normalized.includes("CHECK")
  );
}

function resolveProviderCode(
  provider: string | null | undefined,
  paymentType: string | null | undefined
): PaymentProviderCode {
  const normalizedProvider = String(provider || "")
    .trim()
    .toUpperCase();

  if (
    normalizedProvider === "CLEARENT_ACH" ||
    normalizedProvider === "CLEARENT ACH" ||
    isAchPaymentType(paymentType)
  ) {
    return "CLEARENT_ACH";
  }

  return "VALOR";
}

export async function chargeStoredPaymentMethod(
  input: ChargeStoredPaymentMethodInput
) {
  const providerCode = resolveProviderCode(
    input.provider,
    input.paymentType
  );

  const paymentProvider = getPaymentProvider(providerCode);

  return paymentProvider.chargeStoredMethod({
    token: input.token,
    invoiceNumber: input.invoiceNumber,
    amountCents: input.amountCents,
    cardFeeCents:
      providerCode === "CLEARENT_ACH"
        ? 0
        : input.cardFeeCents,
    description: input.description,
    customerName: input.customerName,
    email: input.email,
  });
}