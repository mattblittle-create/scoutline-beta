// lib/payments/providers/clearentAch.test.ts

import {
  describe,
  expect,
  it,
} from "vitest";

import {
  extractClearentLast4,
  extractClearentStatus,
  extractClearentTokenId,
  extractClearentTransactionId,
  normalizeAchAccountType,
  normalizeClearentAchStatus,
} from "@/lib/payments/providers/clearentAch";

describe("Clearent ACH helpers", () => {
  describe("normalizeClearentAchStatus", () => {
    it("normalizes supported ACH statuses", () => {
      expect(
        normalizeClearentAchStatus("Pending")
      ).toBe("PENDING");

      expect(
        normalizeClearentAchStatus("Approved")
      ).toBe("APPROVED");

      expect(
        normalizeClearentAchStatus("Settling")
      ).toBe("SETTLING");

      expect(
        normalizeClearentAchStatus("Settled")
      ).toBe("SETTLED");

      expect(
        normalizeClearentAchStatus("Returned")
      ).toBe("RETURNED");

      expect(
        normalizeClearentAchStatus("Chargeback")
      ).toBe("CHARGEBACK");

      expect(
        normalizeClearentAchStatus("Failed")
      ).toBe("FAILED");

      expect(
        normalizeClearentAchStatus("Voided")
      ).toBe("VOIDED");
    });

    it("returns UNKNOWN for an unrecognized status", () => {
      expect(
        normalizeClearentAchStatus(
          "something-new"
        )
      ).toBe("UNKNOWN");
    });
  });

  describe("normalizeAchAccountType", () => {
    it("normalizes checking and savings", () => {
      expect(
        normalizeAchAccountType("checking")
      ).toBe("Checking");

      expect(
        normalizeAchAccountType("Savings")
      ).toBe("Savings");
    });

    it("rejects unsupported account types", () => {
      expect(
        normalizeAchAccountType("business")
      ).toBeNull();
    });
  });

  describe("ACH response extraction", () => {
    it("extracts common transaction response fields", () => {
      const payload = {
        data: {
          status: "Approved",
          "transaction-id": "ach_txn_123",
          "token-id": "ach_2000000000000038",
          "masked-account-number":
            "******6789",
        },
      };

      expect(
        extractClearentStatus(payload)
      ).toBe("APPROVED");

      expect(
        extractClearentTransactionId(
          payload
        )
      ).toBe("ach_txn_123");

      expect(
        extractClearentTokenId(payload)
      ).toBe(
        "ach_2000000000000038"
      );

      expect(
        extractClearentLast4(payload)
      ).toBe("6789");
    });

    it("extracts Xplor hyphenated ACH response fields", () => {
      const payload = {
        id: "ach_txn_456",
        status: "Pending",
        "display-message":
          "Transaction accepted",
        "provider-transaction-id":
          "provider_789",
        "ach-token": {
          "account-number":
            "1111",
          "account-type":
            "Checking",
          "individual-name":
            "John Doe",
          "token-id":
            "1100000000000000",
        },
      };

      expect(
        extractClearentStatus(payload)
      ).toBe("PENDING");

      expect(
        extractClearentTransactionId(
          payload
        )
      ).toBe("ach_txn_456");

      expect(
        extractClearentTokenId(payload)
      ).toBe(
        "1100000000000000"
      );

      expect(
        extractClearentLast4(payload)
      ).toBe("1111");
    });

    it("returns null for missing optional fields", () => {
      expect(
        extractClearentTransactionId({})
      ).toBeNull();

      expect(
        extractClearentTokenId({})
      ).toBeNull();

      expect(
        extractClearentLast4({})
      ).toBeNull();

      expect(
        extractClearentStatus({})
      ).toBe("UNKNOWN");
    });
  });
});