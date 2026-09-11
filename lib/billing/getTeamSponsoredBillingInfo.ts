// lib/billing/getTeamSponsoredBillingInfo.ts

import { prisma } from "@/lib/prisma";

export async function getTeamSponsoredBillingInfo(playerProfileId: string) {
  const profile = await prisma.playerProfile.findUnique({
    where: { id: playerProfileId },
    select: {
      id: true,
      playerPlanTier: true,
      ownershipMode: true,
      profileState: true,
      hasActiveTeamBilling: true,
      ownerTeam: {
        select: {
          id: true,
          name: true,
          contactEmail: true,
          phone: true,
          memberships: {
            where: {
              role: "TEAM_ADMIN",
              isActive: true,
            },
            take: 1,
            select: {
              user: {
                select: {
                  name: true,
                  email: true,
                  workPhone: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const isTeamSponsored =
    profile?.playerPlanTier === "TEAM" ||
    profile?.ownershipMode === "TEAM_PRIMARY" ||
    profile?.profileState === "TEAM_OWNED_ACTIVE" ||
    Boolean(profile?.hasActiveTeamBilling);

  if (!profile || !isTeamSponsored || !profile.ownerTeam) {
    return null;
  }

  const adminUser = profile.ownerTeam.memberships?.[0]?.user || null;

  return {
    teamId: profile.ownerTeam.id,
    teamName: profile.ownerTeam.name,
    adminName: adminUser?.name || "Team Admin",
    adminEmail: adminUser?.email || profile.ownerTeam.contactEmail || "",
    adminPhone: adminUser?.workPhone || profile.ownerTeam.phone || "",
  };
}