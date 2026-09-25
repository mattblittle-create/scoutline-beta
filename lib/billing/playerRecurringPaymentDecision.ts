// lib/billing/playerRecurringPaymentDecision.ts

import type {
  StoredPaymentChargeResult,
} from "@/lib/payments/types";

type RecurringPaymentDecisionInput = {
  isAch: boolean;
  result: StoredPaymentChargeResult;
};

export type RecurringPaymentDecision = {
  shouldMarkPaid: boolean;
  shouldDun: boolean;
};

/*
 * Decide what ScoutLine should do immediately
 * after a recurring payment submission.
 *
 * CARD
 * ----
 * A successful completed Valor charge may be
 * marked paid immediately.
 *
 * A non-skipped card failure enters dunning.
 *
 * ACH
 * ---
 * ACH normally begins in an in-flight state and
 * must not be marked paid until settlement.
 *
 * PENDING / APPROVED / SETTLING:
 *   wait for settlement
 *
 * UNKNOWN:
 *   outcome is ambiguous; automatic retry and
 *   dunning are unsafe
 *
 * skipped / duplicate-protected:
 *   no payment-state change
 *
 * FAILED:
 *   Xplor definitively rejected the submission,
 *   so dunning may proceed
 *
 * SETTLED + paymentCompleted:
 *   may be marked paid immediately. The webhook
 *   lifecycle remains idempotent if settlement
 *   is also delivered asynchronously.
 */
export function getPlayerRecurringPaymentDecision(
  input: RecurringPaymentDecisionInput
): RecurringPaymentDecision {
  const {
    isAch,
    result,
  } = input;

  const shouldMarkPaid =
    result.ok === true &&
    result.paymentCompleted === true;

  const shouldDun =
    result.ok === false &&
    result.skipped === false &&
    (
      !isAch ||
      result.status === "FAILED"
    );

  return {
    shouldMarkPaid,
    shouldDun,
  };
}