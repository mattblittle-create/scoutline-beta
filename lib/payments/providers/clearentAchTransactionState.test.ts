// lib/payments/providers/clearentAchTransactionState.test.ts

import {
  describe,
  expect,
  it,
} from "vitest";

import {
  canUpdateClearentAchTransactionStatus,
} from "@/lib/payments/providers/clearentAchTransactionState";

describe(
  "canUpdateClearentAchTransactionStatus",
  () => {
    it.each([
      ["SUBMITTING", "PENDING"],
      ["SUBMITTING", "APPROVED"],
      ["SUBMITTING", "SETTLING"],
      ["SUBMITTING", "UNKNOWN"],

      ["PENDING", "APPROVED"],
      ["PENDING", "SETTLING"],
      ["PENDING", "UNKNOWN"],

      ["APPROVED", "PENDING"],
      ["APPROVED", "SETTLING"],
      ["APPROVED", "UNKNOWN"],

      ["SETTLING", "PENDING"],
      ["SETTLING", "APPROVED"],
      ["SETTLING", "UNKNOWN"],

      ["UNKNOWN", "PENDING"],
      ["UNKNOWN", "APPROVED"],
      ["UNKNOWN", "SETTLING"],
    ])(
      "allows pre-terminal transition %s -> %s",
      (
        currentStatus,
        nextStatus
      ) => {
        expect(
          canUpdateClearentAchTransactionStatus(
            currentStatus,
            nextStatus
          )
        ).toBe(true);
      }
    );

    it.each([
      "SUBMITTING",
      "PENDING",
      "APPROVED",
      "SETTLING",
      "UNKNOWN",
      "SETTLED",
      "FAILED",
      "VOIDED",
      "RETURNED",
      "CHARGEBACK",
    ])(
      "allows idempotent replay of %s",
      (status) => {
        expect(
          canUpdateClearentAchTransactionStatus(
            status,
            status
          )
        ).toBe(true);
      }
    );

    it.each([
      ["SETTLED", "PENDING"],
      ["SETTLED", "APPROVED"],
      ["SETTLED", "SETTLING"],
      ["SETTLED", "UNKNOWN"],

      ["FAILED", "PENDING"],
      ["FAILED", "APPROVED"],
      ["FAILED", "SETTLING"],
      ["FAILED", "UNKNOWN"],

      ["VOIDED", "PENDING"],
      ["VOIDED", "APPROVED"],
      ["VOIDED", "SETTLING"],
      ["VOIDED", "UNKNOWN"],

      ["RETURNED", "PENDING"],
      ["RETURNED", "APPROVED"],
      ["RETURNED", "SETTLING"],
      ["RETURNED", "UNKNOWN"],

      ["CHARGEBACK", "PENDING"],
      ["CHARGEBACK", "APPROVED"],
      ["CHARGEBACK", "SETTLING"],
      ["CHARGEBACK", "UNKNOWN"],
    ])(
      "blocks stale transition %s -> %s",
      (
        currentStatus,
        nextStatus
      ) => {
        expect(
          canUpdateClearentAchTransactionStatus(
            currentStatus,
            nextStatus
          )
        ).toBe(false);
      }
    );

    it.each([
      ["PENDING", "SETTLED"],
      ["APPROVED", "FAILED"],
      ["SETTLING", "VOIDED"],
      ["UNKNOWN", "RETURNED"],
      ["PENDING", "CHARGEBACK"],
    ])(
      "does not allow terminal transitions through the generic path: %s -> %s",
      (
        currentStatus,
        nextStatus
      ) => {
        expect(
          canUpdateClearentAchTransactionStatus(
            currentStatus,
            nextStatus
          )
        ).toBe(false);
      }
    );

    it.each([
      ["", "PENDING"],
      ["PENDING", ""],
      [null, "PENDING"],
      ["PENDING", null],
      ["NOT_A_REAL_STATUS", "PENDING"],
      ["PENDING", "NOT_A_REAL_STATUS"],
    ])(
      "rejects invalid transition %s -> %s",
      (
        currentStatus,
        nextStatus
      ) => {
        expect(
          canUpdateClearentAchTransactionStatus(
            currentStatus,
            nextStatus
          )
        ).toBe(false);
      }
    );

    it(
      "normalizes whitespace and case",
      () => {
        expect(
          canUpdateClearentAchTransactionStatus(
            " pending ",
            " settling "
          )
        ).toBe(true);

        expect(
          canUpdateClearentAchTransactionStatus(
            " settled ",
            " pending "
          )
        ).toBe(false);
      }
    );
  }
);