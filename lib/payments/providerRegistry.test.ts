// lib/payments/providerRegistry.test.ts

import {
  describe,
  expect,
  it,
} from "vitest";

import {
  PAYMENT_PROVIDER_CODE,
} from "@/lib/billing/constants";

import {
  getPaymentProvider,
  getPaymentProviderForMethod,
} from "@/lib/payments/providerRegistry";

import {
  PaymentMethod,
} from "@/lib/payments/types";

describe("payment provider registry", () => {
  describe("getPaymentProvider", () => {
    it("returns the Valor provider", () => {
      const provider = getPaymentProvider(
        PAYMENT_PROVIDER_CODE.VALOR
      );

      expect(provider.code).toBe(
        PAYMENT_PROVIDER_CODE.VALOR
      );

      expect(provider.method).toBe(
        PaymentMethod.CARD
      );
    });

    it("returns the Clearent ACH provider", () => {
      const provider = getPaymentProvider(
        PAYMENT_PROVIDER_CODE.CLEARENT_ACH
      );

      expect(provider.code).toBe(
        PAYMENT_PROVIDER_CODE.CLEARENT_ACH
      );

      expect(provider.method).toBe(
        PaymentMethod.ACH
      );
    });

    it("throws for an unsupported provider", () => {
      expect(() =>
        getPaymentProvider(
          "NOT_A_PROVIDER" as any
        )
      ).toThrow(
        "Unsupported payment provider: NOT_A_PROVIDER"
      );
    });
  });

  describe("getPaymentProviderForMethod", () => {
    it("maps card payments to Valor", () => {
      const provider =
        getPaymentProviderForMethod(
          PaymentMethod.CARD
        );

      expect(provider.code).toBe(
        PAYMENT_PROVIDER_CODE.VALOR
      );
    });

    it("maps ACH payments to Clearent ACH", () => {
      const provider =
        getPaymentProviderForMethod(
          PaymentMethod.ACH
        );

      expect(provider.code).toBe(
        PAYMENT_PROVIDER_CODE.CLEARENT_ACH
      );
    });
  });
});