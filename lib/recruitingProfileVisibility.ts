import type { Prisma } from "@prisma/client";
// Deliberately restricted QA fixture. Use the stable profile ID so changing its
// public slug cannot make it appear to real coaches.
export const TEST_PLAYER_PROFILE_ID = "cms4shg970001l404bbhsuvx7";
const TEST_COACH_EMAIL = "matt@midaspayments.com";
// Confirmed non-player scaffold; it must stay hidden even if a repair job later assigns a slug.
export const NON_PLAYER_PROFILE_IDS = ["cmtvoefvf0001k004x1s5eon1"];
export function recruitingProfileVisibilityWhere(viewer: { email?: string | null }): Prisma.PlayerProfileWhereInput {
  const allowedTestCoach = String(viewer.email || "").trim().toLowerCase() === TEST_COACH_EMAIL;
  return { AND: [
    { id: { notIn: NON_PLAYER_PROFILE_IDS } },
    // A public link and player account are required for a usable recruiting row.
    // Do not require the optional Player details row: real profiles can still
    // hold their athletic information in the legacy JSON representation.
    { user: { is: { role: "PLAYER", slug: { not: null, notIn: [""] } } } },
    ...(!allowedTestCoach ? [{ id: { not: TEST_PLAYER_PROFILE_ID } }] : []),
  ] };
}
