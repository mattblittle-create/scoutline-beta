import { describe, expect, it } from "vitest";
import { adminDateTime, safeHostedUrl, nextPlayerInvoice } from "./adminDisplay";
describe("admin billing presentation", () => {
 it("uses the actual renewal due date and ignores terminal invoices", () => {
  const paid={status:"PAID",invoiceDate:new Date("2026-10-27T14:00Z"),dueDate:new Date("2026-10-27T14:00Z")};
  const upcoming={...paid,status:"UPCOMING",dueDate:new Date("2026-11-27T14:00Z")};
  expect(nextPlayerInvoice([paid,upcoming])?.dueDate.toISOString()).toBe("2026-11-27T14:00:00.000Z");
  expect(nextPlayerInvoice([paid])).toBeNull();
 });
 it("blocks credential-bearing hosted links without breaking receipts", () => {
  expect(safeHostedUrl("https://securelink.valorpaytech.com/?APPKEY=private")).toBeNull();
  expect(safeHostedUrl("javascript:alert(1)")).toBeNull();
  expect(safeHostedUrl("https://user:password@example.com")).toBeNull();
  expect(safeHostedUrl("https://rcpt-prod.valorpaytech.com/?id=receipt")).toContain("id=receipt");
 });
 it("labels Eastern time correctly across daylight saving changes", () => {
  expect(adminDateTime(new Date("2026-10-27T14:00:00Z"))).toContain("10:00:00 AM EDT");
  expect(adminDateTime(new Date("2026-11-27T14:00:00Z"))).toContain("9:00:00 AM EST");
 });
});
