// lib/payments/providerRegistry.ts

import { clearentAchProvider } from "@/lib/payments/providers/clearentAchProvider";
import { valorProvider } from "@/lib/payments/providers/valorProvider";
import {
  PaymentMethod,
  PaymentMethodKind,
  PaymentProvider,
  PaymentProviderCode,
} from "@/lib/payments/types";
import {
  PAYMENT_PROVIDER_CODE,
} from "@/lib/billing/constants";

const providers: Record<
  PaymentProviderCode,
  PaymentProvider
> = {
  [PAYMENT_PROVIDER_CODE.VALOR]:
    valorProvider,

  [PAYMENT_PROVIDER_CODE.CLEARENT_ACH]:
    clearentAchProvider,
};

export function getPaymentProvider(
  providerCode: PaymentProviderCode
): PaymentProvider {
  const provider = providers[providerCode];

  if (!provider) {
    throw new Error(`Unsupported payment provider: ${providerCode}`);
  }

  return provider;
}

export function getPaymentProviderForMethod(
  paymentMethod: PaymentMethodKind
): PaymentProvider {
  if (paymentMethod === PaymentMethod.ACH) {
    return getPaymentProvider(
      PAYMENT_PROVIDER_CODE.CLEARENT_ACH
    );
  }

  return getPaymentProvider(
    PAYMENT_PROVIDER_CODE.VALOR
  );
}