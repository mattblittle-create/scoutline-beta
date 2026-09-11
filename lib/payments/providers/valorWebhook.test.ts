// lib/payments/providers/valorWebhook.test.ts

import crypto from "node:crypto";

import {
  describe,
  expect,
  it,
} from "vitest";

import {
  isValorValidationPing,
  normalizeValorWebhook,
  verifyValorSignature,
} from "@/lib/payments/providers/valorWebhook";

describe("Valor webhook helpers", () => {
  describe("isValorValidationPing", () => {
    it("recognizes Valor event test pings", () => {
      expect(
        isValorValidationPing({
          event: "test",
          data: "Test Data",
          text: "Test",
        })
      ).toBe(true);
    });

    it("recognizes uppercase TEST fields", () => {
      expect(
        isValorValidationPing({
          test: "TEST",
        })
      ).toBe(true);
    });

    it("rejects normal payment events", () => {
      expect(
        isValorValidationPing({
          event: "transaction.completed",
        })
      ).toBe(false);
    });
  });

  describe("verifyValorSignature", () => {
    it("accepts a valid HMAC signature", () => {
      const rawBody = JSON.stringify({
        event: "transaction.completed",
        data: {
          invoicenumber: "sc_123",
        },
      });

      const timestamp = "1720000000";
      const secret = "test-webhook-secret";

      const signature = crypto
        .createHmac("sha256", secret)
        .update(rawBody + timestamp, "utf8")
        .digest("hex");

      expect(
        verifyValorSignature({
          rawBody,
          timestamp,
          signature,
          secret,
        })
      ).toBe(true);
    });

    it("rejects an invalid signature", () => {
      expect(
        verifyValorSignature({
          rawBody: '{"event":"payment"}',
          timestamp: "1720000000",
          signature: "invalid-signature",
          secret: "test-webhook-secret",
        })
      ).toBe(false);
    });
  });

  describe("normalizeValorWebhook", () => {
    it("normalizes a successful card transaction", () => {
      const payload = {
        event: "transaction.completed",
        data: {
          status: "approved",
          invoicenumber: "sc_123456",
          transaction_id: "txn_987",
          amount: 2495,
          custom_fee_amount: 75,
          payment_type: "CREDIT",
          card_brand: "VISA",
          masked_card_no: "************4242",
          receipt_url: "https://example.com/receipt",
          vault_tokenization: {
            vtToken: "vault_token_123",
          },
        },
      };

      const normalized =
        normalizeValorWebhook(payload);

      expect(normalized).toMatchObject({
        event: "TRANSACTION.COMPLETED",
        rawEvent: "transaction.completed",
        status: "APPROVED",
        approved: true,
        reference: "sc_123456",
        transactionId: "txn_987",
        providerPaymentRef: "vault_token_123",
        receiptUrl: "https://example.com/receipt",
        amount: 2495,
        surcharge: 75,
        paymentType: "CREDIT",
        brand: "VISA",
        last4: "4242",
      });

      expect(normalized.payload).toBe(payload);
    });

    it("approves response code 00 even without status text", () => {
      const normalized =
        normalizeValorWebhook({
          data: {
            response_code: "00",
            invoicenumber: "sc_code_00",
            amount: "4995",
            surcharge_fee_amount: "150",
          },
        });

      expect(normalized.approved).toBe(true);
      expect(normalized.status).toBe(
        "APPROVED"
      );
      expect(normalized.reference).toBe(
        "sc_code_00"
      );
      expect(normalized.amount).toBe(4995);
      expect(normalized.surcharge).toBe(150);
    });

    it("normalizes nested reference metadata", () => {
      const normalized =
        normalizeValorWebhook({
          eventType: "sale",
          payload: {
            reference_descriptive_data: {
              invoicenumber:
                "sc_nested_reference",
              processor_response_code: "00",
            },
            txn_id: 998877,
          },
        });

      expect(normalized.reference).toBe(
        "sc_nested_reference"
      );

      expect(normalized.transactionId).toBe(
        "998877"
      );

      expect(normalized.approved).toBe(true);
    });

    it("normalizes a failed transaction", () => {
      const normalized =
        normalizeValorWebhook({
          type: "transaction.failed",
          data: {
            status: "declined",
            invoice_no: "sc_declined",
            transactionId: "txn_declined",
            amount: 2495,
            paymentType: "CREDIT",
          },
        });

      expect(normalized.event).toBe(
        "TRANSACTION.FAILED"
      );

      expect(normalized.status).toBe(
        "DECLINED"
      );

      expect(normalized.approved).toBe(false);

      expect(normalized.reference).toBe(
        "sc_declined"
      );

      expect(normalized.transactionId).toBe(
        "txn_declined"
      );
    });

    it("returns nulls and empty strings when optional fields are absent", () => {
      const normalized =
        normalizeValorWebhook({});

      expect(normalized).toMatchObject({
        event: "",
        rawEvent: "",
        status: "",
        approved: false,
        reference: "",
        transactionId: "",
        providerPaymentRef: "",
        receiptUrl: null,
        amount: null,
        surcharge: null,
        paymentType: null,
        brand: null,
        last4: null,
      });
    });
  });
});