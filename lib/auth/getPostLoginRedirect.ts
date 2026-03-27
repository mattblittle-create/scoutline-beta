// lib/auth/getPostLoginRedirect.ts
import { prisma } from "@/lib/prisma";

export async function getPostLoginRedirect(userId: string): Promise<string> {
  // Admin first
  const adminProfile =
    (prisma as any).adminProfile &&
    typeof (prisma as any).adminProfile.findFirst === "function"
      ? await (prisma as any).adminProfile.findFirst({
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
        })
      : null;

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
  if (legacyRole === "PLAYER" && hasPlayerProfile) {
    return "/dashboard/player/profile";
  }

  if (hasPlayerProfile) return "/dashboard/player/profile";

  return "/dashboard/player/profile";
}