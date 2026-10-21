// lib/payments/providers/valorProvider.ts

import { chargeValorStoredToken } from "@/lib/billing/valorRecurringCharge";
import { createValorCheckout } from "@/lib/payments/providers/valorCheckout";
import {
  CreateCheckoutInput,
  CreateCheckoutResult,
  PaymentMethod,
  PaymentProvider,
  StoredPaymentChargeInput,
  StoredPaymentChargeResult,
} from "@/lib/payments/types";
import {
  PAYMENT_PROVIDER_CODE,
} from "@/lib/billing/constants";

export const valorProvider: PaymentProvider = {
  code: PAYMENT_PROVIDER_CODE.VALOR,
  method: PaymentMethod.CARD,

  async createCheckout(
    input: CreateCheckoutInput
  ): Promise<CreateCheckoutResult> {
    return createValorCheckout(input);
  },

  async chargeStoredMethod(
    input: StoredPaymentChargeInput
  ): Promise<StoredPaymentChargeResult> {
    return chargeValorStoredToken({
      token: input.token,
      invoiceNumber: input.invoiceNumber,
      amountCents: input.amountCents,
      cardFeeCents: input.cardFeeCents,
      description: input.description,
      customerName: input.customerName,
      email: input.email,
    });
  },
};