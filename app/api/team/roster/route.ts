// app/api/team/roster/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function normalizeEmail(v: any): string {
  return String(v || "").trim().toLowerCase();
}

function normText(v: any): string {
  return String(v ?? "").trim();
}

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function pickEmailFromRequest(req: Request): string {
  const url = new URL(req.url);
  return normalizeEmail(
    url.searchParams.get("email") || url.searchParams.get("username")
  );
}

function asBool(v: string | null): boolean | null {
  if (v == null || v === "") return null;
  const s = v.toLowerCase();
  if (["1", "true", "yes", "y"].includes(s)) return true;
  if (["0", "false", "no", "n"].includes(s)) return false;
  return null;
}

function asInt(v: string | null): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function asFloat(v: string | null): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}

function safeGet(obj: any, path: string[]): any {
  let cur = obj;
  for (const key of path) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = cur[key];
  }
  return cur;
}

function extractRosterFields(profileData: any) {
  const firstName =
    normText(safeGet(profileData, ["firstName"])) ||
    normText(safeGet(profileData, ["core", "firstName"])) ||
    normText(safeGet(profileData, ["player", "firstName"])) ||
    "";

  const lastName =
    normText(safeGet(profileData, ["lastName"])) ||
    normText(safeGet(profileData, ["core", "lastName"])) ||
    normText(safeGet(profileData, ["player", "lastName"])) ||
    "";

  const photoUrl =
    normText(safeGet(profileData, ["photoUrl"])) ||
    normText(safeGet(profileData, ["core", "photoUrl"])) ||
    normText(safeGet(profileData, ["player", "photoUrl"])) ||
    "";

  const gradYear =
    asInt(String(safeGet(profileData, ["gradYear"]) ?? "")) ??
    asInt(String(safeGet(profileData, ["core", "gradYear"]) ?? "")) ??
    asInt(String(safeGet(profileData, ["player", "gradYear"]) ?? "")) ??
    null;

  const gpaRaw =
    safeGet(profileData, ["gpa"]) ??
    safeGet(profileData, ["academics", "gpa"]) ??
    safeGet(profileData, ["player", "gpa"]);

  const gpa = gpaRaw == null || gpaRaw === "" ? null : asFloat(String(gpaRaw));

  const isCommittedRaw =
    safeGet(profileData, ["isCommitted"]) ??
    safeGet(profileData, ["commitment", "isCommitted"]) ??
    safeGet(profileData, ["player", "isCommitted"]);

  const isCommitted =
    typeof isCommittedRaw === "boolean"
      ? isCommittedRaw
      : asBool(String(isCommittedRaw ?? ""));

  const primaryPos =
    normText(safeGet(profileData, ["primaryPos"])) ||
    normText(safeGet(profileData, ["positions", "primary"])) ||
    normText(safeGet(profileData, ["player", "primaryPos"])) ||
    "";

  const secondaryPos =
    normText(safeGet(profileData, ["secondaryPos"])) ||
    normText(safeGet(profileData, ["positions", "secondary"])) ||
    normText(safeGet(profileData, ["player", "secondaryPos"])) ||
    "";

  const pitcherHand =
    normText(safeGet(profileData, ["pitcherHand"])) ||
    normText(safeGet(profileData, ["positions", "pitcherHand"])) ||
    normText(safeGet(profileData, ["player", "pitcherHand"])) ||
    "";

  const bats =
    normText(safeGet(profileData, ["bats"])) ||
    normText(safeGet(profileData, ["player", "bats"])) ||
    "";

  const throws =
    normText(safeGet(profileData, ["throws"])) ||
    normText(safeGet(profileData, ["player", "throws"])) ||
    "";

  const isPitcher =
    (!!primaryPos && primaryPos.toUpperCase() === "P") ||
    (!!secondaryPos && secondaryPos.toUpperCase() === "P");

  const publicSlug =
  normText(safeGet(profileData, ["publicSlug"])) ||
  normText(safeGet(profileData, ["slug"])) ||
  normText(safeGet(profileData, ["core", "publicSlug"])) ||
  normText(safeGet(profileData, ["player", "publicSlug"])) ||
  "";

  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

return {
  firstName,
  lastName,
  fullName,
  publicSlug,
  photoUrl,
  gradYear,
  gpa,
  isCommitted,
  primaryPos,
  secondaryPos,
  pitcherHand,
  bats,
  throws,
  isPitcher,
};
}

async function getAdminTeamFromRequest(req: Request) {
  const currentUser = await getCurrentUser().catch(() => null);

  let userId = currentUser?.id || null;
  let email = normalizeEmail(currentUser?.email);

  // Keep dev/manual fallback support.
  if (!userId) {
    const fallbackEmail = pickEmailFromRequest(req);
    if (!fallbackEmail) return null;
    if (!isEmail(fallbackEmail)) throw new Error("Invalid email.");

    const fallbackUser = await prisma.user.findUnique({
      where: { email: fallbackEmail },
      select: { id: true, email: true },
    });

    if (!fallbackUser?.id) return null;

    userId = fallbackUser.id;
    email = normalizeEmail(fallbackUser.email);
  }

  const adminMembership = await prisma.teamMembership.findFirst({
    where: {
      userId,
      role: "TEAM_ADMIN" as any,
      isActive: true,
    },
    include: { team: true },
  });

  if (!adminMembership?.team) return null;

  return {
    user: { id: userId, email },
    team: adminMembership.team,
  };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const found = await getAdminTeamFromRequest(req);
    if (!found) {
      return jsonError("No active team admin membership found for this user.", 404);
    }

    const teamId = found.team.id;

    const q = normText(url.searchParams.get("q")).toLowerCase();
    const gradYear = asInt(url.searchParams.get("gradYear"));
    const gpaMin = asFloat(url.searchParams.get("gpaMin"));
    const gpaMax = asFloat(url.searchParams.get("gpaMax"));
    const committed = asBool(url.searchParams.get("committed"));
    const primaryPos = normText(url.searchParams.get("primaryPos")).toUpperCase();
    const secondaryPos = normText(url.searchParams.get("secondaryPos")).toUpperCase();
    const pitcher = asBool(url.searchParams.get("pitcher"));
    const hand = normText(url.searchParams.get("hand")).toUpperCase();
    const bats = normText(url.searchParams.get("bats")).toUpperCase();
    const throws = normText(url.searchParams.get("throws")).toUpperCase();
    const active = asBool(url.searchParams.get("active"));

    const rows = await prisma.teamMembership.findMany({
      where: {
        teamId,
        role: "PLAYER" as any,
        playerProfileId: { not: null },
        ...(active === null ? { isActive: true } : { isActive: active }),
      },
      orderBy: [{ createdAt: "desc" }],
      include: {
        playerProfile: {
          select: {
            id: true,
            email: true,
            userId: true,
            data: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        user: { select: { id: true, email: true, photoUrl: true, slug: true } },
      },
    });

    const roster = rows
      .map((m) => {
        const pp = m.playerProfile;
        const data = (pp?.data ?? {}) as any;
        const f = extractRosterFields(data);

        return {
          membershipId: m.id,
          teamId: m.teamId,
          role: m.role,
          season: m.season ?? null,
          isActive: m.isActive,
          startDate: m.startDate,
          endDate: m.endDate,
          createdAt: m.createdAt,

          playerProfileId: pp?.id ?? null,
          playerEmail: pp?.email ?? m.user?.email ?? null,
          userId: pp?.userId ?? m.user?.id ?? null,

          publicSlug: f.publicSlug || m.user?.slug || null,

          firstName: f.firstName,
          lastName: f.lastName,
          fullName: f.fullName || pp?.email || m.user?.email || "Player",
          photoUrl: f.photoUrl || m.user?.photoUrl || null,
          gradYear: f.gradYear,
          gpa: f.gpa,
          committed: f.isCommitted,
          primaryPos: f.primaryPos,
          secondaryPos: f.secondaryPos,
          pitcher: f.isPitcher,
          hand: f.pitcherHand,
          bats: f.bats,
          throws: f.throws,
        };
      })
      .filter((r) => {
        if (q) {
          const hay =
            `${r.firstName} ${r.lastName} ${r.fullName} ${r.playerEmail ?? ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }

        if (gradYear != null && r.gradYear !== gradYear) return false;
        if (gpaMin != null && (r.gpa == null || r.gpa < gpaMin)) return false;
        if (gpaMax != null && (r.gpa == null || r.gpa > gpaMax)) return false;

        if (committed != null && !!r.committed !== committed) return false;

        if (primaryPos && (r.primaryPos || "").toUpperCase() !== primaryPos) {
          return false;
        }

        if (
          secondaryPos &&
          (r.secondaryPos || "").toUpperCase() !== secondaryPos
        ) {
          return false;
        }

        if (pitcher != null && !!r.pitcher !== pitcher) return false;
        if (hand && (r.hand || "").toUpperCase() !== hand) return false;
        if (bats && (r.bats || "").toUpperCase() !== bats) return false;
        if (throws && (r.throws || "").toUpperCase() !== throws) return false;

        return true;
      })
      .sort((a, b) => {
        const la = (a.lastName || "").toLowerCase();
        const lb = (b.lastName || "").toLowerCase();
        if (la < lb) return -1;
        if (la > lb) return 1;

        const fa = (a.firstName || "").toLowerCase();
        const fb = (b.firstName || "").toLowerCase();
        return fa.localeCompare(fb);
      });

const analytics = {
  totalPlayers: rows.length,
  activePlayers: rows.filter((m) => m.isActive).length,
  inactivePlayers: rows.filter((m) => !m.isActive).length,
  committedPlayers: roster.filter((r) => !!r.committed).length,
  pitchers: roster.filter((r) => !!r.pitcher).length,
  avgGpa:
    roster.filter((r) => r.gpa != null).length > 0
      ? Number(
          (
            roster
              .filter((r) => r.gpa != null)
              .reduce((sum, r) => sum + Number(r.gpa || 0), 0) /
            roster.filter((r) => r.gpa != null).length
          ).toFixed(2)
        )
      : null,
  gradYears: roster.reduce<Record<string, number>>((acc, r) => {
    if (!r.gradYear) return acc;

    const key = String(r.gradYear);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {}),
  primaryPositions: roster.reduce<Record<string, number>>((acc, r) => {
    const key = String(r.primaryPos || "").trim();

    if (!key) return acc;

    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {}),
  pitcherHands: roster.reduce<Record<string, number>>((acc, r) => {
    const rawHand = String(r.hand || "").trim().toUpperCase();

    if (!rawHand) return acc;

    const key =
      rawHand === "LHP" || rawHand === "L"
        ? "LHP"
        : rawHand === "RHP" || rawHand === "R"
        ? "RHP"
        : "";

    if (!key) return acc;

    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {}),
};

return NextResponse.json({
  ok: true,
  data: {
    team: {
      id: teamId,
      name: found.team.name,
      slug: found.team.slug,
      teamType: found.team.teamType,
    },
    count: roster.length,
    analytics,
    roster,
        filtersEcho: {
          q: q || null,
          gradYear,
          gpaMin,
          gpaMax,
          committed,
          primaryPos: primaryPos || null,
          secondaryPos: secondaryPos || null,
          pitcher,
          hand: hand || null,
          bats: bats || null,
          throws: throws || null,
          active,
        },
      },
    });
  } catch (err: any) {
    console.error("[team roster] GET error", err);
    return jsonError(err?.message || "Failed to load roster.", 500);
  }
}

export async function POST(req: Request) {
  try {
    const found = await getAdminTeamFromRequest(req);
    if (!found) {
      return jsonError("No active team admin membership found for this user.", 404);
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return jsonError("Invalid JSON body.", 400);
    }

    const membershipId = normText(body?.membershipId);
    const isActive = body?.isActive;

    if (!membershipId) return jsonError("membershipId is required.", 400);
    if (typeof isActive !== "boolean") {
      return jsonError("isActive must be boolean.", 400);
    }

    const existing = await prisma.teamMembership.findFirst({
      where: {
        id: membershipId,
        teamId: found.team.id,
        role: "PLAYER" as any,
      },
      select: { id: true, isActive: true },
    });

    if (!existing) return jsonError("Roster row not found for this team.", 404);

    const updated = await prisma.teamMembership.update({
      where: { id: membershipId },
      data: { isActive },
    });

    return NextResponse.json({
      ok: true,
      data: {
        membershipId: updated.id,
        isActive: updated.isActive,
      },
    });
  } catch (err: any) {
    console.error("[team roster] POST error", err);
    return jsonError(err?.message || "Failed to update roster.", 500);
  }
}