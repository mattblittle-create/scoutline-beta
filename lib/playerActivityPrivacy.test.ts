import { describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ list: vi.fn(), profile: vi.fn() }));
vi.mock("@/lib/auth/getCurrentUser", () => ({ getCurrentUser: async () => ({ id: "player", email: "player@example.test" }) }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  playerProfile: { findFirst: mock.profile }, profileViewEvent: { findMany: async () => [] }, recruitingBoardEntry: { findMany: async () => [] }, recruitingListMember: { findMany: mock.list },
} }));
import { GET } from "@/app/api/player/recruiting-activity/route";
describe("player activity privacy", () => {
  it("never returns an internal list name, notes or rating, even if the database row includes them", async () => {
    mock.profile.mockResolvedValue({ id: "profile" });
    mock.list.mockResolvedValue([{ id: "membership", createdAt: new Date(), list: { name: "SECRET BACKUP OPTIONS", noteText: "PRIVATE NOTE", rating: 2, college: { name: "Example University", division: "D1" } } }]);
    const response = await GET(); const json = await response.json(); const body = JSON.stringify(json);
    expect(body).not.toContain("SECRET"); expect(body).not.toContain("PRIVATE"); expect(body).not.toContain("rating");
    expect(json.data.recentActivity[0].label).toBe("Added you to a recruiting target list");
    expect(mock.list.mock.calls[0][0].select.list.select).not.toHaveProperty("name");
  });
});
