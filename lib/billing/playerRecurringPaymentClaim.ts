// lib/billing/playerRecurringPaymentClaim.ts

import { prisma } from "@/lib/prisma";

/*
 * A processing claim prevents two workers from
 * submitting the same recurring payment at the
 * same time.
 *
 * Claims older than this window are considered
 * stale and may be recovered.
 */
export const PLAYER_RECURRING_CLAIM_TIMEOUT_MS =
  15 * 60 * 1000;

export type PlayerRecurringPaymentClaimResult = {
  claimed: boolean;
  claimedAt: Date | null;
  reason?: string;
};

export async function claimPlayerRecurringPayment(
  invoiceId: string
): Promise<PlayerRecurringPaymentClaimResult> {
  const claimedAt = new Date();

  const staleBefore = new Date(
    claimedAt.getTime() -
      PLAYER_RECURRING_CLAIM_TIMEOUT_MS
  );

  /*
   * This is intentionally one conditional UPDATE.
   *
   * If two workers attempt to claim the same
   * invoice concurrently, only one can update
   * paymentProcessingAt successfully.
   */
  const result =
    await prisma.playerInvoice.updateMany({
      where: {
        id: invoiceId,

        status: {
          in: [
            "UPCOMING",
            "PAST_DUE",
          ],
        },

        OR: [
          {
            paymentProcessingAt: null,
          },
          {
            paymentProcessingAt: {
              lt: staleBefore,
            },
          },
        ],
      },

      data: {
        paymentProcessingAt:
          claimedAt,
      },
    });

  if (result.count !== 1) {
    return {
      claimed: false,
      claimedAt: null,
      reason:
        "Invoice is already being processed or is no longer eligible.",
    };
  }

  return {
    claimed: true,
    claimedAt,
  };
}

export async function releasePlayerRecurringPaymentClaim(
  invoiceId: string,
  claimedAt: Date
): Promise<boolean> {
  /*
   * Only release the claim if it is still the
   * exact claim created by this worker.
   *
   * This prevents an old worker from clearing
   * a newer worker's recovered claim.
   */
  const result =
    await prisma.playerInvoice.updateMany({
      where: {
        id: invoiceId,
        paymentProcessingAt:
          claimedAt,
      },

      data: {
        paymentProcessingAt:
          null,
      },
    });

  return result.count === 1;
}