import { describe, expect, it } from "vitest";
import { nextMonthlyBillingDate } from "./monthlyBillingDate";
const day = (date: Date) => date.toLocaleDateString("en-US", {timeZone:"America/New_York"});
describe("monthly billing calendar", () => {
 it.each([29,30,31])("anchors January %i to February 28 without overflow", n => {
  expect(day(nextMonthlyBillingDate(new Date(`2027-01-${n}T15:00:00Z`)))).toBe("2/28/2027");
 });
 it("uses February 28 even during a leap year", () => {
  expect(day(nextMonthlyBillingDate(new Date("2028-01-31T15:00:00Z")))).toBe("2/28/2028");
  expect(day(nextMonthlyBillingDate(new Date("2028-02-29T15:00:00Z")))).toBe("3/28/2028");
 });
 it("keeps the 28th for later months and across year boundaries", () => {
  let date = new Date("2027-01-31T15:00:00Z");
  for(let n=0;n<24;n++){date=nextMonthlyBillingDate(date);expect(Number(day(date).split("/")[1])).toBe(28);}
 });
 it("preserves ordinary payment days and Eastern time across DST", () => {
  const result=nextMonthlyBillingDate(new Date("2026-10-27T14:00:00Z"));
  expect(result.toISOString()).toBe("2026-11-27T15:00:00.000Z");
 });
 it("uses the Eastern payment day when UTC is already the following day", () => {
  expect(day(nextMonthlyBillingDate(new Date("2027-02-01T03:00:00Z")))).toBe("2/28/2027");
 });
 it("moves a nonexistent DST hour forward without changing the billing day", () => {
  expect(nextMonthlyBillingDate(new Date("2026-02-08T07:30:00Z")).toISOString()).toBe("2026-03-08T07:30:00.000Z");
 });
 it("rejects invalid dates", () => expect(()=>nextMonthlyBillingDate(new Date("invalid"))).toThrow("Invalid billing date"));
});
