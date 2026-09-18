// lib/billing/calculateActivationSummary.test.ts

import {
  describe,
  expect,
  it,
} from "vitest";

import {
  ActivationSummaryError,
  calculateActivationSummary,
} from "@/lib/billing/calculateActivationSummary";

import {
  PLAYER_BILLING_CADENCE,
  PLAYER_PLAN_CODE,
} from "@/lib/billing/constants";

import {
  PaymentMethod,
} from "@/lib/payments/types";

describe(
  "calculateActivationSummary",
  () => {
    it("calculates Walk-On monthly card pricing", () => {
      const result =
        calculateActivationSummary({
          plan:
            PLAYER_PLAN_CODE.WALK_ON,
          cadence:
            PLAYER_BILLING_CADENCE.MONTHLY,
          paymentMethod:
            PaymentMethod.CARD,
        });

      expect(result).toEqual({
        plan:
          PLAYER_PLAN_CODE.WALK_ON,
        cadence:
          PLAYER_BILLING_CADENCE.MONTHLY,
        paymentMethod:
          PaymentMethod.CARD,
        basePrice: 2495,
        discountAmount: 0,
        discountedPrice: 2495,
        surchargeAmount: 75,
        finalPrice: 2570,
      });
    });

    it("calculates Walk-On monthly ACH pricing with no fee", () => {
      const result =
        calculateActivationSummary({
          plan:
            PLAYER_PLAN_CODE.WALK_ON,
          cadence:
            PLAYER_BILLING_CADENCE.MONTHLY,
          paymentMethod:
            PaymentMethod.ACH,
        });

      expect(result).toEqual({
        plan:
          PLAYER_PLAN_CODE.WALK_ON,
        cadence:
          PLAYER_BILLING_CADENCE.MONTHLY,
        paymentMethod:
          PaymentMethod.ACH,
        basePrice: 2495,
        discountAmount: 0,
        discountedPrice: 2495,
        surchargeAmount: 0,
        finalPrice: 2495,
      });
    });

    it("calculates All-American monthly card pricing", () => {
      const result =
        calculateActivationSummary({
          plan:
            PLAYER_PLAN_CODE.ALL_AMERICAN,
          cadence:
            PLAYER_BILLING_CADENCE.MONTHLY,
          paymentMethod:
            PaymentMethod.CARD,
        });

      expect(result.basePrice).toBe(
        4995
      );

      expect(
        result.surchargeAmount
      ).toBe(150);

      expect(result.finalPrice).toBe(
        5145
      );
    });

    it("calculates a half-off Walk-On card payment", () => {
      const result =
        calculateActivationSummary({
          plan:
            PLAYER_PLAN_CODE.WALK_ON,
          cadence:
            PLAYER_BILLING_CADENCE.MONTHLY,
          paymentMethod:
            PaymentMethod.CARD,
          discountCode: "HALFOFF",
        });

      expect(
        result.discountAmount
      ).toBe(1248);

      expect(
        result.discountedPrice
      ).toBe(1247);

      expect(
        result.surchargeAmount
      ).toBe(37);

      expect(result.finalPrice).toBe(
        1284
      );
    });

    it("normalizes discount-code casing and whitespace", () => {
      const result =
        calculateActivationSummary({
          plan:
            PLAYER_PLAN_CODE.ALL_AMERICAN,
          cadence:
            PLAYER_BILLING_CADENCE.MONTHLY,
          paymentMethod:
            PaymentMethod.ACH,
          discountCode:
            "  halfoff  ",
        });

      expect(
        result.discountAmount
      ).toBe(2498);

      expect(
        result.discountedPrice
      ).toBe(2497);

      expect(
        result.surchargeAmount
      ).toBe(0);

      expect(result.finalPrice).toBe(
        2497
      );
    });

    it("defaults unknown payment methods to card", () => {
      const result =
        calculateActivationSummary({
          plan:
            PLAYER_PLAN_CODE.WALK_ON,
          cadence:
            PLAYER_BILLING_CADENCE.MONTHLY,
          paymentMethod:
            "anything-else",
        });

      expect(
        result.paymentMethod
      ).toBe(PaymentMethod.CARD);

      expect(
        result.surchargeAmount
      ).toBe(75);
    });

    it("throws for an invalid plan", () => {
      expect(() =>
        calculateActivationSummary({
          plan: "INVALID",
          cadence:
            PLAYER_BILLING_CADENCE.MONTHLY,
        })
      ).toThrowError(
        new ActivationSummaryError(
          "INVALID_PLAN",
          "Invalid plan"
        )
      );
    });

    it("rejects annual cadence while underwriting restriction is active", () => {
      expect(() =>
        calculateActivationSummary({
          plan:
            PLAYER_PLAN_CODE.WALK_ON,
          cadence:
            PLAYER_BILLING_CADENCE.ANNUAL,
        })
      ).toThrowError(
        new ActivationSummaryError(
          "INVALID_CADENCE",
          "Invalid cadence"
        )
      );
    });
  }
);