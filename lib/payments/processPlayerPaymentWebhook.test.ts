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
    playerInvoice: {
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },

    playerProfile: {
      update: vi.fn(),
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