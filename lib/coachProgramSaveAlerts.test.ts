import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ coaches: vi.fn(), profile: vi.fn(), find: vi.fn(), create: vi.fn(), dispatch: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findMany: mock.coaches }, playerProfile: { findUnique: mock.profile }, $transaction: async (fn: any) => fn({ $queryRaw: vi.fn(), notification: { findFirst: mock.find, create: mock.create } }) } }));
vi.mock("@/lib/notificationEmailDispatch", () => ({ dispatchNotificationEmails: mock.dispatch }));
import { notifyCollegeCoachesOfProgramSave } from "./coachProgramSaveAlerts";
describe("matching target-program saves", () => {
  beforeEach(() => {
    vi.resetAllMocks(); mock.find.mockResolvedValue(null); mock.create.mockResolvedValue({ emailDelivery: { id: "email" } });
    mock.coaches.mockResolvedValue([{ id: "coach", name: "Jane Smith", coachProfile: { recruitingTargets: [{ gradYear: 2029, positions: ["SS"] }] } }, { id: "coach2", name: "Joe Jones", coachProfile: { recruitingTargets: [] } }]);
    mock.profile.mockResolvedValue({ id: "p", userId: "player", user: { slug: "matt-player", Player: { gradYear: 2029, primaryPos: "SS", secondaryPos: "C" } } });
  });
  it("creates bells and email queues for program staff when the program's combined targets match", async () => {
    await notifyCollegeCoachesOfProgramSave({ collegeId: "c", playerProfileId: "p" });
    expect(mock.create).toHaveBeenCalledTimes(2);
    const n = mock.create.mock.calls[0][0].data;
    expect(n.message).toContain("Smith, a 2029 SS has added your program");
    expect(n.data.actionPath).toBe("/player/matt-player"); expect(n.emailDelivery).toEqual({ create: {} });
    expect(mock.coaches.mock.calls[0][0].where.collegeId).toBe("c");
  });
  it("does not notify for a secondary-position-only match or the wrong year", async () => {
    mock.profile.mockResolvedValue({ id: "p", user: { Player: { gradYear: 2029, primaryPos: "C", secondaryPos: "SS" } } });
    await notifyCollegeCoachesOfProgramSave({ collegeId: "c", playerProfileId: "p" }); expect(mock.create).not.toHaveBeenCalled();
    mock.profile.mockResolvedValue({ id: "p", user: { Player: { gradYear: 2028, primaryPos: "SS" } } });
    await notifyCollegeCoachesOfProgramSave({ collegeId: "c", playerProfileId: "p" }); expect(mock.create).not.toHaveBeenCalled();
  });
  it("does not generate duplicate bells/emails on a repeated save", async () => {
    mock.find.mockResolvedValue({ id: "existing" });
    await notifyCollegeCoachesOfProgramSave({ collegeId: "c", playerProfileId: "p" }); expect(mock.create).not.toHaveBeenCalled();
  });
});
