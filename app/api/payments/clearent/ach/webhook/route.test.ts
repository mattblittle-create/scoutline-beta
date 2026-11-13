import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(), update: vi.fn(), lookup: vi.fn(),
  success: vi.fn(), failed: vi.fn(), dunning: vi.fn(), reversed: vi.fn(), voided: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: { billingTransaction: {
  findFirst: mocks.findFirst, update: mocks.update,
} } }));
vi.mock("@/lib/payments/providers/clearentAchProvider", () => ({
  getClearentAchTransaction: mocks.lookup,
}));
vi.mock("@/lib/payments/processPlayerPaymentWebhook", () => ({
  applySuccessfulPlayerPayment: mocks.success,
  applyFailedPlayerPayment: mocks.failed,
  applyFailedPlayerPaymentWithDunning: mocks.dunning,
  applyReversedPlayerAchPayment: mocks.reversed,
  applyVoidedPlayerAchPayment: mocks.voided,
}));
import { POST } from "./route";

const local = { id: "billing-1", providerTransactionId: "xplor-1",
  providerReference: "invoice-1", amountCents: 2495, transactionStatus: "PENDING" };
const verified = { found: true, transactionId: "xplor-1", type: "DEBIT",
  invoice: "invoice-1", amount: "24.95", status: "SETTLED" };
function send(status = "SETTLED", amount: unknown = "24.95", wrapped = false) {
  const event = { PayLoadType: "ach.status.updated", Payload: {
    transaction_id: "xplor-1", new_status: status, amount,
  } };
  return POST(new NextRequest("http://localhost/api/payments/clearent/ach/webhook", {
    method: "POST", body: JSON.stringify(wrapped ? { PayLoadType: "ach.status.updated", Payload: event } : event),
  }));
}
function noWrites() {
  for (const fn of [mocks.update, mocks.success, mocks.failed, mocks.dunning, mocks.reversed, mocks.voided]) {
    expect(fn).not.toHaveBeenCalled();
  }
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  mocks.findFirst.mockResolvedValue({ ...local });
  mocks.lookup.mockResolvedValue({ ...verified });
});
describe("authenticated ACH webhook guard", () => {
  it.each([false, true])("accepts verified settlement (wrapped=%s)", async wrapped => {
    expect((await send("SETTLED", "24.95", wrapped)).status).toBe(200);
    expect(mocks.lookup).toHaveBeenCalledWith("xplor-1");
    expect(mocks.findFirst).toHaveBeenCalledWith({ where: {
      provider: "CLEARENT_ACH", providerTransactionId: "xplor-1",
    } });
    expect(mocks.success).toHaveBeenCalledWith(expect.objectContaining({
      normalized: expect.objectContaining({ reference: "invoice-1", amount: 2495 }),
    }));
  });
  it.each([
    { found: false }, { transactionId: "another" }, { invoice: "another" },
    { type: "CREDIT" }, { amount: "24.96" }, { amount: null },
    { amount: "2.495e1" }, { amount: "24.951" }, { status: null },
    { status: "PENDING" }, { status: "RETURNED" },
  ])("blocks forged, mismatched or stale state %j", async override => {
    mocks.lookup.mockResolvedValue({ ...verified, ...override });
    expect((await send()).status).toBe(503);
    noWrites();
  });
  it("blocks a forged webhook amount", async () => {
    expect((await send("SETTLED", "99.00")).status).toBe(503);
    noWrites();
  });
  it.each(["HTTP 401", "HTTP 500", "network failure", "invalid JSON"])("fails closed on %s", async reason => {
    mocks.lookup.mockRejectedValue(new Error(reason));
    expect((await send()).status).toBe(503);
    noWrites();
  });
  it("acknowledges unmatched events without lookup or writes", async () => {
    mocks.findFirst.mockResolvedValue(null);
    expect(await (await send()).json()).toEqual({ ok: true, matched: false });
    expect(mocks.lookup).not.toHaveBeenCalled();
    noWrites();
  });
  it.each([
    ["FAILED", "dunning"], ["RETURNED", "reversed"], ["CHARGEBACK", "reversed"],
    ["VOIDED", "voided"], ["PENDING", "update"], ["REJECTED: VOIDING", "failed"],
  ] as const)("dispatches verified %s", async (status, processor) => {
    mocks.lookup.mockResolvedValue({ ...verified, status });
    expect((await send(status)).status).toBe(200);
    expect(mocks[processor]).toHaveBeenCalledTimes(1);
  });
  it("does not apply a stale rejection to a settled transaction", async () => {
    mocks.findFirst.mockResolvedValue({ ...local, transactionStatus: "SETTLED" });
    mocks.lookup.mockResolvedValue({ ...verified, status: "REJECTED: VOIDING" });
    expect((await send("REJECTED: VOIDING")).status).toBe(200);
    noWrites();
  });
});
