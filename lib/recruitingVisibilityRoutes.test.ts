import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ user: vi.fn(), search: vi.fn(), lists: vi.fn(), list: vi.fn(), members: vi.fn(), eligible: vi.fn(), add: vi.fn() }));
vi.mock("@/lib/auth/getCurrentUser", () => ({ getCurrentUser: mock.user }));
vi.mock("@/lib/prisma", () => ({ prisma: { playerProfile: { findMany: mock.search, findFirst: mock.eligible }, recruitingList: { findMany: mock.lists, findUnique: mock.list }, recruitingListMember: { findMany: mock.members, create: mock.add }, coachPlayerRating: { findMany: async () => [] } } }));
vi.mock("@/lib/playerRecruitingAlerts", () => ({ createPlayerRecruitingAlert: vi.fn(), playerFirstName: () => "Player", listAlertMessage: () => "list", searchAlertMessage: () => "search" }));
import { GET as search } from "@/app/api/coach/player/search/route";
import { GET as listIndex } from "@/app/api/coach/recruiting-lists/route";
import { GET as listDetail } from "@/app/api/coach/recruiting-lists/[listId]/route";
import { POST as addMember } from "@/app/api/coach/recruiting-lists/[listId]/members/route";
import { TEST_PLAYER_PROFILE_ID, recruitingProfileVisibilityWhere as visibility } from "./recruitingProfileVisibility";
describe("recruiting visibility at server entry points", () => {
  const coach = { id: "coach", email: "coach@college.example", collegeId: "college", coachProfile: { coachAccountType: "COLLEGE_COACH" } };
  beforeEach(() => { vi.resetAllMocks(); mock.user.mockResolvedValue(coach); mock.search.mockResolvedValue([]); mock.lists.mockResolvedValue([]); mock.members.mockResolvedValue([]); mock.list.mockResolvedValue({ id: "list", collegeId: "college", name: "Targets", createdAt: new Date(), updatedAt: new Date() }); mock.eligible.mockResolvedValue(null); });
  it("applies visibility in the database query before paging or limiting search results", async () => {
    await search(new Request("https://example.test/api/coach/player/search?email=matt@midaspayments.com"));
    expect(mock.search.mock.calls[0][0].where.AND).toEqual(visibility(coach).AND);
  });
  it("uses the authenticated test account for the exception", async () => {
    mock.user.mockResolvedValue({ ...coach, email: "matt@midaspayments.com" });
    await search(new Request("https://example.test/api/coach/player/search"));
    expect(mock.search.mock.calls[0][0].where.AND).not.toContainEqual({ id: { not: TEST_PLAYER_PROFILE_ID } });
  });
  it("filters list counts and membership indicators as well as visible members", async () => {
    await listIndex(new Request("https://example.test/api/coach/recruiting-lists?playerProfileId=" + TEST_PLAYER_PROFILE_ID));
    const query = mock.lists.mock.calls[0][0];
    expect(query.include._count.select.members.where.playerProfile).toEqual(visibility(coach));
    expect(query.include.members.where.playerProfile).toEqual(visibility(coach));
    await listDetail(new Request("https://example.test/api/coach/recruiting-lists/list"), { params: { listId: "list" } });
    expect(mock.members.mock.calls[0][0].where).toEqual({ listId: "list", playerProfile: visibility(coach) });
  });
  it("does not let a hidden profile be added by posting its ID directly", async () => {
    const response = await addMember(new Request("https://example.test/api/coach/recruiting-lists/list/members", { method: "POST", body: JSON.stringify({ playerProfileId: TEST_PLAYER_PROFILE_ID }) }), { params: { listId: "list" } });
    expect(response.status).toBe(404); expect(mock.add).not.toHaveBeenCalled();
    expect(mock.eligible.mock.calls[0][0].where).toEqual({ id: TEST_PLAYER_PROFILE_ID, AND: [visibility(coach)] });
  });
});
