import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ user: vi.fn(), list: vi.fn(), members: vi.fn(), notes: vi.fn(), memberships: vi.fn(), ratings: vi.fn(), profile: vi.fn() }));
vi.mock("@/lib/auth/getCurrentUser", () => ({ getCurrentUser: mock.user }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  recruitingList: { findUnique: mock.list }, recruitingListMember: { findMany: mock.members },
  coachPlayerRating: { findUnique: mock.ratings }, playerProfile: { findUnique: mock.profile },
} }));
import { GET as listGet, PUT as listPut, DELETE as listDelete } from "@/app/api/coach/recruiting-lists/[listId]/route";
import { GET as ratingGet } from "@/app/api/coach/player-rating/route";
import { listCoachNotesForProfile } from "./coachNotes";
describe("coach program boundaries", () => {
  beforeEach(() => { vi.resetAllMocks(); mock.user.mockResolvedValue({ id: "coach-a", collegeId: "college-a", coachProfile: { coachAccountType: "COLLEGE_COACH" } }); });
  it("blocks reading, changing, and deleting another program's list by ID", async () => {
    mock.list.mockResolvedValue({ id: "secret-list", collegeId: "college-b", name: "Internal" });
    const ctx = { params: { listId: "secret-list" } };
    for (const handler of [listGet, listPut, listDelete]) {
      const response = await handler(new Request("https://example.test/api/coach/recruiting-lists/secret-list"), ctx);
      expect(response.status).toBe(403); expect(JSON.stringify(await response.json())).not.toContain("Internal");
    }
    expect(mock.members).not.toHaveBeenCalled();
  });
  it("only reads the current coach's rating within their current program", async () => {
    mock.profile.mockResolvedValue({ id: "p" }); mock.ratings.mockResolvedValue({ rating: 4 });
    const response = await ratingGet(new Request("https://example.test/api/coach/player-rating?playerProfileId=p&collegeId=college-b&coachUserId=coach-b"));
    expect(response.status).toBe(200);
    expect(mock.ratings.mock.calls[0][0].where).toEqual({ collegeId_coachUserId_playerProfileId: { collegeId: "college-a", coachUserId: "coach-a", playerProfileId: "p" } });
  });
  it("limits shared and private notes to the actor's program", async () => {
    mock.memberships.mockResolvedValue([]); mock.notes.mockResolvedValue([]);
    await listCoachNotesForProfile({ actingUser: { id: "coach-a", role: "COACH", collegeId: "college-a" } as any, playerProfileId: "p", prisma: { teamMembership: { findMany: mock.memberships }, coachNote: { findMany: mock.notes } } as any });
    expect(mock.notes.mock.calls[0][0].where).toEqual({ playerProfileId: "p", OR: [{ collegeId: "college-a", OR: [{ sharedWithOrg: true }, { coachUserId: "coach-a" }] }] });
  });
  it("returns no notes for a player without staff membership or college association", async () => {
    mock.memberships.mockResolvedValue([]);
    const notes = await listCoachNotesForProfile({ actingUser: { id: "player" } as any, playerProfileId: "p", prisma: { teamMembership: { findMany: mock.memberships }, coachNote: { findMany: mock.notes } } as any });
    expect(notes).toEqual([]); expect(mock.notes).not.toHaveBeenCalled();
  });
});
