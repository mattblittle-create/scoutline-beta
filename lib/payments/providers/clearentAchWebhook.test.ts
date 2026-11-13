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
      "normalizes the Xplor chargeback webhook",
      () => {
        const normalized =
          normalizeClearentAchWebhook({
            PayLoadType:
              "ach.status.chargeback",

            Payload: {
              transaction_id:
                "d55b1f6d-fa0e-4074-8053-f8ca490e0456",

              new_status:
                "CHARGEBACK",

              previous_status:
                "SETTLED",

              amount:
                "11.01",

              rejection_reason_code:
                "R01",

              rejection_reason_description:
                "Insufficient Funds",

              timestamp:
                "2025-12-23T10:41:03Z",

              merchant_id:
                "6588000000994889",

              currency:
                "USD",
            },
          });

        expect(
          normalized
        ).toMatchObject({
          rawEvent:
            "ach.status.chargeback",

          event:
            "ACH.STATUS.CHARGEBACK",

          status:
            "CHARGEBACK",

          approved:
            false,

          transactionId:
            "d55b1f6d-fa0e-4074-8053-f8ca490e0456",

          amount:
            1101,

          surcharge:
            0,

          paymentType:
            "ACH",

          reference:
            "",
        });

        expect(
          normalized.payload
        ).toMatchObject({
          responseCode:
            "R01",

          responseMessage:
            "Insufficient Funds",
        });
      }
    );

    it(
      "normalizes the Xplor returned webhook",
      () => {
        const normalized =
          normalizeClearentAchWebhook({
            PayLoadType:
              "ach.status.returned",

            Payload: {
              transaction_id:
                "d55b1f6d-fa0e-4074-8053-f8ca490e0456",

              new_status:
                "RETURNED",

              previous_status:
                "CHARGEBACK",

              amount:
                "11.01",

              return_reason_code:
                "R06",

              return_reason_description:
                "Returned per ODFI Request",

              timestamp:
                "2025-12-23T10:41:03Z",

              merchant_id:
                "6588000000994889",

              currency:
                "USD",
            },
          });

        expect(
          normalized.status
        ).toBe(
          "RETURNED"
        );

        expect(
          normalized.approved
        ).toBe(false);

        expect(
          normalized.transactionId
        ).toBe(
          "d55b1f6d-fa0e-4074-8053-f8ca490e0456"
        );

        expect(
          normalized.amount
        ).toBe(1101);

        expect(
          normalized.payload
        ).toMatchObject({
          responseCode:
            "R06",

          responseMessage:
            "Returned per ODFI Request",
        });
      }
    );

    it(
      "normalizes Xplor rejected authorization declined",
      () => {
        const normalized =
          normalizeClearentAchWebhook({
            PayLoadType:
              "ach.status.rejectedauthorizationdeclined",

            Payload: {
              transaction_id:
                "d55b1f6d-fa0e-4074-8053-f8ca490e0456",

              new_status:
                "REJECTED: AUTHORIZATION DECLINED",

              previous_status:
                "RETURNED",

              amount:
                "11.01",

              rejection_reason_code:
                "R07",

              rejection_reason_description:
                "Authorization Revoked by Customer",

              timestamp:
                "2025-12-23T10:41:03Z",

              merchant_id:
                "6588000000994889",

              currency:
                "USD",
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

        expect(
          normalized.amount
        ).toBe(1101);

        expect(
          normalized.payload
        ).toMatchObject({
          responseCode:
            "R07",

          responseMessage:
            "Authorization Revoked by Customer",
        });
      }
    );

    it(
      "normalizes Xplor rejected account invalid",
      () => {
        const normalized =
          normalizeClearentAchWebhook({
            PayLoadType:
              "ach.status.rejectedaccountinvalid",

            Payload: {
              transaction_id:
                "d55b1f6d-fa0e-4074-8053-f8ca490e0456",

              new_status:
                "REJECTED: ACCOUNT IS INVALID",

              previous_status:
                "RETURNED",

              amount:
                "11.01",

              rejection_reason_code:
                "R04",

              rejection_reason_description:
                "Invalid Account Number",

              timestamp:
                "2025-12-23T10:41:03Z",

              merchant_id:
                "6588000000994889",

              currency:
                "USD",
            },
          });

        expect(
          normalized.status
        ).toBe(
          "REJECTED_ACCOUNT_IS_INVALID"
        );

        expect(
          normalized.approved
        ).toBe(false);

        expect(
          normalized.payload
        ).toMatchObject({
          responseCode:
            "R04",

          responseMessage:
            "Invalid Account Number",
        });
      }
    );

    it(
      "normalizes Xplor rejected voiding",
      () => {
        const normalized =
          normalizeClearentAchWebhook({
            PayLoadType:
              "ach.status.rejectedvoiding",

            Payload: {
              transaction_id:
                "d55b1f6d-fa0e-4074-8053-f8ca490e0456",

              new_status:
                "REJECTED: VOIDING",

              previous_status:
                "CHARGEBACK",

              amount:
                "11.01",

              rejection_reason_code:
                "",

              rejection_reason_description:
                "Testing Returned message",

              timestamp:
                "2025-12-23T10:41:03Z",

              merchant_id:
                "6588000000994889",

              currency:
                "USD",
            },
          });

        expect(
          normalized.status
        ).toBe(
          "REJECTED_VOIDING"
        );

        expect(
          normalized.approved
        ).toBe(false);

        expect(
          normalized.payload
        ).toMatchObject({
          responseCode:
            null,

          responseMessage:
            "Testing Returned message",
        });
      }
    );

    it(
      "normalizes Xplor rejected voided",
      () => {
        const normalized =
          normalizeClearentAchWebhook({
            PayLoadType:
              "ach.status.rejectedvoided",

            Payload: {
              transaction_id:
                "d55b1f6d-fa0e-4074-8053-f8ca490e0456",

              new_status:
                "REJECTED: VOIDED",

              previous_status:
                "CHARGEBACK",

              amount:
                "11.01",

              rejection_reason_code:
                "",

              rejection_reason_description:
                "Testing Returned message",

              timestamp:
                "2025-12-23T10:41:03Z",

              merchant_id:
                "6588000000994889",

              currency:
                "USD",
            },
          });

        expect(
          normalized.status
        ).toBe(
          "REJECTED_VOIDED"
        );

        expect(
          normalized.approved
        ).toBe(false);

        expect(
          normalized.payload
        ).toMatchObject({
          responseCode:
            null,

          responseMessage:
            "Testing Returned message",
        });
      }
    );

    it(
      "normalizes the Xplor settled webhook",
      () => {
        const normalized =
          normalizeClearentAchWebhook({
            PayLoadType:
              "ach.status.settled",

            Payload: {
              transaction_id:
                "0efb7431-092b-48d5-86e2-8ae7bd2ebcaa",

              new_status:
                "SETTLED",

              previous_status:
                "RETURNED",

              amount:
                "23.11",

              timestamp:
                "2026-01-08T13:05:32.9323063",

              merchant_id:
                "0000000007702147",

              currency:
                "USD",

              settlement_date:
                "2026-01-08",
            },
          });

        expect(
          normalized
        ).toMatchObject({
          rawEvent:
            "ach.status.settled",

          event:
            "ACH.STATUS.SETTLED",

          status:
            "SETTLED",

          approved:
            true,

          transactionId:
            "0efb7431-092b-48d5-86e2-8ae7bd2ebcaa",

          amount:
            2311,

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
      "uses new_status for the generic Xplor updated webhook",
      () => {
        const normalized =
          normalizeClearentAchWebhook({
            PayLoadType:
              "ach.status.updated",

            Payload: {
              transaction_id:
                "d55b1f6d-fa0e-4074-8053-f8ca490e0756",

              new_status:
                "REJECTED: VOIDING",

              previous_status:
                "RETURNED",

              amount:
                "11.01",

              timestamp:
                "2025-12-23T10:41:03Z",

              merchant_id:
                "6588000000994889",

              currency:
                "USD",
            },
          });

        expect(
          normalized.rawEvent
        ).toBe(
          "ach.status.updated"
        );

        expect(
          normalized.event
        ).toBe(
          "ACH.STATUS.UPDATED"
        );

        expect(
          normalized.status
        ).toBe(
          "REJECTED_VOIDING"
        );

        expect(
          normalized.approved
        ).toBe(false);

        expect(
          normalized.transactionId
        ).toBe(
          "d55b1f6d-fa0e-4074-8053-f8ca490e0756"
        );

        expect(
          normalized.amount
        ).toBe(1101);
      }
    );

    it(
      "ignores INT-only metadata for transaction matching",
      () => {
        const normalized =
          normalizeClearentAchWebhook({
            PayLoadType:
              "ach.status.settled",

            Payload: {
              transaction_id:
                "ach_txn_metadata_test",

              new_status:
                "SETTLED",

              previous_status:
                "PENDING",

              amount:
                "24.95",

              currency:
                "USD",
            },

            metadata: {
              environment:
                "Test",

              origin:
                "Test",

              reference:
                "dummy-int-reference",
            },
          });

        expect(
          normalized.reference
        ).toBe("");

        expect(
          normalized.transactionId
        ).toBe(
          "ach_txn_metadata_test"
        );

        expect(
          normalized.status
        ).toBe(
          "SETTLED"
        );

        expect(
          normalized.approved
        ).toBe(true);

        expect(
          normalized.amount
        ).toBe(2495);
      }
    );

    it(
      "unwraps the Xplor INT manual webhook envelope",
      () => {
        const normalized =
          normalizeClearentAchWebhook({
            PayLoadType:
              "ach.status.updated",

            Payload: {
              PayLoadType:
                "ach.status.settled",

              Payload: {
                transaction_id:
                  "int_manual_transaction_123",

                new_status:
                  "SETTLED",

                previous_status:
                  "PENDING",

                amount:
                  "24.95",

                timestamp:
                  "2026-09-17T09:05:00Z",

                merchant_id:
                  "test-merchant",

                currency:
                  "USD",

                settlement_date:
                  "2026-09-17",
              },

              metadata: {
                environment:
                  "Test",

                origin:
                  "Test",

                reference:
                  "dummy-int-reference",
              },
            },
          });

        expect(
          normalized
        ).toMatchObject({
          rawEvent:
            "ach.status.settled",

          event:
            "ACH.STATUS.SETTLED",

          status:
            "SETTLED",

          approved:
            true,

          transactionId:
            "int_manual_transaction_123",

          amount:
            2495,

          paymentType:
            "ACH",

          reference:
            "",
        });
      }
    );

    it(
      "uses the inner new_status for an INT wrapped generic updated webhook",
      () => {
        const normalized =
          normalizeClearentAchWebhook({
            PayLoadType:
              "ach.status.updated",

            Payload: {
              PayLoadType:
                "ach.status.updated",

              Payload: {
                transaction_id:
                  "int_updated_transaction_456",

                new_status:
                  "REJECTED: VOIDING",

                previous_status:
                  "RETURNED",

                amount:
                  "11.01",

                timestamp:
                  "2026-09-17T09:05:00Z",

                merchant_id:
                  "test-merchant",

                currency:
                  "USD",
              },

              metadata: {
                environment:
                  "Test",

                origin:
                  "Test",

                reference:
                  "dummy-int-reference",
              },
            },
          });

        expect(
          normalized.rawEvent
        ).toBe(
          "ach.status.updated"
        );

        expect(
          normalized.status
        ).toBe(
          "REJECTED_VOIDING"
        );

        expect(
          normalized.approved
        ).toBe(false);

        expect(
          normalized.transactionId
        ).toBe(
          "int_updated_transaction_456"
        );

        expect(
          normalized.amount
        ).toBe(1101);

        /*
         * Even though the INT envelope contains
         * metadata.reference, ScoutLine must
         * still resolve the real billing
         * reference from BillingTransaction
         * using transaction_id.
         */
        expect(
          normalized.reference
        ).toBe("");
      }
    );
  }
);