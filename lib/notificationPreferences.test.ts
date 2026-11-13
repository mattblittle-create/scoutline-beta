import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ upsert: vi.fn(), update: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { notificationPreference: mock } }));
import { getOrCreateNotificationPreference, updateNotificationPreference } from "@/app/lib/notifications/preferences";
describe("email preferences", () => {
  beforeEach(() => vi.resetAllMocks());
  it("creates missing preferences using database defaults without resetting existing choices", async () => {
    await getOrCreateNotificationPreference("u"); expect(mock.upsert.mock.calls[0][0]).toEqual({ where: { userId: "u" }, create: { userId: "u" }, update: {} });
  });
  it("accepts an explicit opt-out without adding a bell opt-out", async () => {
    await updateNotificationPreference("u", { emailNotificationsEnabled: false });
    expect(mock.update.mock.calls[0][0].data).toEqual({ emailNotificationsEnabled: false });
  });
  it("ignores nonboolean preference values", async () => {
    await updateNotificationPreference("u", { emailNotificationsEnabled: "false" as any }); expect(mock.update.mock.calls[0][0].data).toEqual({});
  });
});
