import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ existing: vi.fn(), owner: vi.fn(), college: vi.fn(), imported: vi.fn(), claim: vi.fn(), lock: vi.fn(), count: vi.fn(), user: vi.fn(), coach: vi.fn(), createRecord: vi.fn(), token: vi.fn(), invalidate: vi.fn(), email: vi.fn(), tx: vi.fn() }));
vi.mock("@/lib/auth/getCurrentUser", () => ({ getRealUser: mock.owner }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  user: { findUnique: mock.existing }, college: { findUnique: mock.college }, collegeBaseballCoach: { findUnique: mock.claim, findMany: mock.imported },
  $transaction: mock.tx,
} }));
vi.mock("@/lib/slug", () => ({ slugifyName: () => "coach", generateUniqueSlug: async () => "coach" }));
vi.mock("@/lib/auth/tokens", () => ({ createVerificationToken: mock.token, invalidateExistingTokens: mock.invalidate }));
vi.mock("@/lib/email/sendSetPasswordEmail", () => ({ sendSetPasswordEmail: mock.email }));
import { POST } from "./route";
const body = { name: "Jane Coach", role: "Assistant Coach", collegeId: "college", workEmail: "jane@example.test" };
const request = (extra: any = {}) => new Request("https://example.test/api/onboarding/coach", { method: "POST", body: JSON.stringify({ ...body, ...extra }) });
describe("self-service coach signup policy", () => {
  beforeEach(() => {
    vi.resetAllMocks(); mock.existing.mockResolvedValue(null); mock.owner.mockResolvedValue(null);
    mock.college.mockResolvedValue({ id: "college", name: "Example College", slug: "example", baseballProgram: { id: "program" } });
    mock.claim.mockResolvedValue(null); mock.imported.mockResolvedValue([]); mock.count.mockResolvedValue(0);
    mock.user.mockResolvedValue({ id: "new-coach", email: body.workEmail, name: body.name, slug: "coach", passwordHash: null });
    mock.coach.mockImplementation(async ({ create }: any) => ({ id: "cp", isProgramAdmin: create.isProgramAdmin }));
    mock.createRecord.mockResolvedValue({ id: "record" }); mock.token.mockResolvedValue({ rawToken: "fake-setup-token" });
    mock.tx.mockImplementation(async (fn: any) => fn({ $queryRaw: mock.lock, coachProfile: { count: mock.count, upsert: mock.coach }, user: { upsert: mock.user }, collegeBaseballCoach: { create: mock.createRecord } }));
  });
  it("allows unmatched new coaches to sign up without manual approval and makes the first coach an admin", async () => {
    const response = await POST(request()); expect(response.status).toBe(200);
    expect((await response.json()).data.isProgramAdmin).toBe(true);
    expect(mock.email).toHaveBeenCalledTimes(1); expect(mock.lock).toHaveBeenCalled();
    expect(mock.lock.mock.invocationCallOrder[0]).toBeLessThan(mock.count.mock.invocationCallOrder[0]);
  });
  it("makes a later Head Coach an admin automatically", async () => {
    mock.count.mockResolvedValue(1);
    const response = await POST(request({ role: "Head Coach" }));
    expect((await response.json()).data.isProgramAdmin).toBe(true);
  });
  it.each(["Recruiting Coordinator", "recruiting coordinator", " Recruiting   Coordinator "])("makes a later %s an admin without treating them as Head Coach", async role => {
    mock.count.mockResolvedValue(1);
    const response = await POST(request({ role }));
    expect((await response.json()).data.isProgramAdmin).toBe(true);
    expect(mock.createRecord.mock.calls[0][0].data.isHeadCoach).toBe(false);
  });
  it("keeps later assistant coaches as regular staff", async () => {
    mock.count.mockResolvedValue(1); const response = await POST(request());
    expect((await response.json()).data.isProgramAdmin).toBe(false);
  });
  it("does not let an unsigned signup change an established account", async () => {
    mock.existing.mockResolvedValue({ id: "existing", slug: "existing", passwordHash: "hash" });
    const response = await POST(request()); expect(response.status).toBe(409);
    expect((await response.json()).signInRequired).toBe(true);
    expect(mock.tx).not.toHaveBeenCalled(); expect(mock.email).not.toHaveBeenCalled();
  });
  it("does not let another signed-in user change the account", async () => {
    mock.existing.mockResolvedValue({ id: "existing", passwordHash: "hash" }); mock.owner.mockResolvedValue({ id: "other" });
    expect((await POST(request())).status).toBe(409); expect(mock.tx).not.toHaveBeenCalled();
  });
  it("protects pending accounts until their owner completes email setup", async () => {
    mock.existing.mockResolvedValue({ id: "pending", passwordHash: null });
    const response = await POST(request()); expect(response.status).toBe(409);
    expect((await response.json()).signInRequired).toBe(false); expect(mock.tx).not.toHaveBeenCalled();
  });
  it("lets the authenticated account owner continue onboarding and preserves existing admin grants", async () => {
    mock.existing.mockResolvedValue({ id: "existing", slug: "existing", passwordHash: "hash" }); mock.owner.mockResolvedValue({ id: "existing" });
    mock.user.mockResolvedValue({ id: "existing", email: body.workEmail, name: body.name, slug: "existing", passwordHash: "hash" });
    mock.count.mockResolvedValue(1);
    expect((await POST(request())).status).toBe(200);
    expect(mock.coach.mock.calls[0][0].update).not.toHaveProperty("isProgramAdmin");
    expect(mock.email).not.toHaveBeenCalled();
  });
});
