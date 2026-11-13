import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ find: vi.fn(), claim: vi.fn(), update: vi.fn(), send: vi.fn(), parent: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { notificationEmailDelivery: { findUnique: mock.find, updateMany: mock.claim, update: mock.update }, parentPlayerLink: { findFirst: mock.parent } } }));
vi.mock("resend", () => ({ Resend: class { emails = { send: mock.send }; } }));
import { deliverNotificationEmail, emailAllowed, notificationEmailContent } from "./notificationEmails";
describe("email delivery and opt out", () => {
  const row = (prefs: any = null, type = "PLAYER_PROFILE_VIEWED_BY_COACH", data: any = {}) => ({ id: "delivery", status: "PENDING", attempts: 0, nextAttemptAt: new Date(0), notification: { type, message: "Matt, a coach viewed your profile.", data, user: { id: "u", email: "u@example.test", collegeId: "c", notificationPreference: prefs } } });
  beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("RESEND_API_KEY", "fake-test-key"); mock.claim.mockResolvedValue({ count: 1 }); mock.send.mockResolvedValue({ data: { id: "sent" }, error: null }); });
  afterEach(() => vi.unstubAllEnvs());
  it("defaults to enabled and respects global and category opt-outs", () => {
    expect(emailAllowed(null, "PLAYER_PROFILE_VIEWED_BY_COACH")).toBe(true);
    expect(emailAllowed({ emailNotificationsEnabled: false }, "PLAYER_PROFILE_VIEWED_BY_COACH")).toBe(false);
    expect(emailAllowed({ instantProgramSaves: false }, "COACH_PROGRAM_SAVED")).toBe(false);
  });
  it("sends the bell wording and a login button with a safe return destination", async () => {
    mock.find.mockResolvedValue(row(null, undefined, { actionPath: "/dashboard/player" }));
    await deliverNotificationEmail("delivery");
    const [email, options] = mock.send.mock.calls[0];
    expect(email.to).toBe("u@example.test"); expect(email.html).toContain("Matt, a coach viewed your profile.");
    expect(email.html).toContain("/login?next=%2Fdashboard%2Fplayer"); expect(email.html).toContain("opt out");
    expect(options.idempotencyKey).toBe("scoutline-notification-delivery");
    expect(mock.update.mock.calls[0][0].data.status).toBe("SENT");
  });
  it("checks preferences again at send time without removing the bell", async () => {
    mock.find.mockResolvedValue(row({ emailNotificationsEnabled: false })); await deliverNotificationEmail("delivery");
    expect(mock.send).not.toHaveBeenCalled(); expect(mock.update.mock.calls[0][0].data.status).toBe("SKIPPED");
  });
  it("does not send duplicate or concurrently claimed deliveries", async () => {
    mock.find.mockResolvedValue({ ...row(), status: "SENT" }); await deliverNotificationEmail("delivery");
    mock.find.mockResolvedValue(row()); mock.claim.mockResolvedValue({ count: 0 }); await deliverNotificationEmail("delivery");
    expect(mock.send).not.toHaveBeenCalled();
  });
  it("retries provider failures without losing the delivery record", async () => {
    mock.find.mockResolvedValue(row()); mock.send.mockResolvedValue({ error: { message: "failed" } });
    await expect(deliverNotificationEmail("delivery")).rejects.toThrow("Email delivery failed");
    expect(mock.update.mock.calls[0][0].data.status).toBe("PENDING");
  });
  it("honors an opt-out while a retry is waiting", async () => {
    mock.find.mockResolvedValue({ ...row({ emailNotificationsEnabled: false }), nextAttemptAt: new Date(Date.now() + 60000) });
    await deliverNotificationEmail("delivery"); expect(mock.send).not.toHaveBeenCalled();
    expect(mock.update.mock.calls[0][0].data.status).toBe("SKIPPED");
  });
  it("does not disclose a player's activity after a parent is unlinked", async () => {
    mock.find.mockResolvedValue(row(null, undefined, { parentPlayerProfileId: "p" })); mock.parent.mockResolvedValue(null);
    await deliverNotificationEmail("delivery"); expect(mock.send).not.toHaveBeenCalled();
  });
  it("does not email a coach after they move to another program", async () => {
    mock.find.mockResolvedValue(row(null, "COACH_PROGRAM_SAVED", { collegeId: "other" }));
    await deliverNotificationEmail("delivery"); expect(mock.send).not.toHaveBeenCalled();
  });
  it("escapes message HTML and rejects external return destinations", () => {
    const content = notificationEmailContent('<script>alert("x")</script>', "//evil.example", false);
    expect(content.html).not.toContain("<script>"); expect(content.login).toContain("next=%2Faccount");
  });
});
