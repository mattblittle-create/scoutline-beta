// lib/payments/providers/clearentAchWebhook.test.ts

import {
  describe,
  expect,
  it,
} from "vitest";

import {
  normalizeClearentAchWebhook,
} from "@/lib/payments/providers/clearentAchWebhook";

describe(
  "normalizeClearentAchWebhook",
  () => {
    it(
      "normalizes a settled ACH webhook",
      () => {
        const normalized =
          normalizeClearentAchWebhook({
            PayLoadType:
              "ach.status.settled",

            Payload: {
              transaction_id:
                "ach_txn_123",

              new_status:
                "SETTLED",

              previous_status:
                "PENDING",

              amount:
                "24.95",

              currency:
                "USD",

              settlement_date:
                "2026-09-11",
            },
          });

        expect(
          normalized
        ).toMatchObject({
          rawEvent:
            "ach.status.settled",

          status:
            "SETTLED",

          approved:
            true,

          transactionId:
            "ach_txn_123",

          amount:
            2495,

          surcharge:
            0,

          paymentType:
            "ACH",

          reference:
            "",
        });
      }
    );

    it(
      "normalizes a returned ACH webhook",
      () => {
        const normalized =
          normalizeClearentAchWebhook({
            PayLoadType:
              "ach.status.returned",

            Payload: {
              transaction_id:
                "ach_txn_returned",

              new_status:
                "RETURNED",

              previous_status:
                "SETTLED",

              amount:
                "24.95",

              return_reason_code:
                "R01",

              return_reason_description:
                "Insufficient Funds",
            },
          });

        expect(
          normalized.status
        ).toBe("RETURNED");

        expect(
          normalized.approved
        ).toBe(false);

        expect(
          normalized.transactionId
        ).toBe(
          "ach_txn_returned"
        );

        expect(
          normalized.amount
        ).toBe(2495);
      }
    );

    it(
      "normalizes a chargeback webhook",
      () => {
        const normalized =
          normalizeClearentAchWebhook({
            PayLoadType:
              "ach.status.chargeback",

            Payload: {
              transaction_id:
                "ach_txn_chargeback",

              new_status:
                "CHARGEBACK",

              previous_status:
                "SETTLED",

              amount:
                "24.95",
            },
          });

        expect(
          normalized.status
        ).toBe(
          "CHARGEBACK"
        );

        expect(
          normalized.approved
        ).toBe(false);
      }
    );

    it(
      "normalizes rejected statuses",
      () => {
        const normalized =
          normalizeClearentAchWebhook({
            PayLoadType:
              "ach.status.rejectedauthorizationdeclined",

            Payload: {
              transaction_id:
                "ach_txn_rejected",

              new_status:
                "REJECTED: AUTHORIZATION DECLINED",

              previous_status:
                "PENDING",

              amount:
                "24.95",
            },
          });

        expect(
          normalized.status
        ).toBe(
          "REJECTED_AUTHORIZATION_DECLINED"
        );

        expect(
          normalized.approved
        ).toBe(false);
      }
    );
  }
);