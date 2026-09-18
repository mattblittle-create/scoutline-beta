// lib/billing/processPlayerRecurringAchPayment.test.ts

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const {
  prismaMock,
  chargeStoredPaymentMethodMock,
  claimPlayerRecurringPaymentMock,
  releasePlayerRecurringPaymentClaimMock,
  findBlockingRecurringAchAttemptMock,
  reserveRecurringAchTransactionMock,
  finalizeRecurringAchTransactionMock,
} = vi.hoisted(() => {
  return {
    prismaMock: {
      playerInvoice: {
        findUnique: vi.fn(),
      },
    },

    chargeStoredPaymentMethodMock:
      vi.fn(),

    claimPlayerRecurringPaymentMock:
      vi.fn(),

    releasePlayerRecurringPaymentClaimMock:
      vi.fn(),

    findBlockingRecurringAchAttemptMock:
      vi.fn(),

    reserveRecurringAchTransactionMock:
      vi.fn(),

    finalizeRecurringAchTransactionMock:
      vi.fn(),
  };
});

vi.mock(
  "@/lib/prisma",
  () => ({
    prisma: prismaMock,
  })
);

vi.mock(
  "@/lib/billing/chargeStoredPaymentMethod",
  () => ({
    chargeStoredPaymentMethod:
      chargeStoredPaymentMethodMock,
  })
);

vi.mock(
  "@/lib/billing/playerRecurringPaymentClaim",
  () => ({
    claimPlayerRecurringPayment:
      claimPlayerRecurringPaymentMock,

    releasePlayerRecurringPaymentClaim:
      releasePlayerRecurringPaymentClaimMock,
  })
);

vi.mock(
  "@/lib/billing/playerRecurringAchTransaction",
  () => ({
    findBlockingRecurringAchAttempt:
      findBlockingRecurringAchAttemptMock,

    reserveRecurringAchTransaction:
      reserveRecurringAchTransactionMock,

    finalizeRecurringAchTransaction:
      finalizeRecurringAchTransactionMock,
  })
);

import {
  processPlayerRecurringAchPayment,
} from "@/lib/billing/processPlayerRecurringAchPayment";

describe(
  "processPlayerRecurringAchPayment",
  () => {
    const claimedAt =
      new Date(
        "2026-09-18T14:00:00Z"
      );

    beforeEach(() => {
      vi.clearAllMocks();

      prismaMock.playerInvoice.findUnique
        .mockResolvedValue({
          id:
            "invoice_ach_1",

          playerProfileId:
            "profile_ach_1",

          externalId:
            "sc_ach_recurring_1",

          amountCents:
            2495,

          status:
            "UPCOMING",
        });

      claimPlayerRecurringPaymentMock
        .mockResolvedValue({
          claimed: true,
          claimedAt,
        });

      releasePlayerRecurringPaymentClaimMock
        .mockResolvedValue(true);

      findBlockingRecurringAchAttemptMock
        .mockResolvedValue({
          exists: false,
        });

reserveRecurringAchTransactionMock
        .mockResolvedValue({
          reserved: true,

          transaction: {
            id:
              "billing_tx_local_1",

            transactionStatus:
              "SUBMITTING",
          },
        });

      finalizeRecurringAchTransactionMock
        .mockResolvedValue({
          id:
            "billing_tx_local_1",
        });

      chargeStoredPaymentMethodMock
        .mockResolvedValue({
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
            "200",

          responseMessage:
            "Accepted",

          raw: {
            test:
              "pending",
          },
        });
    });

    it(
      "reserves the BillingTransaction before submitting the Xplor debit",
      async () => {
        const callOrder: string[] =
          [];

reserveRecurringAchTransactionMock
          .mockImplementation(
            async () => {
              callOrder.push(
                "reserve"
              );

              return {
                reserved: true,

                transaction: {
                  id:
                    "billing_tx_local_1",

                  transactionStatus:
                    "SUBMITTING",
                },
              };
            }
          );

        chargeStoredPaymentMethodMock
          .mockImplementation(
            async () => {
              callOrder.push(
                "provider"
              );

              return {
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
              };
            }
          );

        finalizeRecurringAchTransactionMock
          .mockImplementation(
            async () => {
              callOrder.push(
                "finalize"
              );

              return {
                id:
                  "billing_tx_local_1",
              };
            }
          );

        await processPlayerRecurringAchPayment({
          invoiceId:
            "invoice_ach_1",

          token:
            "ach_test_token",
        });

        expect(callOrder).toEqual([
          "reserve",
          "provider",
          "finalize",
        ]);
      }
    );

    it(
      "records a normal PENDING recurring ACH submission without treating it as paid",
      async () => {
        const result =
          await processPlayerRecurringAchPayment({
            invoiceId:
              "invoice_ach_1",

            token:
              "ach_test_token",

            customerName:
              "Test Customer",

            email:
              "test@example.com",
          });

expect(
  reserveRecurringAchTransactionMock
).toHaveBeenCalledWith({
  invoiceId:
    "invoice_ach_1",

  playerProfileId:
    "profile_ach_1",

  providerReference:
    "sc_ach_recurring_1",

  amountCents:
    2495,

  claimedAt,
});

        expect(
          chargeStoredPaymentMethodMock
        ).toHaveBeenCalledWith({
          provider:
            "CLEARENT_ACH",

          paymentType:
            "ACH",

          token:
            "ach_test_token",

          invoiceNumber:
            "sc_ach_recurring_1",

          amountCents:
            2495,

          cardFeeCents:
            0,

          description:
            "ScoutLine recurring ACH payment sc_ach_recurring_1",

          customerName:
            "Test Customer",

          email:
            "test@example.com",
        });

        expect(
          finalizeRecurringAchTransactionMock
        ).toHaveBeenCalledWith({
          billingTransactionId:
            "billing_tx_local_1",

          result:
            expect.objectContaining({
              ok:
                true,

              status:
                "PENDING",

              paymentCompleted:
                false,

              transactionId:
                "xplor_tx_1",
            }),
        });

        expect(result).toEqual(
          expect.objectContaining({
            ok:
              true,

            skipped:
              false,

            status:
              "PENDING",

            paymentCompleted:
              false,

            claimed:
              true,

            billingTransactionId:
              "billing_tx_local_1",
          })
        );

        expect(
          releasePlayerRecurringPaymentClaimMock
        ).toHaveBeenCalledWith(
          "invoice_ach_1",
          claimedAt
        );
      }
    );

    it.each([
      "SUBMITTING",
      "PENDING",
      "APPROVED",
      "SETTLING",
      "SETTLED",
      "UNKNOWN",
    ])(
      "does not call Xplor when an existing %s ACH attempt protects the invoice",
      async (
        transactionStatus
      ) => {
        findBlockingRecurringAchAttemptMock
          .mockResolvedValue({
            exists: true,

            transactionId:
              "billing_tx_existing",

            providerTransactionId:
              transactionStatus ===
              "SUBMITTING"
                ? null
                : "xplor_existing",

            transactionStatus,
          });

        const result =
          await processPlayerRecurringAchPayment({
            invoiceId:
              "invoice_ach_1",

            token:
              "ach_test_token",
          });

        expect(
          reserveRecurringAchTransactionMock
        ).not.toHaveBeenCalled();

        expect(
          chargeStoredPaymentMethodMock
        ).not.toHaveBeenCalled();

        expect(
          finalizeRecurringAchTransactionMock
        ).not.toHaveBeenCalled();

        expect(result).toEqual(
          expect.objectContaining({
            ok:
              false,

            skipped:
              true,

            claimed:
              true,

            duplicateProtected:
              true,

            billingTransactionId:
              "billing_tx_existing",
          })
        );

        if (
          transactionStatus ===
          "SUBMITTING"
        ) {
          expect(
            result.status
          ).toBe(
            "UNKNOWN"
          );
        } else {
          expect(
            result.status
          ).toBe(
            transactionStatus
          );
        }

        expect(
          releasePlayerRecurringPaymentClaimMock
        ).toHaveBeenCalledWith(
          "invoice_ach_1",
          claimedAt
        );
      }
    );

    it(
      "persists a provider UNKNOWN result and marks the attempt duplicate-protected",
      async () => {
        chargeStoredPaymentMethodMock
          .mockResolvedValue({
            ok: false,
            skipped: false,

            reason:
              "Xplor ACH submission outcome is unknown due to a network error.",

            invoiceNumber:
              "sc_ach_recurring_1",

            status:
              "UNKNOWN",

            paymentCompleted:
              false,

            cardFeeCents:
              0,
          });

        const result =
          await processPlayerRecurringAchPayment({
            invoiceId:
              "invoice_ach_1",

            token:
              "ach_test_token",
          });

        expect(
          finalizeRecurringAchTransactionMock
        ).toHaveBeenCalledWith({
          billingTransactionId:
            "billing_tx_local_1",

          result:
            expect.objectContaining({
              ok:
                false,

              status:
                "UNKNOWN",

              paymentCompleted:
                false,
            }),
        });

        expect(result).toEqual(
          expect.objectContaining({
            ok:
              false,

            status:
              "UNKNOWN",

            duplicateProtected:
              true,

            billingTransactionId:
              "billing_tx_local_1",
          })
        );

        expect(
          releasePlayerRecurringPaymentClaimMock
        ).toHaveBeenCalledWith(
          "invoice_ach_1",
          claimedAt
        );
      }
    );

    it(
      "converts an unexpected provider exception to durable UNKNOWN instead of FAILED",
      async () => {
        chargeStoredPaymentMethodMock
          .mockRejectedValue(
            new Error(
              "Unexpected provider exception"
            )
          );

        const result =
          await processPlayerRecurringAchPayment({
            invoiceId:
              "invoice_ach_1",

            token:
              "ach_test_token",
          });

        expect(
          finalizeRecurringAchTransactionMock
        ).toHaveBeenCalledWith({
          billingTransactionId:
            "billing_tx_local_1",

          result:
            expect.objectContaining({
              ok:
                false,

              status:
                "UNKNOWN",

              paymentCompleted:
                false,
            }),
        });

        expect(result).toEqual(
          expect.objectContaining({
            ok:
              false,

            status:
              "UNKNOWN",

            duplicateProtected:
              true,

            billingTransactionId:
              "billing_tx_local_1",
          })
        );

        expect(
          releasePlayerRecurringPaymentClaimMock
        ).toHaveBeenCalledWith(
          "invoice_ach_1",
          claimedAt
        );
      }
    );

    it(
      "returns UNKNOWN when Xplor responds but finalizing the SUBMITTING transaction fails",
      async () => {
        finalizeRecurringAchTransactionMock
          .mockRejectedValue(
            new Error(
              "Database write failed"
            )
          );

        const result =
          await processPlayerRecurringAchPayment({
            invoiceId:
              "invoice_ach_1",

            token:
              "ach_test_token",
          });

        expect(
          chargeStoredPaymentMethodMock
        ).toHaveBeenCalledTimes(1);

        expect(result).toEqual(
          expect.objectContaining({
            ok:
              false,

            skipped:
              false,

            status:
              "UNKNOWN",

            paymentCompleted:
              false,

            transactionId:
              "xplor_tx_1",

            duplicateProtected:
              true,

            billingTransactionId:
              "billing_tx_local_1",
          })
        );

        expect(
          releasePlayerRecurringPaymentClaimMock
        ).toHaveBeenCalledWith(
          "invoice_ach_1",
          claimedAt
        );
      }
    );

    it(
      "does not contact Xplor when another worker already owns the invoice claim",
      async () => {
        claimPlayerRecurringPaymentMock
          .mockResolvedValue({
            claimed: false,

            claimedAt:
              null,

            reason:
              "Invoice is already being processed or is no longer eligible.",
          });

        const result =
          await processPlayerRecurringAchPayment({
            invoiceId:
              "invoice_ach_1",

            token:
              "ach_test_token",
          });

        expect(
          findBlockingRecurringAchAttemptMock
        ).not.toHaveBeenCalled();

        expect(
          reserveRecurringAchTransactionMock
        ).not.toHaveBeenCalled();

        expect(
          chargeStoredPaymentMethodMock
        ).not.toHaveBeenCalled();

        expect(
          finalizeRecurringAchTransactionMock
        ).not.toHaveBeenCalled();

        expect(
          releasePlayerRecurringPaymentClaimMock
        ).not.toHaveBeenCalled();

        expect(result).toEqual(
          expect.objectContaining({
            ok:
              false,

            skipped:
              true,

            claimed:
              false,
          })
        );
      }
    );

    it(
      "does not contact Xplor when the worker loses its claim before reservation",
      async () => {
        reserveRecurringAchTransactionMock
          .mockResolvedValue({
            reserved: false,

            reason:
              "Recurring ACH payment claim is no longer owned by this worker.",
          });

        const result =
          await processPlayerRecurringAchPayment({
            invoiceId:
              "invoice_ach_1",

            token:
              "ach_test_token",
          });

        expect(
          reserveRecurringAchTransactionMock
        ).toHaveBeenCalledWith({
          invoiceId:
            "invoice_ach_1",

          playerProfileId:
            "profile_ach_1",

          providerReference:
            "sc_ach_recurring_1",

          amountCents:
            2495,

          claimedAt,
        });

        expect(
          chargeStoredPaymentMethodMock
        ).not.toHaveBeenCalled();

        expect(
          finalizeRecurringAchTransactionMock
        ).not.toHaveBeenCalled();

        expect(result).toEqual(
          expect.objectContaining({
            ok:
              false,

            skipped:
              true,

            status:
              "UNKNOWN",

            claimed:
              true,

            duplicateProtected:
              false,

            billingTransactionId:
              null,
          })
        );

        expect(
          releasePlayerRecurringPaymentClaimMock
        ).toHaveBeenCalledWith(
          "invoice_ach_1",
          claimedAt
        );
      }
    );
    
    it(
      "does not claim or contact Xplor when the invoice does not exist",
      async () => {
        prismaMock.playerInvoice.findUnique
          .mockResolvedValue(
            null
          );

        const result =
          await processPlayerRecurringAchPayment({
            invoiceId:
              "missing_invoice",

            token:
              "ach_test_token",
          });

        expect(
          claimPlayerRecurringPaymentMock
        ).not.toHaveBeenCalled();

        expect(
          chargeStoredPaymentMethodMock
        ).not.toHaveBeenCalled();

        expect(result).toEqual(
          expect.objectContaining({
            ok:
              false,

            skipped:
              true,

            claimed:
              false,

            invoiceNumber:
              "missing_invoice",
          })
        );
      }
    );
  }
);