import { describe, expect, it } from "vitest";
import { recruitingProfileVisibilityWhere as visibility, TEST_PLAYER_PROFILE_ID, NON_PLAYER_PROFILE_IDS } from "./recruitingProfileVisibility";
describe("recruiting test profile visibility", () => {
  it("excludes the stable test profile ID for ordinary coaches", () => {
    expect(visibility({ email: "coach@college.example" }).AND).toContainEqual({ id: { not: TEST_PLAYER_PROFILE_ID } });
  });
  it.each(["matt@midaspayments.com", " MATT@MIDASPAYMENTS.COM "])("allows the designated test coach %s", email => {
    expect(visibility({ email }).AND).not.toContainEqual({ id: { not: TEST_PLAYER_PROFILE_ID } });
  });
  it("permanently excludes the confirmed scaffold for every coach, including the test coach", () => {
    for (const email of ["coach@college.example", "matt@midaspayments.com"]) expect(visibility({ email }).AND).toContainEqual({ id: { notIn: NON_PLAYER_PROFILE_IDS } });
  });
  it("does not grant the exception for missing identity, similar addresses, or an email suffix", () => {
    for (const email of [undefined, "other@midaspayments.com", "matt@midaspayments.com.evil.example"]) expect(visibility({ email }).AND).toContainEqual({ id: { not: TEST_PLAYER_PROFILE_ID } });
  });
  it("excludes non-player and unroutable rows without requiring optional athletic details", () => {
    const rule = visibility({ email: "matt@midaspayments.com" });
    expect(rule.AND).toContainEqual({ user: { is: { role: "PLAYER", slug: { not: null, notIn: [""] } } } });
    expect(JSON.stringify(rule)).not.toContain('"Player"');
  });
});
