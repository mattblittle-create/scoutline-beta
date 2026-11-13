import { describe, expect, it } from "vitest";
import { directoryCollegeLocation } from "./collegeDirectoryLocation";
import { collegeLocation, straightLineMiles } from "./recruitingProximity";
describe("public college directory fallback", () => {
  it("finds a college with no saved ZIP or coordinates", () => {
    expect(collegeLocation({ name: "Harvard University", state: "MA", city: "Cambridge" })).not.toBeNull();
  });
  it("keeps same-name institutions in different states separate", () => {
    const pa = directoryCollegeLocation({ name: "Lincoln University", state: "PA" });
    const mo = directoryCollegeLocation({ name: "Lincoln University", state: "MO" });
    expect(pa).not.toBeNull(); expect(mo).not.toBeNull(); expect(straightLineMiles(pa!, mo!)).toBeGreaterThan(500);
  });
  it("does not guess when a name identifies several campuses", () => {
    expect(directoryCollegeLocation({ name: "Lincoln University" })).toBeNull();
    expect(directoryCollegeLocation({ name: "Not a real college", state: "XX" })).toBeNull();
  });
  it("does not match an institution in the wrong state", () => {
    expect(directoryCollegeLocation({ name: "Harvard University", state: "CA" })).toBeNull();
  });
});
