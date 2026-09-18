// lib/payments/providers/clearentAchTransactionState.ts

const PRE_TERMINAL_ACH_STATUSES =
  new Set([
    "SUBMITTING",
    "PENDING",
    "APPROVED",
    "SETTLING",
    "UNKNOWN",
  ]);

const TERMINAL_ACH_STATUSES =
  new Set([
    "SETTLED",
    "FAILED",
    "VOIDED",
    "RETURNED",
    "CHARGEBACK",
  ]);

function normalizeStatus(
  value: unknown
): string {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

export function canUpdateClearentAchTransactionStatus(
  currentStatus: unknown,
  nextStatus: unknown
): boolean {
  const current =
    normalizeStatus(
      currentStatus
    );

  const next =
    normalizeStatus(
      nextStatus
    );

  if (
    !current ||
    !next
  ) {
    return false;
  }

  /*
   * Replaying the same provider status is safe
   * for the generic status recorder. Dedicated
   * financial processors remain responsible for
   * idempotent terminal side effects.
   */
  if (
    current === next
  ) {
    return true;
  }

  /*
   * Once ScoutLine has recorded a terminal ACH
   * state, generic/intermediate webhook updates
   * must never move the transaction backward.
   *
   * SETTLED -> RETURNED / CHARGEBACK are handled
   * separately by the dedicated reversal
   * processor and therefore are intentionally
   * not allowed through this generic helper.
   */
  if (
    TERMINAL_ACH_STATUSES.has(
      current
    )
  ) {
    return false;
  }

  /*
   * Generic provider-status recording is only
   * allowed while the transaction remains in
   * the pre-terminal lifecycle.
   *
   * Terminal transitions are handled by their
   * dedicated processors.
   */
  if (
    PRE_TERMINAL_ACH_STATUSES.has(
      current
    )
  ) {
    return (
      PRE_TERMINAL_ACH_STATUSES.has(
        next
      )
    );
  }

  return false;
}