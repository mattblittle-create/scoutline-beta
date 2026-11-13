vi.mock("@/lib/notificationEmailDispatch", () => ({ dispatchNotificationEmails: mock.dispatch }));
import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ find: vi.fn(), create: vi.fn(), lock: vi.fn(), profile: vi.fn(), college: vi.fn(), links: vi.fn(), dispatch: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  $transaction: async (fn: any) => fn({ $queryRaw: mock.lock, notification: { findFirst: mock.find, create: mock.create }, parentPlayerLink: { findMany: mock.links } }),
  playerProfile: { findUnique: mock.profile }, college: { findUnique: mock.college },
} }));
import { createPlayerRecruitingAlert, listAlertMessage, notifyPlayerProfileView, searchAlertMessage } from "./playerRecruitingAlerts";
describe("player recruiting notifications", () => {
  beforeEach(() => { vi.resetAllMocks(); mock.find.mockResolvedValue(null); mock.create.mockResolvedValue({ id: "n", emailDelivery: { id: "mail" } }); mock.links.mockResolvedValue([]); });
  it("sends a useful list alert without any list name, note or rating in its payload", async () => {
    await createPlayerRecruitingAlert({ userId: "p", playerProfileId: "profile", collegeId: "college", type: "PLAYER_ADDED_TO_RECRUITING_LIST", event: "LIST_ADD", message: listAlertMessage("Matt", "Jane Doe", "Head Coach", "Example University") });
    const payload = mock.create.mock.calls[0][0].data;
    expect(payload.message).toContain("Matt, Head Coach Jane Doe from Example University");
    expect(payload.message).toContain("recruiting target list"); expect(payload.message).toContain("communication rules");
    expect(Object.keys(payload.data).sort()).toEqual(["actionPath", "collegeId", "event", "playerProfileId"]);
    expect(mock.lock).toHaveBeenCalled();
  });
  it("deduplicates alerts within a rolling day and scopes view alerts to the program", async () => {
    mock.find.mockResolvedValue({ id: "old" });
    expect(await createPlayerRecruitingAlert({ userId: "p", playerProfileId: "profile", collegeId: "c", type: "PLAYER_PROFILE_VIEWED_BY_COACH", event: "PROFILE_VIEW", message: "view" })).toBe(false);
    expect(mock.create).not.toHaveBeenCalled();
    expect(mock.find.mock.calls[0][0].where.data).toEqual({ path: ["collegeId"], equals: "c" });
  });
  it("requires a real college coach and excludes self views", async () => {
    expect(await notifyPlayerProfileView("p", { id: "coach", collegeId: "c", coachProfile: { coachAccountType: "OTHER" } })).toBe(false);
    expect(mock.profile).not.toHaveBeenCalled();
    mock.profile.mockResolvedValue({ userId: "coach" });
    expect(await notifyPlayerProfileView("p", { id: "coach", collegeId: "c", coachProfile: { coachAccountType: "COLLEGE_COACH" } })).toBe(false);
    expect(mock.create).not.toHaveBeenCalled();
  });
  it("personalizes a genuine profile view", async () => {
    mock.profile.mockResolvedValue({ userId: "player", user: { name: "Matt Player" }, data: {} });
    await notifyPlayerProfileView("p", { id: "coach", collegeId: "c", college: { name: "Example" }, coachProfile: { coachAccountType: "COLLEGE_COACH" } });
    expect(mock.create.mock.calls[0][0].data.message).toContain("Matt, a coach from Example has viewed your profile");
  });
  it("creates separate parent bells and queued email copies without exposing internal data", async () => {
    mock.links.mockResolvedValue([{ parentProfile: { userId: "parent" } }, { parentProfile: { userId: "parent" } }]);
    await createPlayerRecruitingAlert({ userId: "player", playerProfileId: "p", type: "PLAYER_PROFILE_VIEWED_BY_COACH", event: "PROFILE_VIEW", message: "Matt, a coach viewed your profile." });
    expect(mock.create).toHaveBeenCalledTimes(2);
    const parent = mock.create.mock.calls[1][0].data;
    expect(parent.userId).toBe("parent"); expect(parent.message).toBe(mock.create.mock.calls[0][0].data.message);
    expect(parent.data.actionPath).toBe("/dashboard/parent"); expect(parent.emailDelivery).toEqual({ create: {} });
    expect(mock.dispatch).toHaveBeenCalled();
  });
  it("distinguishes a matching search from a profile view", () => {
    expect(searchAlertMessage("Matt", true)).toContain("graduation year and position");
    expect(searchAlertMessage("Matt", false)).toContain("appeared in a coach’s ScoutLine search results");
    expect(searchAlertMessage("Matt", false)).not.toContain("viewed your profile");
  });
});
