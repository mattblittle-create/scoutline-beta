import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ user: vi.fn(), rows: vi.fn(), college: vi.fn() }));
vi.mock("@/lib/auth/getCurrentUser", () => ({ getCurrentUser: mock.user }));
vi.mock("@/lib/prisma", () => ({ prisma: { college: { findUnique: mock.college }, playerProfile: { findMany: mock.rows }, recruitingListMember: { findMany: async () => [] }, coachPlayerRating: { findMany: async () => [] } } }));
vi.mock("@/lib/playerRecruitingAlerts", () => ({ createPlayerRecruitingAlert: vi.fn(), playerFirstName: () => "Matt", searchAlertMessage: () => "Search result" }));
import { GET } from "@/app/api/coach/player/search/route";
const profile = (id: string, zip?: string) => ({ id, email: "p@example.test", data: {}, updatedAt: new Date(), user: { id: "user-" + id, name: id, Player: { hometownZip: zip } } });
describe("coach proximity search", () => {
  beforeEach(() => {
    vi.resetAllMocks(); mock.user.mockResolvedValue({ id: "coach", collegeId: "own-college", coachProfile: { coachAccountType: "COLLEGE_COACH" } });
    mock.college.mockResolvedValue({ zipCode: "29710" }); mock.rows.mockResolvedValue([]);
  });
  it("filters nearby players from the logged-in coach's college, not a supplied college ID", async () => {
    mock.rows.mockResolvedValue([profile("near", "29710"), profile("far", "90210"), profile("unknown")]);
    const response = await GET(new Request("https://example.test/api/coach/player/search?radiusMiles=25&collegeId=other")); const json = await response.json();
    expect(json.results.map((p: any) => p.playerProfileId)).toEqual(["near"]);
    expect(mock.college.mock.calls[0][0].where).toEqual({ id: "own-college" });
    expect(json.results[0].distanceMiles).toBe(0);
    expect(JSON.stringify(json)).not.toContain("29710");
  });
  it("leaves players with unknown ZIPs available when Any is selected", async () => {
    mock.rows.mockResolvedValue([profile("unknown")]);
    const json = await (await GET(new Request("https://example.test/api/coach/player/search?radiusMiles=any"))).json();
    expect(json.results).toHaveLength(1); expect(mock.college).not.toHaveBeenCalled();
    expect(json.results[0]).not.toHaveProperty("distanceMiles");
  });
  it.each(["bad", "0", "-25", "999999"])("rejects unsupported radius %s", async radius => {
    expect((await GET(new Request("https://example.test/api/coach/player/search?radiusMiles=" + radius))).status).toBe(400);
    expect(mock.rows).not.toHaveBeenCalled();
  });
  it("reports an unavailable college location instead of silently ignoring the filter", async () => {
    mock.college.mockResolvedValue({ zipCode: null });
    const response = await GET(new Request("https://example.test/api/coach/player/search?radiusMiles=25")); expect(response.status).toBe(422);
    expect((await response.json()).error).toContain("location is unavailable"); expect(mock.rows).not.toHaveBeenCalled();
  });
  it("requires a linked college-coach account for a college-centered radius", async () => {
    mock.user.mockResolvedValue({ id: "service", coachProfile: { coachAccountType: "RECRUITING_SERVICE", coachBillingStatus: "ACTIVE" } });
    expect((await GET(new Request("https://example.test/api/coach/player/search?radiusMiles=25"))).status).toBe(403);
  });
  it("continues into later pages before applying the result limit", async () => {
    mock.rows.mockResolvedValueOnce(Array.from({ length: 100 }, (_, i) => profile("far-" + i, "90210"))).mockResolvedValueOnce([profile("near", "29710")]);
    const json = await (await GET(new Request("https://example.test/api/coach/player/search?radiusMiles=25&take=1"))).json();
    expect(json.results.map((p: any) => p.playerProfileId)).toEqual(["near"]);
    expect(mock.rows).toHaveBeenCalledTimes(2);
    expect(mock.rows.mock.calls[1][0]).toMatchObject({ cursor: { id: "far-99" }, skip: 1 });
  });
});
