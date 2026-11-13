import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import { credentialVersion, signSessionToken, verifySessionToken } from "./session";
const mocks = vi.hoisted(() => ({ cookie: undefined as string | undefined, findUnique: vi.fn(), admin: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: () => ({ get: (name: string) => name === "scoutline_uid" ? { value: mocks.cookie } : undefined }), headers: () => ({ get: () => null }) }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: mocks.findUnique }, adminUser: { findUnique: mocks.admin } } }));
import { getRealUser } from "./getCurrentUser";
describe("signed login identity", () => {
  beforeEach(() => { vi.stubEnv("APP_SECRET", "test-secret-with-at-least-32-characters"); mocks.cookie = undefined; mocks.findUnique.mockReset(); });
  afterEach(() => vi.unstubAllEnvs());
  it("accepts a valid session and hydrates only its verified identity", async () => {
    const user = { id: "coach-a", passwordHash: "hash-a" };
    mocks.cookie = await signSessionToken(user); mocks.findUnique.mockResolvedValue(user);
    expect(await getRealUser()).toEqual(user);
    expect(mocks.findUnique.mock.calls[0][0].where).toEqual({ id: "coach-a" });
  });
  it("rejects raw user IDs without looking up the forged account", async () => {
    mocks.cookie = "coach-b";
    expect(await getRealUser()).toBeNull(); expect(mocks.findUnique).not.toHaveBeenCalled();
  });
  it("rejects tampered tokens and tokens signed with another key", async () => {
    const token = await signSessionToken({ id: "a", passwordHash: "hash" });
    const pieces = token.split("."); pieces[1] = Buffer.from(JSON.stringify({ sub: "victim" })).toString("base64url");
    expect(await verifySessionToken(pieces.join("."))).toBeNull();
    vi.stubEnv("APP_SECRET", "different-test-key-with-32-characters");
    expect(await verifySessionToken(token)).toBeNull();
  });
  it("rejects expired, wrong-purpose, wrong-audience and missing-expiration tokens", async () => {
    const key = new TextEncoder().encode(process.env.APP_SECRET);
    for (const variant of ["expired", "purpose", "audience", "no-exp"]) {
      let jwt = new SignJWT({ purpose: variant === "purpose" ? "email-verify" : "session", version: credentialVersion("hash") })
        .setProtectedHeader({ alg: "HS256" }).setSubject("a").setIssuer("scoutline")
        .setAudience(variant === "audience" ? "email" : "scoutline-session").setIssuedAt();
      if (variant !== "no-exp") jwt = jwt.setExpirationTime(variant === "expired" ? 1 : Math.floor(Date.now() / 1000) + 60);
      expect(await verifySessionToken(await jwt.sign(key))).toBeNull();
    }
  });
  it("invalidates sessions after a password reset and rejects deleted users", async () => {
    mocks.cookie = await signSessionToken({ id: "a", passwordHash: "old-hash" });
    mocks.findUnique.mockResolvedValue({ id: "a", passwordHash: "new-hash" }); expect(await getRealUser()).toBeNull();
    mocks.findUnique.mockResolvedValue(null); expect(await getRealUser()).toBeNull();
  });
  it("fails closed when the signing secret is missing or weak", async () => {
    vi.stubEnv("APP_SECRET", ""); expect(await verifySessionToken("anything")).toBeNull();
    await expect(signSessionToken({ id: "a", passwordHash: "hash" })).rejects.toThrow("APP_SECRET");
  });
});
