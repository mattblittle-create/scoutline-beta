import { describe, expect, it } from "vitest";
import { RECRUITING_VIDEO_CATEGORIES, isRetiredVideoCategory } from "./videoGuidance";
describe("recruiting video categories", () => {
  it("offers only hitting, fielding and pitching and recognizes retired metadata", () => {
    expect(RECRUITING_VIDEO_CATEGORIES).toEqual(["Hitting", "Fielding", "Pitching"]);
    expect(isRetiredVideoCategory("Baserunning")).toBe(true);
    expect(isRetiredVideoCategory("Pitching")).toBe(false);
    expect(isRetiredVideoCategory(null)).toBe(false);
  });
});
