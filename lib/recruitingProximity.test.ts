import { describe, expect, it } from "vitest";
import { collegeLocation, playerLocation, straightLineMiles, validPoint } from "./recruitingProximity";
import { getCoordinatesForZip, normalizeZip } from "./recommendations/zipCoordinates";
describe("ZIP-based recruiting proximity", () => {
  it("supports nationwide ZIPs, leading zeros and ZIP+4", () => {
    for (const zip of ["29710", "10001", "90210", "02139", "00601", "98101"]) expect(getCoordinatesForZip(zip)).not.toBeNull();
    expect(getCoordinatesForZip("02139-1234")).toEqual(getCoordinatesForZip("02139"));
    expect(normalizeZip(" 02139 ")).toBe("02139");
  });
  it("does not turn malformed or missing ZIPs into a location", () => {
    for (const zip of ["", "not-a-zip", "29710-extra", "297100", "00000"]) expect(getCoordinatesForZip(zip)).toBeNull();
    expect(normalizeZip(2139)).toBeNull();
  });
  it("uses the college ZIP and falls back to valid stored campus coordinates", () => {
    expect(collegeLocation({ zipCode: "29710", latitude: 0, longitude: 0 })).toEqual(getCoordinatesForZip("29710"));
    expect(collegeLocation({ zipCode: "00000", latitude: 35, longitude: -81 })).toEqual({ latitude: 35, longitude: -81 });
    expect(collegeLocation({ latitude: NaN, longitude: Infinity })).toBeNull();
    expect(validPoint({ latitude: 91, longitude: -81 })).toBeNull();
  });
  it("handles canonical and legacy player ZIP locations", () => {
    expect(playerLocation({ user: { Player: { hometownZip: "02139" } } })).toEqual(getCoordinatesForZip("02139"));
    expect(playerLocation({ data: { normalized: { core: { homeZip: "90210" } } } })).toEqual(getCoordinatesForZip("90210"));
    expect(playerLocation({ data: { homeZip: "98101" } })).toEqual(getCoordinatesForZip("98101"));
    expect(playerLocation({})).toBeNull();
  });
  it("calculates symmetric straight-line distances without rounding at the radius boundary", () => {
    const a = { latitude: 0, longitude: 0 }, b = { latitude: 0, longitude: 0.364 };
    expect(straightLineMiles(a, a)).toBe(0);
    expect(straightLineMiles(a, b)).toBeCloseTo(straightLineMiles(b, a), 8);
    expect(straightLineMiles(a, b)).toBeGreaterThan(25);
    expect(straightLineMiles(a, b)).toBeLessThan(25.5);
  });
});
