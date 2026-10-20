import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ user: vi.fn(), profile: vi.fn(), debit: vi.fn(), checkout: vi.fn() }));
vi.mock("@/lib/auth/getCurrentUser", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/lib/prisma", () => ({ prisma: { playerProfile: { findUnique: mocks.profile } } }));
vi.mock("@prisma/client", async importOriginal => {
  const actual = await importOriginal<typeof import("@prisma/client")>();
  return { ...actual, PrismaClient: class { playerProfile = { findUnique: mocks.profile }; } };
});
vi.mock("@/lib/payments/createCheckout", () => ({ createPaymentCheckout: mocks.checkout }));
vi.mock("@/lib/payments/providerRegistry", () => ({ getPaymentProviderForMethod: () => ({ createInitialAchDebit: mocks.debit }) }));
import { POST as summary } from "@/app/api/player/billing/activation-summary/route";
import { POST as ach } from "@/app/api/payments/clearent/ach/debit/route";
import { POST as card } from "@/app/api/payments/valor/create-checkout/route";
function request(extra = {}) {
  return new NextRequest("http://localhost/test", { method: "POST", body: JSON.stringify({
    plan: "WALK_ON", cadence: "monthly", discountCode: "SCOUTLINE1TEST", paymentMethod: "card",
    playerProfileId: "test-profile", mobileJwt: "test-token", accountHolderName: "Test User", accountType: "Checking",
    ...extra,
  }) });
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.profile.mockResolvedValue({ id: "test-profile", user: { id: "owner", email: "braden.little2@gmail.com" } });
});
describe("production test discount account enforcement", () => {
  it.each([null, { id: "other", email: "other@example.com" }])("ignores spoofed quote email for %j", async user => {
    mocks.user.mockResolvedValue(user);
    expect(await (await summary(request({ accountEmail: "braden.little2@gmail.com" }))).json())
      .toMatchObject({ discountedPrice: 2495, finalPrice: 2570 });
  });
  it("quotes authorized card price with 3% fee", async () => {
    mocks.user.mockResolvedValue({ id: "owner", email: "braden.little2@gmail.com" });
    expect(await (await summary(request())).json()).toMatchObject({ discountedPrice: 100, finalPrice: 103 });
  });
  it.each([ach, card])("blocks checkout without an authorized profile owner", async handler => {
    mocks.user.mockResolvedValue({ id: "other", email: "braden.little2@gmail.com" });
    expect((await handler(request())).status).toBe(403);
    expect(mocks.debit).not.toHaveBeenCalled();
    expect(mocks.checkout).not.toHaveBeenCalled();
  });
});
