// lib/auth/getPostLoginRedirect.ts
import { prisma } from "@/lib/prisma";

export async function getPostLoginRedirect(userId: string): Promise<string> {
  // Admin first
  const adminProfile = await prisma.adminUser.findFirst({
    where: {
      userId,
      isActive: true,
    },
    select: {
      id: true,
      roles: {
        select: { role: true },
      },
    },
  });

  if (adminProfile) {
    const roleList = (adminProfile.roles ?? []).map((r: any) =>
      String(r.role ?? "").toUpperCase()
    );

    const isScoutlineAdmin =
      roleList.includes("SCOUTLINE_ADMIN") ||
      roleList.includes("SUPPORT_AGENT") ||
      roleList.includes("BILLING_ADMIN") ||
      roleList.includes("MARKETING_ADMIN");

    if (isScoutlineAdmin) return "/admin";
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      coachProfile: { select: { id: true } },
      adminProfile: {
        select: {
          id: true,
          isActive: true,
          roles: { select: { role: true } },
        },
      },
      teamMemberships: {
        where: { isActive: true },
        select: {
          id: true,
          role: true,
          teamId: true,
        },
      },
PlayerProfile: {
  select: {
    id: true,
    playerPlanTier: true,
    hasActivePlayerBilling: true,
    hasActiveTeamBilling: true,
    playerBillingStatus: true,
  },
},
      Player: {
        select: {
          id: true,
        },
      },
    } as any,
  });

  if (!user) return "/login";

  const memberships = (user as any).teamMemberships ?? [];

  const hasTeamAdmin = memberships.some(
    (m: any) => String(m.role).toUpperCase() === "TEAM_ADMIN"
  );

  const hasCoachMembership = memberships.some(
    (m: any) => String(m.role).toUpperCase() === "COACH"
  );

  const hasPlayerProfile = Boolean(
    (user as any).playerProfile?.id ||
      (user as any).PlayerProfile?.id ||
      (user as any).Player?.id
  );

  if (hasTeamAdmin) return "/dashboard/team";
  if ((user as any).coachProfile?.id || hasCoachMembership) {
    return "/dashboard/coach";
  }

  const legacyRole = String((user as any).role ?? "")
    .trim()
    .toUpperCase();

  if (legacyRole === "ADMIN") return "/admin";
  if (legacyRole === "TEAM" || legacyRole === "TEAM_ADMIN") {
    return "/dashboard/team";
  }
  if (legacyRole === "COACH") return "/dashboard/coach";
  if (legacyRole === "PARENT") return "/dashboard/parent";
const playerProfile = (user as any).PlayerProfile || (user as any).playerProfile || null;

const selectedPaidPlayerPlan =
  playerProfile &&
  ["WALK_ON", "ALL_AMERICAN"].includes(
    String(playerProfile.playerPlanTier || "").toUpperCase()
  );

const needsPlayerPayment =
  selectedPaidPlayerPlan &&
  !playerProfile.hasActivePlayerBilling &&
  !playerProfile.hasActiveTeamBilling &&
  String(playerProfile.playerBillingStatus || "").toLowerCase() !== "active";

if (needsPlayerPayment) {
  return `/onboarding/player/billing?playerProfileId=${encodeURIComponent(
    playerProfile.id
  )}`;
}

if (legacyRole === "PLAYER" && hasPlayerProfile) {
  return "/dashboard/player";
}

if (hasPlayerProfile) return "/dashboard/player";

return "/dashboard/player";
}