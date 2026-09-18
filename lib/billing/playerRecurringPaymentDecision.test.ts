// lib/billing/playerRecurringPaymentDecision.test.ts

import {
  describe,
  expect,
  it,
} from "vitest";

import {
  getPlayerRecurringPaymentDecision,
} from "@/lib/billing/playerRecurringPaymentDecision";

describe(
  "getPlayerRecurringPaymentDecision",
  () => {
    it(
      "marks a completed Valor card payment paid without dunning",
      () => {
        const decision =
          getPlayerRecurringPaymentDecision({
            isAch: false,

            result: {
              ok: true,
              skipped: false,

              invoiceNumber:
                "invoice_card_1",

              status:
                "APPROVED",

              paymentCompleted:
                true,

              amountPaidCents:
                2570,

              cardFeeCents:
                75,
            },
          });

        expect(decision).toEqual({
          shouldMarkPaid: true,
          shouldDun: false,
        });
      }
    );

    it(
      "duns a definitive Valor card failure",
      () => {
        const decision =
          getPlayerRecurringPaymentDecision({
            isAch: false,

            result: {
              ok: false,
              skipped: false,

              invoiceNumber:
                "invoice_card_2",

              paymentCompleted:
                false,

              reason:
                "Card declined.",
            },
          });

        expect(decision).toEqual({
          shouldMarkPaid: false,
          shouldDun: true,
        });
      }
    );

    it(
      "does nothing when a Valor charge is skipped",
      () => {
        const decision =
          getPlayerRecurringPaymentDecision({
            isAch: false,

            result: {
              ok: false,
              skipped: true,

              invoiceNumber:
                "invoice_card_3",

              reason:
                "Recurring Valor charges are disabled.",
            },
          });

        expect(decision).toEqual({
          shouldMarkPaid: false,
          shouldDun: false,
        });
      }
    );

    it.each([
      "PENDING",
      "APPROVED",
      "SETTLING",
    ] as const)(
      "does not mark ACH %s paid or send it to dunning",
      (status) => {
        const decision =
          getPlayerRecurringPaymentDecision({
            isAch: true,

            result: {
              ok: true,
              skipped: false,

              invoiceNumber:
                "invoice_ach_inflight",

              status,

              paymentCompleted:
                false,

              cardFeeCents:
                0,
            },
          });

        expect(decision).toEqual({
          shouldMarkPaid: false,
          shouldDun: false,
        });
      }
    );

    it(
      "does not dun an ambiguous ACH UNKNOWN result",
      () => {
        const decision =
          getPlayerRecurringPaymentDecision({
            isAch: true,

            result: {
              ok: false,
              skipped: false,

              invoiceNumber:
                "invoice_ach_unknown",

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

        expect(decision).toEqual({
          shouldMarkPaid: false,
          shouldDun: false,
        });
      }
    );

    it(
      "does nothing for a duplicate-protected skipped ACH attempt",
      () => {
        const decision =
          getPlayerRecurringPaymentDecision({
            isAch: true,

            result: {
              ok: false,
              skipped: true,

              invoiceNumber:
                "invoice_ach_duplicate",

              status:
                "UNKNOWN",

              paymentCompleted:
                false,

              cardFeeCents:
                0,

              reason:
                "Recurring ACH debit is already protected.",
            },
          });

        expect(decision).toEqual({
          shouldMarkPaid: false,
          shouldDun: false,
        });
      }
    );

    it(
      "duns only a definitive ACH FAILED result",
      () => {
        const decision =
          getPlayerRecurringPaymentDecision({
            isAch: true,

            result: {
              ok: false,
              skipped: false,

              invoiceNumber:
                "invoice_ach_failed",

              status:
                "FAILED",

              paymentCompleted:
                false,

              cardFeeCents:
                0,

              reason:
                "ACH debit rejected.",
            },
          });

        expect(decision).toEqual({
          shouldMarkPaid: false,
          shouldDun: true,
        });
      }
    );

    it(
      "marks an immediately SETTLED ACH result paid without dunning",
      () => {
        const decision =
          getPlayerRecurringPaymentDecision({
            isAch: true,

            result: {
              ok: true,
              skipped: false,

              invoiceNumber:
                "invoice_ach_settled",

              status:
                "SETTLED",

              paymentCompleted:
                true,

              amountPaidCents:
                2495,

              cardFeeCents:
                0,

              transactionId:
                "xplor_settled_1",
            },
          });

        expect(decision).toEqual({
          shouldMarkPaid: true,
          shouldDun: false,
        });
      }
    );

    it(
      "does not mark SETTLED paid unless paymentCompleted is explicitly true",
      () => {
        const decision =
          getPlayerRecurringPaymentDecision({
            isAch: true,

            result: {
              ok: true,
              skipped: false,

              invoiceNumber:
                "invoice_ach_settled_incomplete",

              status:
                "SETTLED",

              paymentCompleted:
                false,

              cardFeeCents:
                0,
            },
          });

        expect(decision).toEqual({
          shouldMarkPaid: false,
          shouldDun: false,
        });
      }
    );

    it(
      "never marks a failed result paid even if paymentCompleted is incorrectly true",
      () => {
        const decision =
          getPlayerRecurringPaymentDecision({
            isAch: true,

            result: {
              ok: false,
              skipped: false,

              invoiceNumber:
                "invoice_ach_invalid_state",

              status:
                "FAILED",

              paymentCompleted:
                true,

              cardFeeCents:
                0,
            },
          });

        expect(decision).toEqual({
          shouldMarkPaid: false,
          shouldDun: true,
        });
      }
    );
  }
);