// lib/payments/createCheckout.ts

import { getPaymentProviderForMethod } from "@/lib/payments/providerRegistry";
import {
  CreateCheckoutInput,
  CreateCheckoutResult,
  PaymentMethod,
  PaymentMethodKind,
} from "@/lib/payments/types";

type CreatePaymentCheckoutInput = CreateCheckoutInput & {
  paymentMethod: PaymentMethodKind;
};

export async function createPaymentCheckout(
  input: CreatePaymentCheckoutInput
): Promise<CreateCheckoutResult> {
  const provider = getPaymentProviderForMethod(input.paymentMethod);

  return provider.createCheckout({
    reference: input.reference,
    amountCents: input.amountCents,
surchargeCents:
  input.paymentMethod === PaymentMethod.ACH
    ? 0
    : input.surchargeCents,
    description: input.description,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    successUrl: input.successUrl,
    failureUrl: input.failureUrl,
    redirectUrl: input.redirectUrl,
  });
}