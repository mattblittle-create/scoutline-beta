// lib/payments/providers/clearentAchProvider.ts

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

export const clearentAchProvider: PaymentProvider = {
  code:
    PAYMENT_PROVIDER_CODE.CLEARENT_ACH,
  method: PaymentMethod.ACH,

  async createCheckout(
    input: CreateCheckoutInput
  ): Promise<CreateCheckoutResult> {
    return {
      ok: false,
      provider: "CLEARENT_ACH",
      reference: input.reference,
      error:
        "ACH checkout is currently being configured. Please use credit or debit for now.",
      code: "ACH_NOT_CONFIGURED",
    };
  },

  async chargeStoredMethod(
    input: StoredPaymentChargeInput
  ): Promise<StoredPaymentChargeResult> {
    return {
      ok: false,
      skipped: true,
      reason:
        "Clearent ACH recurring charges are not configured. Integration credentials and API documentation are still required.",
      invoiceNumber: input.invoiceNumber,
      cardFeeCents: 0,
    };
  },
};