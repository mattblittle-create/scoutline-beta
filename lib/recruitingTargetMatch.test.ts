import { describe, expect, it } from "vitest";
import { matchesRecruitingTargets as matches } from "./recruitingTargetMatch";
describe("program target matching", () => {
  const targets = [{ gradYear: 2029, positions: ["SS", "RHP"] }];
  it("requires both year and primary position", () => {
    expect(matches(targets, 2029, "SS")).toBe(true);
    expect(matches(targets, 2028, "SS")).toBe(false);
    expect(matches(targets, 2029, "C")).toBe(false);
    expect(matches(targets, null, "SS")).toBe(false);
    expect(matches([], 2029, "SS")).toBe(false);
  });
  it("handles pitcher handedness without treating an unknown hand as a match", () => {
    expect(matches(targets, 2029, "P", "R")).toBe(true);
    expect(matches(targets, 2029, "P", "L")).toBe(false);
    expect(matches(targets, 2029, "P")).toBe(false);
  });
  it("expands position groups and normalizes case", () => {
    expect(matches([{ gradYear: 2029, positions: ["of"] }], 2029, "cf")).toBe(true);
    expect(matches([{ gradYear: 2029, positions: ["MIF"] }], 2029, "SS")).toBe(true);
  });
});
