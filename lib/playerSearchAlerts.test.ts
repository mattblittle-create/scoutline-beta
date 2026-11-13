import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ user: vi.fn(), rows: vi.fn(), alerts: vi.fn() }));
vi.mock("@/lib/auth/getCurrentUser", () => ({ getCurrentUser: mock.user }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  playerProfile: { findMany: mock.rows }, recruitingListMember: { findMany: async () => [] }, coachPlayerRating: { findMany: async () => [] },
} }));
vi.mock("@/lib/playerRecruitingAlerts", () => ({ createPlayerRecruitingAlert: mock.alerts, playerFirstName: () => "Matt", searchAlertMessage: (_: string, cohort: boolean) => cohort ? "Matching graduation year and position" : "Appeared in search results" }));
import { GET } from "@/app/api/coach/player/search/route";
describe("real search triggers", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mock.user.mockResolvedValue({ id: "coach", collegeId: "c", coachProfile: { coachAccountType: "COLLEGE_COACH" } });
    mock.rows.mockResolvedValue([{ id: "profile", email: "player@example.test", data: {}, updatedAt: new Date(), user: { id: "player", name: "Matt Player", Player: { gradYear: 2029, primaryPos: "SS" } } }]);
  });
  it("notifies actual results of a graduation-year and position search without disclosing coach identity", async () => {
    const response = await GET(new Request("https://example.test/api/coach/player/search?gradYear=2029&pos=SS"));
    expect(response.status).toBe(200); expect(mock.alerts).toHaveBeenCalledTimes(1);
    expect(mock.alerts.mock.calls[0][0]).toMatchObject({ userId: "player", type: "PLAYER_RECRUITING_SEARCH_MATCH", event: "MATCHING_SEARCH" });
    expect(mock.alerts.mock.calls[0][0]).not.toHaveProperty("collegeId");
  });
  it("records a name search as a search result, not a profile view", async () => {
    await GET(new Request("https://example.test/api/coach/player/search?q=Matt"));
    expect(mock.alerts.mock.calls[0][0].event).toBe("SEARCH_RESULT");
  });
  it("does not notify for default browsing or an incomplete cohort filter", async () => {
    await GET(new Request("https://example.test/api/coach/player/search"));
    await GET(new Request("https://example.test/api/coach/player/search?gradYear=2029"));
    expect(mock.alerts).not.toHaveBeenCalled();
  });
  it("does not notify unmatched players or searches by recruiting services", async () => {
    mock.rows.mockResolvedValue([]); await GET(new Request("https://example.test/api/coach/player/search?gradYear=2029&pos=SS"));
    expect(mock.alerts).not.toHaveBeenCalled();
    mock.user.mockResolvedValue({ id: "service", coachProfile: { coachAccountType: "RECRUITING_SERVICE", coachBillingStatus: "ACTIVE" } });
    await GET(new Request("https://example.test/api/coach/player/search?q=Matt")); expect(mock.alerts).not.toHaveBeenCalled();
  });
});
