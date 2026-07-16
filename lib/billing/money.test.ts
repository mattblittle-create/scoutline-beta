import {
  describe,
  expect,
  it,
} from "vitest";

import {
  centsToDecimalString,
  formatUsd,
  normalizeCents,
} from "@/lib/billing/money";

describe("billing money helpers", () => {
  describe("normalizeCents", () => {
    it("returns whole cents unchanged", () => {
      expect(normalizeCents(2495)).toBe(2495);
    });

    it("rounds fractional cents", () => {
      expect(normalizeCents(24.4)).toBe(24);
      expect(normalizeCents(24.5)).toBe(25);
      expect(normalizeCents(24.6)).toBe(25);
    });

    it("supports negative values", () => {
      expect(normalizeCents(-24.6)).toBe(-25);
    });

    it("throws for non-finite values", () => {
      expect(() => normalizeCents(Number.NaN)).toThrow(
        "Money value must be a finite number."
      );

      expect(() => normalizeCents(Number.POSITIVE_INFINITY)).toThrow(
        "Money value must be a finite number."
      );
    });
  });

  describe("centsToDecimalString", () => {
    it("converts cents to two-decimal gateway strings", () => {
      expect(centsToDecimalString(2495)).toBe("24.95");
      expect(centsToDecimalString(75)).toBe("0.75");
      expect(centsToDecimalString(0)).toBe("0.00");
    });

    it("rounds before formatting", () => {
      expect(centsToDecimalString(2495.4)).toBe("24.95");
      expect(centsToDecimalString(2495.6)).toBe("24.96");
    });

    it("formats negative values", () => {
      expect(centsToDecimalString(-125)).toBe("-1.25");
    });
  });

  describe("formatUsd", () => {
    it("formats cents as US currency", () => {
      expect(formatUsd(2495)).toBe("$24.95");
      expect(formatUsd(4995)).toBe("$49.95");
      expect(formatUsd(0)).toBe("$0.00");
    });

    it("formats negative currency values", () => {
      expect(formatUsd(-125)).toBe("-$1.25");
    });
  });
});