// lib/payments/processPlayerPaymentWebhook.test.ts

import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  InvoiceStatus,
} from "@prisma/client";

import {
  PAYMENT_PROVIDER_CODE,
  PLAYER_BILLING_STATUS,
} from "@/lib/billing/constants";

/*
 * These mocks are hoisted so they are available
 * before processPlayerPaymentWebhook.ts imports
 * prisma and the billing audit helper.
 */
const {
  txMock,
  prismaMock,
  createBillingAuditLogMock,
} = vi.hoisted(() => {
const txMock = {
  billingTransaction: {
    updateMany: vi.fn(),
  },

  playerInvoice: {
    findFirst: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },

  playerProfile: {
    update: vi.fn(),
    },

    player: {
      updateMany: vi.fn(),
    },

    playerBillingProfile: {
      upsert: vi.fn(),
    },
  };

  const prismaMock = {
    $transaction: vi.fn(),
  };

  const createBillingAuditLogMock =
    vi.fn();

  return {
    txMock,
    prismaMock,
    createBillingAuditLogMock,
  };
});

vi.mock(
  "@/lib/prisma",
  () => ({
    prisma: prismaMock,
  })
);

vi.mock(
  "@/lib/billing/billingAudit",
  () => ({
    createBillingAuditLog:
      createBillingAuditLogMock,
  })
);

import {
  applyFailedPlayerPayment,
  applyFailedPlayerPaymentWithDunning,
  applySuccessfulPlayerPayment,
  getFailedInvoiceStatus,
} from "@/lib/payments/processPlayerPaymentWebhook";

describe(
  "getFailedInvoiceStatus",
  () => {
    it(
      "marks returned ACH payments past due",
      () => {
        expect(
          getFailedInvoiceStatus(
            "RETURNED"
          )
        ).toBe(
          InvoiceStatus.PAST_DUE
        );
      }
    );

    it(
      "marks chargebacks past due",
      () => {
        expect(
          getFailedInvoiceStatus(
            "CHARGEBACK"
          )
        ).toBe(
          InvoiceStatus.PAST_DUE
        );
      }
    );

    it(
      "marks failed payments past due",
      () => {
        expect(
          getFailedInvoiceStatus(
            "FAILED"
          )
        ).toBe(
          InvoiceStatus.PAST_DUE
        );
      }
    );

    it(
      "marks rejected payments past due",
      () => {
        expect(
          getFailedInvoiceStatus(
            "REJECTED_AUTHORIZATION_DECLINED"
          )
        ).toBe(
          InvoiceStatus.PAST_DUE
        );
      }
    );

    it(
      "marks voided payments void",
      () => {
        expect(
          getFailedInvoiceStatus(
            "VOIDED"
          )
        ).toBe(
          InvoiceStatus.VOID
        );

        expect(
          getFailedInvoiceStatus(
            "VOID"
          )
        ).toBe(
          InvoiceStatus.VOID
        );
      }
    );

    it(
      "normalizes whitespace and case",
      () => {
        expect(
          getFailedInvoiceStatus(
            "  returned  "
          )
        ).toBe(
          InvoiceStatus.PAST_DUE
        );

        expect(
          getFailedInvoiceStatus(
            "  voided  "
          )
        ).toBe(
          InvoiceStatus.VOID
        );
      }
    );
  }
);

describe(
  "applyFailedPlayerPayment ACH reversals",
  () => {
    beforeEach(() => {
      vi.clearAllMocks();

      prismaMock.$transaction.mockImplementation(
        async (
          callback: (
            tx: typeof txMock
          ) => unknown
        ) => {
          return callback(txMock);
        }
      );

      txMock.playerInvoice.update
        .mockResolvedValue({});

      txMock.playerInvoice.updateMany
        .mockResolvedValue({
          count: 1,
        });

      txMock.playerProfile.update
        .mockResolvedValue({});

      createBillingAuditLogMock
        .mockResolvedValue(undefined);
    });

    it(
      "reverses a settled ACH payment when it is later RETURNED",
      async () => {
        txMock.playerInvoice.findFirst
          .mockResolvedValue({
            id:
              "invoice_returned_1",

            playerProfileId:
              "profile_returned_1",

            externalId:
              "sc_ach_returned_1",

            status:
              InvoiceStatus.PAID,

            amountCents:
              2495,

            cardFeeCents:
              0,

            amountPaidCents:
              2495,

            paidAt:
              new Date(
                "2026-09-11T14:30:00Z"
              ),

            processorTransactionId:
              "xplor_tx_returned_1",

            processorResponseCode:
              "SETTLED",

            playerProfile: {
              id:
                "profile_returned_1",

              hasActivePlayerBilling:
                true,

              playerBillingStatus:
                PLAYER_BILLING_STATUS.ACTIVE,
            },
          });

        const result =
          await applyFailedPlayerPayment({
            provider:
              PAYMENT_PROVIDER_CODE.CLEARENT_ACH,

            normalized: {
              event:
                "ACH_STATUS_RETURNED",

              rawEvent:
                "ach.status.returned",

              status:
                "RETURNED",

              approved:
                false,

              reference:
                "sc_ach_returned_1",

              transactionId:
                "xplor_tx_returned_1",

              providerPaymentRef:
                "",

              receiptUrl:
                null,

              amount:
                2495,

              surcharge:
                0,

              paymentType:
                "ACH",

              brand:
                null,

              last4:
                "7890",

              payload: {
                test:
                  "returned",
              },
            },
          });

        expect(
          txMock.playerInvoice.update
        ).toHaveBeenCalledWith({
          where: {
            id:
              "invoice_returned_1",
          },

          data: {
            status:
              InvoiceStatus.PAST_DUE,

            amountPaidCents:
              0,

            paidAt:
              null,

            processorTransactionId:
              "xplor_tx_returned_1",

            processorResponseCode:
              "RETURNED",
          },
        });

        expect(
          txMock.playerInvoice.updateMany
        ).toHaveBeenCalledWith({
          where: {
            playerProfileId:
              "profile_returned_1",

            status:
              InvoiceStatus.UPCOMING,
          },

          data: {
            status:
              InvoiceStatus.VOID,
          },
        });

        expect(
          txMock.playerProfile.update
        ).toHaveBeenCalledWith({
          where: {
            id:
              "profile_returned_1",
          },

          data: {
            hasActivePlayerBilling:
              false,

            playerBillingStatus:
              PLAYER_BILLING_STATUS.PAST_DUE,
          },
        });

        expect(
          createBillingAuditLogMock
        ).toHaveBeenCalledTimes(1);

        expect(result).toEqual({
          found:
            true,

          playerProfileId:
            "profile_returned_1",

          invoiceStatus:
            InvoiceStatus.PAST_DUE,
        });
      }
    );

    it(
      "reverses a settled ACH payment when it later becomes a CHARGEBACK",
      async () => {
        txMock.playerInvoice.findFirst
          .mockResolvedValue({
            id:
              "invoice_chargeback_1",

            playerProfileId:
              "profile_chargeback_1",

            externalId:
              "sc_ach_chargeback_1",

            status:
              InvoiceStatus.PAID,

            amountCents:
              4995,

            cardFeeCents:
              0,

            amountPaidCents:
              4995,

            paidAt:
              new Date(
                "2026-09-11T14:30:00Z"
              ),

            processorTransactionId:
              "xplor_tx_chargeback_1",

            processorResponseCode:
              "SETTLED",

            playerProfile: {
              id:
                "profile_chargeback_1",

              hasActivePlayerBilling:
                true,

              playerBillingStatus:
                PLAYER_BILLING_STATUS.ACTIVE,
            },
          });

        const result =
          await applyFailedPlayerPayment({
            provider:
              PAYMENT_PROVIDER_CODE.CLEARENT_ACH,

            normalized: {
              event:
                "ACH_STATUS_CHARGEBACK",

              rawEvent:
                "ach.status.chargeback",

              status:
                "CHARGEBACK",

              approved:
                false,

              reference:
                "sc_ach_chargeback_1",

              transactionId:
                "xplor_tx_chargeback_1",

              providerPaymentRef:
                "",

              receiptUrl:
                null,

              amount:
                4995,

              surcharge:
                0,

              paymentType:
                "ACH",

              brand:
                null,

              last4:
                "7890",

              payload: {
                test:
                  "chargeback",
              },
            },
          });

        expect(
          txMock.playerInvoice.update
        ).toHaveBeenCalledWith({
          where: {
            id:
              "invoice_chargeback_1",
          },

          data: {
            status:
              InvoiceStatus.PAST_DUE,

            amountPaidCents:
              0,

            paidAt:
              null,

            processorTransactionId:
              "xplor_tx_chargeback_1",

            processorResponseCode:
              "CHARGEBACK",
          },
        });

        expect(
          txMock.playerInvoice.updateMany
        ).toHaveBeenCalledWith({
          where: {
            playerProfileId:
              "profile_chargeback_1",

            status:
              InvoiceStatus.UPCOMING,
          },

          data: {
            status:
              InvoiceStatus.VOID,
          },
        });

        expect(
          txMock.playerProfile.update
        ).toHaveBeenCalledWith({
          where: {
            id:
              "profile_chargeback_1",
          },

          data: {
            hasActivePlayerBilling:
              false,

            playerBillingStatus:
              PLAYER_BILLING_STATUS.PAST_DUE,
          },
        });

        expect(
          createBillingAuditLogMock
        ).toHaveBeenCalledTimes(1);

        expect(result).toEqual({
          found:
            true,

          playerProfileId:
            "profile_chargeback_1",

          invoiceStatus:
            InvoiceStatus.PAST_DUE,
        });
      }
    );
  }
);

describe(
  "PlayerInvoice reference lookup",
  () => {
    beforeEach(() => {
      vi.clearAllMocks();

      prismaMock.$transaction.mockImplementation(
        async (
          callback: (
            tx: typeof txMock
          ) => unknown
        ) => {
          return callback(txMock);
        }
      );

      txMock.playerInvoice.update
        .mockResolvedValue({});

      txMock.playerInvoice.updateMany
        .mockResolvedValue({
          count: 1,
        });

      txMock.playerProfile.update
        .mockResolvedValue({});

      txMock.player.updateMany
        .mockResolvedValue({
          count: 1,
        });

      txMock.playerBillingProfile.upsert
        .mockResolvedValue({});

      createBillingAuditLogMock
        .mockResolvedValue(undefined);
    });

    it(
      "finds a recurring ACH invoice by database id when externalId is null for SETTLED processing",
      async () => {
        const invoiceId =
          "invoice_recurring_ach_1";

        txMock.playerInvoice.findFirst
          .mockResolvedValueOnce({
            id: invoiceId,

            playerProfileId:
              "profile_recurring_ach_1",

            externalId: null,

            status:
              InvoiceStatus.PAID,

            cadence: "monthly",

            amountCents: 2495,
            cardFeeCents: 0,

            playerProfile: {
              id:
                "profile_recurring_ach_1",

              userId: null,

              playerPlanTier:
                "WALK_ON",

              user: null,
            },
          });

        const result =
          await applySuccessfulPlayerPayment({
            provider:
              PAYMENT_PROVIDER_CODE.CLEARENT_ACH,

            normalized: {
              event:
                "ACH_STATUS_SETTLED",

              rawEvent:
                "ach.status.settled",

              status:
                "SETTLED",

              approved: true,

              reference:
                invoiceId,

              transactionId:
                "xplor_tx_recurring_1",

              providerPaymentRef:
                "",

              receiptUrl: null,

              amount: 2495,

              surcharge: 0,

              paymentType: "ACH",

              brand: null,

              last4: "7890",

              payload: {
                test:
                  "recurring-settled",
              },
            },
          });

        expect(
          txMock.playerInvoice.findFirst
        ).toHaveBeenCalledWith({
          where: {
            OR: [
              {
                externalId:
                  invoiceId,
              },
              {
                id:
                  invoiceId,
              },
            ],
          },

          include: {
            playerProfile: {
              include: {
                user: true,
              },
            },
          },
        });

        expect(result).toEqual({
          alreadyProcessed: true,

          playerProfileId:
            "profile_recurring_ach_1",
        });
      }
    );

    it(
      "finds a recurring ACH invoice by database id when externalId is null for failed processing",
      async () => {
        const invoiceId =
          "invoice_recurring_ach_2";

        txMock.playerInvoice.findFirst
          .mockResolvedValue({
            id: invoiceId,

            playerProfileId:
              "profile_recurring_ach_2",

            externalId: null,

            status:
              InvoiceStatus.PAID,

            amountCents: 2495,
            cardFeeCents: 0,
            amountPaidCents: 2495,

            paidAt:
              new Date(
                "2026-09-18T12:00:00Z"
              ),

            processorTransactionId:
              "xplor_tx_recurring_2",

            processorResponseCode:
              "SETTLED",

            playerProfile: {
              id:
                "profile_recurring_ach_2",
            },
          });

        await applyFailedPlayerPayment({
          provider:
            PAYMENT_PROVIDER_CODE.CLEARENT_ACH,

          normalized: {
            event:
              "ACH_STATUS_RETURNED",

            rawEvent:
              "ach.status.returned",

            status:
              "RETURNED",

            approved: false,

            reference:
              invoiceId,

            transactionId:
              "xplor_tx_recurring_2",

            providerPaymentRef: "",

            receiptUrl: null,

            amount: 2495,

            surcharge: 0,

            paymentType: "ACH",

            brand: null,

            last4: "7890",

            payload: {
              test:
                "recurring-returned",
            },
          },
        });

        expect(
          txMock.playerInvoice.findFirst
        ).toHaveBeenCalledWith({
          where: {
            OR: [
              {
                externalId:
                  invoiceId,
              },
              {
                id:
                  invoiceId,
              },
            ],
          },

          include: {
            playerProfile: true,
          },
        });
      }
    );
  }
);

describe(
  "successful payment dunning cleanup",
  () => {
    beforeEach(() => {
      vi.clearAllMocks();

      prismaMock.$transaction.mockImplementation(
        async (
          callback: (
            tx: typeof txMock
          ) => unknown
        ) => {
          return callback(txMock);
        }
      );

      txMock.playerInvoice.update
        .mockResolvedValue({});

      txMock.playerInvoice.findFirst
        .mockResolvedValueOnce({
          id:
            "invoice_recurring_ach_past_due_1",

          playerProfileId:
            "profile_recurring_ach_past_due_1",

          externalId: null,

          status:
            InvoiceStatus.PAST_DUE,

          cadence:
            "monthly",

          amountCents:
            2495,

          cardFeeCents:
            0,

          amountPaidCents:
            0,

          failedAttemptCount:
            2,

          lastFailedAt:
            new Date(
              "2026-09-15T12:00:00Z"
            ),

          nextRetryAt:
            new Date(
              "2026-09-20T12:00:00Z"
            ),

          failureReason:
            "Previous ACH payment failed.",

          paymentProcessingAt:
            new Date(
              "2026-09-18T12:00:00Z"
            ),

          hostedUrl:
            null,

          processorReceiptUrl:
            null,

          processorTransactionId:
            null,

          processorResponseCode:
            null,

          playerProfile: {
            id:
              "profile_recurring_ach_past_due_1",

            userId:
              null,

            playerPlanTier:
              "WALK_ON",

            user:
              null,
          },
        });

      /*
       * applySuccessfulPlayerPayment checks for an
       * existing future invoice after marking the
       * settled invoice paid. Return one so this
       * regression test stays focused on clearing
       * stale dunning state.
       */
      txMock.playerInvoice.findFirst
        .mockResolvedValueOnce({
          id:
            "invoice_existing_upcoming_1",
        });

      txMock.playerProfile.update
        .mockResolvedValue({});

      txMock.player.updateMany
        .mockResolvedValue({
          count: 0,
        });

      txMock.playerBillingProfile.upsert
        .mockResolvedValue({});

      createBillingAuditLogMock
        .mockResolvedValue(undefined);
    });

    it(
      "clears stale dunning and processing state when a past-due recurring ACH invoice settles",
      async () => {
        const invoiceId =
          "invoice_recurring_ach_past_due_1";

        const result =
          await applySuccessfulPlayerPayment({
            provider:
              PAYMENT_PROVIDER_CODE.CLEARENT_ACH,

            normalized: {
              event:
                "ACH_STATUS_SETTLED",

              rawEvent:
                "ach.status.settled",

              status:
                "SETTLED",

              approved:
                true,

              reference:
                invoiceId,

              transactionId:
                "xplor_tx_recurring_settled_1",

              providerPaymentRef:
                "",

              receiptUrl:
                null,

              amount:
                2495,

              surcharge:
                0,

              paymentType:
                "ACH",

              brand:
                null,

              last4:
                "7890",

              payload: {
                test:
                  "past-due-recurring-settled",
              },
            },
          });

        expect(
          txMock.playerInvoice.update
        ).toHaveBeenCalledWith({
          where: {
            id:
              invoiceId,
          },

          data: {
            status:
              InvoiceStatus.PAID,

            amountPaidCents:
              2495,

            cardFeeCents:
              0,

            paidAt:
              expect.any(Date),

            failedAttemptCount:
              0,

            lastFailedAt:
              null,

            nextRetryAt:
              null,

            failureReason:
              null,

            paymentProcessingAt:
              null,

            hostedUrl:
              null,

            processorReceiptUrl:
              null,

            processorTransactionId:
              "xplor_tx_recurring_settled_1",

            processorResponseCode:
              "SETTLED",
          },
        });

        expect(
          txMock.playerProfile.update
        ).toHaveBeenCalledWith({
          where: {
            id:
              "profile_recurring_ach_past_due_1",
          },

          data: {
            hasActivePlayerBilling:
              true,

            billingConflictFlag:
              false,

            playerBillingStatus:
              PLAYER_BILLING_STATUS.ACTIVE,

            playerBillingCadence:
              "monthly",

            playerPlanTier:
              "WALK_ON",

            playerCancelRequestedAt:
              null,

            playerCancelEffectiveAt:
              null,

            profileState:
              "PLAYER_OWNED_ACTIVE",
          },
        });

        expect(result).toEqual({
          alreadyProcessed:
            false,

          playerProfileId:
            "profile_recurring_ach_past_due_1",
        });
      }
    );
  }
);

describe("failed recurring ACH webhook dunning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applies dunning once when an ACH transaction first transitions to FAILED", async () => {
    const invoice = {
      id: "invoice_ach_failed_1",
      externalId: null,
      playerProfileId: "player_ach_failed_1",
      status: "UPCOMING",
      amountCents: 2495,
      amountPaidCents: 0,
      cardFeeCents: 0,
      failedAttemptCount: 0,
      lastFailedAt: null,
      nextRetryAt: null,
      failureReason: null,
      paidAt: null,
      paymentProcessingAt: null,
      processorTransactionId: null,
      processorResponseCode: null,
      playerProfile: {
        id: "player_ach_failed_1",
      },
    };

    txMock.billingTransaction.updateMany.mockResolvedValue({
      count: 1,
    });

    txMock.playerInvoice.findFirst.mockResolvedValue(
      invoice
    );

    txMock.playerInvoice.update.mockResolvedValue({
      ...invoice,
      status: "PAST_DUE",
      failedAttemptCount: 1,
    });

    txMock.playerProfile.update.mockResolvedValue({
      id: invoice.playerProfileId,
    });

    const result =
      await applyFailedPlayerPaymentWithDunning({
        provider: PAYMENT_PROVIDER_CODE.CLEARENT_ACH,

        billingTransactionId:
          "billing_tx_ach_failed_1",

        rawPayload: {
          PayLoadType:
            "ach-transaction",
        },

        normalized: {
          rawEvent: "ach-transaction",
          status: "FAILED",
          transactionId:
            "provider_tx_ach_failed_1",
          reference:
            invoice.id,
          amount: 24.95,
          paymentType: "ACH",
          payload: {
            transaction_id:
              "provider_tx_ach_failed_1",
            previous_status:
              "PENDING",
            new_status:
              "FAILED",
            amount: 24.95,
          },
        },
      });

    expect(
      txMock.billingTransaction.updateMany
    ).toHaveBeenCalledTimes(1);

    expect(
      txMock.billingTransaction.updateMany
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id:
            "billing_tx_ach_failed_1",
          provider:
            PAYMENT_PROVIDER_CODE.CLEARENT_ACH,
          transactionStatus: {
            not: "FAILED",
          },
        }),
      })
    );

    expect(
      txMock.playerInvoice.update
    ).toHaveBeenCalledTimes(1);

    const invoiceUpdate =
      txMock.playerInvoice.update.mock.calls[0][0];

    expect(
      invoiceUpdate.data.status
    ).toBe("PAST_DUE");

    expect(
      invoiceUpdate.data.failedAttemptCount
    ).toBe(1);

    expect(
      invoiceUpdate.data.lastFailedAt
    ).toBeInstanceOf(Date);

    expect(
      invoiceUpdate.data.nextRetryAt
    ).toBeInstanceOf(Date);

    expect(
      invoiceUpdate.data.nextRetryAt.getTime() -
        invoiceUpdate.data.lastFailedAt.getTime()
    ).toBe(
      3 * 24 * 60 * 60 * 1000
    );

    expect(
      invoiceUpdate.data.failureReason
    ).toBe("FAILED");

    expect(
      invoiceUpdate.data.paymentProcessingAt
    ).toBeNull();

    expect(
      txMock.playerProfile.update
    ).toHaveBeenCalledWith({
      where: {
        id:
          invoice.playerProfileId,
      },

      data: {
        hasActivePlayerBilling:
          true,

        playerBillingStatus:
          PLAYER_BILLING_STATUS.PAST_DUE,
      },
    });

    expect(result).toEqual(
      expect.objectContaining({
        alreadyProcessed:
          false,
        dunningApplied:
          true,
        playerProfileId:
          invoice.playerProfileId,
        invoiceStatus:
          "PAST_DUE",
        failedAttemptCount:
          1,
        suspended:
          false,
      })
    );
  });

  it("does not apply dunning again when a FAILED ACH webhook is replayed", async () => {
    txMock.billingTransaction.updateMany.mockResolvedValue({
      count: 0,
    });

    const result =
      await applyFailedPlayerPaymentWithDunning({
        provider: PAYMENT_PROVIDER_CODE.CLEARENT_ACH,

        billingTransactionId:
          "billing_tx_ach_failed_replay",

        rawPayload: {
          PayLoadType:
            "ach-transaction",
        },

        normalized: {
          rawEvent: "ach-transaction",
          status: "FAILED",
          transactionId:
            "provider_tx_ach_failed_replay",
          reference:
            "invoice_ach_failed_replay",
          amount: 24.95,
          paymentType: "ACH",
          payload: {
            transaction_id:
              "provider_tx_ach_failed_replay",
            previous_status:
              "PENDING",
            new_status:
              "FAILED",
            amount: 24.95,
          },
        },
      });

    expect(
      txMock.billingTransaction.updateMany
    ).toHaveBeenCalledTimes(1);

    expect(
      txMock.playerInvoice.findFirst
    ).not.toHaveBeenCalled();

    expect(
      txMock.playerInvoice.update
    ).not.toHaveBeenCalled();

    expect(
      txMock.playerProfile.update
    ).not.toHaveBeenCalled();

    expect(result).toEqual({
      alreadyProcessed:
        true,
      dunningApplied:
        false,
    });
  });
});