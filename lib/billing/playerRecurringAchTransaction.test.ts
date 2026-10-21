// lib/billing/playerRecurringAchTransaction.test.ts

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const {
  prismaMock,
  txMock,
} = vi.hoisted(() => {
  const txMock = {
    playerInvoice: {
      updateMany: vi.fn(),
    },

    billingTransaction: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  };

  const prismaMock = {
    $transaction: vi.fn(),

    billingTransaction: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  };

  return {
    prismaMock,
    txMock,
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import {
  finalizeRecurringAchTransaction,
  findBlockingRecurringAchAttempt,
  reserveRecurringAchTransaction,
} from "@/lib/billing/playerRecurringAchTransaction";

describe(
  "playerRecurringAchTransaction",
  () => {
    const claimedAt =
      new Date("2026-09-18T15:00:00.000Z");

    beforeEach(() => {
      vi.clearAllMocks();

      prismaMock.$transaction.mockImplementation(
        async (callback: any) =>
          callback(txMock)
      );
    });

    describe(
      "findBlockingRecurringAchAttempt",
      () => {
        it(
          "returns no blocking attempt when none exists",
          async () => {
            prismaMock.billingTransaction.findFirst.mockResolvedValue(
              null
            );

            const result =
              await findBlockingRecurringAchAttempt(
                "invoice_1"
              );

            expect(result).toEqual({
              exists: false,
            });

            expect(
              prismaMock.billingTransaction.findFirst
            ).toHaveBeenCalledWith({
              where: {
                invoiceId:
                  "invoice_1",

                provider:
                  "CLEARENT_ACH",

                transactionType:
                  "ACH_DEBIT",

                transactionStatus: {
                  in: [
                    "SUBMITTING",
                    "PENDING",
                    "APPROVED",
                    "SETTLING",
                    "SETTLED",
                    "UNKNOWN",
                  ],
                },
              },

              orderBy: {
                createdAt:
                  "desc",
              },

              select: {
                id: true,
                providerTransactionId:
                  true,
                transactionStatus:
                  true,
              },
            });
          }
        );

        it(
          "returns the newest blocking ACH attempt",
          async () => {
            prismaMock.billingTransaction.findFirst.mockResolvedValue(
              {
                id:
                  "billing_tx_existing",

                providerTransactionId:
                  "xplor_existing",

                transactionStatus:
                  "PENDING",
              }
            );

            const result =
              await findBlockingRecurringAchAttempt(
                "invoice_1"
              );

            expect(result).toEqual({
              exists: true,

              transactionId:
                "billing_tx_existing",

              providerTransactionId:
                "xplor_existing",

              transactionStatus:
                "PENDING",
            });
          }
        );
      }
    );

    describe(
      "reserveRecurringAchTransaction",
      () => {
        it(
          "rejects reservation when the worker no longer owns the exact claim",
          async () => {
            txMock.playerInvoice.updateMany.mockResolvedValue(
              {
                count: 0,
              }
            );

            const result =
              await reserveRecurringAchTransaction({
                invoiceId:
                  "invoice_1",

                playerProfileId:
                  "player_1",

                providerReference:
                  "sc_ach_recurring_1",

                amountCents:
                  2495,

                claimedAt,
              });

            expect(result).toEqual({
              reserved: false,

              reason:
                "Recurring ACH payment claim is no longer owned by this worker.",
            });

            expect(
              txMock.playerInvoice.updateMany
            ).toHaveBeenCalledWith({
              where: {
                id:
                  "invoice_1",

                paymentProcessingAt:
                  claimedAt,
              },

              data: {
                paymentProcessingAt:
                  claimedAt,
              },
            });

            expect(
              txMock.billingTransaction.findFirst
            ).not.toHaveBeenCalled();

            expect(
              txMock.billingTransaction.create
            ).not.toHaveBeenCalled();
          }
        );

        it(
          "rejects reservation when a blocking ACH transaction already exists",
          async () => {
            txMock.playerInvoice.updateMany.mockResolvedValue(
              {
                count: 1,
              }
            );

            txMock.billingTransaction.findFirst.mockResolvedValue(
              {
                id:
                  "billing_tx_existing",

                providerTransactionId:
                  "xplor_existing",

                transactionStatus:
                  "SUBMITTING",
              }
            );

            const result =
              await reserveRecurringAchTransaction({
                invoiceId:
                  "invoice_1",

                playerProfileId:
                  "player_1",

                providerReference:
                  "sc_ach_recurring_1",

                amountCents:
                  2495,

                claimedAt,
              });

            expect(result).toEqual({
              reserved: false,

              reason:
                "Recurring ACH debit is already protected by transaction status SUBMITTING.",

              existingTransactionId:
                "billing_tx_existing",

              existingProviderTransactionId:
                "xplor_existing",

              existingTransactionStatus:
                "SUBMITTING",
            });

            expect(
              txMock.billingTransaction.create
            ).not.toHaveBeenCalled();
          }
        );

        it(
          "creates a durable SUBMITTING reservation after claim ownership is confirmed",
          async () => {
            txMock.playerInvoice.updateMany.mockResolvedValue(
              {
                count: 1,
              }
            );

            txMock.billingTransaction.findFirst.mockResolvedValue(
              null
            );

            txMock.billingTransaction.create.mockResolvedValue(
              {
                id:
                  "billing_tx_new",

                transactionStatus:
                  "SUBMITTING",
              }
            );

            const result =
              await reserveRecurringAchTransaction({
                invoiceId:
                  "invoice_1",

                playerProfileId:
                  "player_1",

                providerReference:
                  "sc_ach_recurring_1",

                amountCents:
                  2495,

                claimedAt,
              });

            expect(result).toEqual({
              reserved: true,

              transaction: {
                id:
                  "billing_tx_new",

                transactionStatus:
                  "SUBMITTING",
              },
            });

            expect(
              txMock.billingTransaction.create
            ).toHaveBeenCalledWith({
              data: {
                invoiceId:
                  "invoice_1",

                playerProfileId:
                  "player_1",

                provider:
                  "CLEARENT_ACH",

                transactionType:
                  "ACH_DEBIT",

                transactionStatus:
                  "SUBMITTING",

                providerTransactionId:
                  null,

                providerReference:
                  "sc_ach_recurring_1",

                amountCents:
                  2495,

                cardFeeCents:
                  0,

                responseMessage:
                  "Recurring ACH debit reserved before provider submission.",
              },

              select: {
                id: true,
                transactionStatus:
                  true,
              },
            });
          }
        );

        it(
          "checks claim ownership before checking or creating a transaction",
          async () => {
            const callOrder: string[] = [];

            txMock.playerInvoice.updateMany.mockImplementation(
              async () => {
                callOrder.push(
                  "claim"
                );

                return {
                  count: 1,
                };
              }
            );

            txMock.billingTransaction.findFirst.mockImplementation(
              async () => {
                callOrder.push(
                  "blocking"
                );

                return null;
              }
            );

            txMock.billingTransaction.create.mockImplementation(
              async () => {
                callOrder.push(
                  "reserve"
                );

                return {
                  id:
                    "billing_tx_new",

                  transactionStatus:
                    "SUBMITTING",
                };
              }
            );

            await reserveRecurringAchTransaction({
              invoiceId:
                "invoice_1",

              playerProfileId:
                "player_1",

              providerReference:
                "sc_ach_recurring_1",

              amountCents:
                2495,

              claimedAt,
            });

            expect(callOrder).toEqual([
              "claim",
              "blocking",
              "reserve",
            ]);
          }
        );
      }
    );

    describe(
      "finalizeRecurringAchTransaction",
      () => {
        it(
          "finalizes the exact reserved transaction with the Xplor result",
          async () => {
            prismaMock.billingTransaction.update.mockResolvedValue(
              {
                id:
                  "billing_tx_new",
              }
            );

            await finalizeRecurringAchTransaction({
              billingTransactionId:
                "billing_tx_new",

              result: {
                ok: true,
                skipped: false,

                invoiceNumber:
                  "sc_ach_recurring_1",

                status:
                  "PENDING",

                paymentCompleted:
                  false,

                cardFeeCents:
                  0,

                transactionId:
                  "xplor_tx_1",

                responseCode:
                  "00",

                responseMessage:
                  "Accepted",

                receiptUrl:
                  null,

                raw: {
                  accepted:
                    true,
                },
              },
            });

            expect(
              prismaMock.billingTransaction.update
            ).toHaveBeenCalledWith({
              where: {
                id:
                  "billing_tx_new",
              },

              data: {
                transactionStatus:
                  "PENDING",

                providerTransactionId:
                  "xplor_tx_1",

                responseCode:
                  "00",

                responseMessage:
                  "Accepted",

                receiptUrl:
                  null,

                rawPayload: {
                  accepted:
                    true,
                },
              },
            });
          }
        );

        it(
          "preserves UNKNOWN instead of converting an ambiguous result to FAILED",
          async () => {
            prismaMock.billingTransaction.update.mockResolvedValue(
              {
                id:
                  "billing_tx_new",
              }
            );

            await finalizeRecurringAchTransaction({
              billingTransactionId:
                "billing_tx_new",

              result: {
                ok: false,
                skipped: false,

                invoiceNumber:
                  "sc_ach_recurring_1",

                status:
                  "UNKNOWN",

                paymentCompleted:
                  false,

                cardFeeCents:
                  0,

                reason:
                  "Submission outcome is unknown.",
              },
            });

            expect(
              prismaMock.billingTransaction.update
            ).toHaveBeenCalledWith({
              where: {
                id:
                  "billing_tx_new",
              },

              data: {
                transactionStatus:
                  "UNKNOWN",

                providerTransactionId:
                  null,

                responseCode:
                  null,

                responseMessage:
                  "Submission outcome is unknown.",

                receiptUrl:
                  null,

                rawPayload:
                  undefined,
              },
            });
          }
        );
      }
    );
  }
);