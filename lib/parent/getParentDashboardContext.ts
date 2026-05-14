// lib/parent/getParentDashboardContext.ts

import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export type ParentDashboardContext = Awaited<
  ReturnType<typeof getParentDashboardContext>
>;

type Options = {
  playerProfileId?: string | null;
  requireLinkedPlayer?: boolean;
};

export async function getParentDashboardContext(options: Options = {}) {
  const user = await getCurrentUser();

  if (!user?.id) {
    redirect("/login?role=parent");
  }

  const userRole = String(user.role || "").trim().toUpperCase();
  const canAccess = userRole === "PARENT" || userRole === "ADMIN";

  if (!canAccess) {
    redirect("/login?next=%2Fdashboard%2Fparent");
  }

  const parentProfile = await prisma.parentProfile.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      userId: true,
      playerLinks: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        select: {
          id: true,
          isPrimary: true,
          relationship: true,
          playerProfileId: true,
          playerProfile: {
            select: {
              id: true,
              email: true,
              userId: true,
              data: true,
              createdAt: true,
              updatedAt: true,
              playerPlanTier: true,
              playerBillingCadence: true,
              playerBillingStatus: true,
              playerCancelRequestedAt: true,
              playerCancelEffectiveAt: true,
              user: {
                select: {
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!parentProfile?.id) {
    if (options.requireLinkedPlayer) notFound();

    return {
      user,
      parentProfile: null,
      linkedPlayers: [],
      activeLink: null,
      activePlayerProfile: null,
      activePlayerProfileId: null,
      notificationCount: 0,
    };
  }

  const requestedPlayerProfileId = String(
    options.playerProfileId || ""
  ).trim();

  const activeLink = requestedPlayerProfileId
    ? parentProfile.playerLinks.find(
        (link) => link.playerProfileId === requestedPlayerProfileId
      ) || null
    : parentProfile.playerLinks[0] || null;

  if (options.requireLinkedPlayer && !activeLink?.playerProfile) {
    notFound();
  }

  let notificationCount = 0;

  if (activeLink?.playerProfile?.userId) {
    notificationCount = await prisma.notification.count({
      where: {
        userId: activeLink.playerProfile.userId,
        readAt: null,
      },
    });
  }

  return {
    user,
    parentProfile,
    linkedPlayers: parentProfile.playerLinks,
    activeLink,
    activePlayerProfile: activeLink?.playerProfile || null,
    activePlayerProfileId: activeLink?.playerProfileId || null,
    notificationCount,
  };
}

export function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

export function readString(obj: Record<string, any>, ...keys: string[]) {
  for (const key of keys) {
    const value = obj?.[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }

  return "";
}

export function getPlayerDisplayName({
  data,
  fallbackName,
  fallbackEmail,
}: {
  data: Record<string, any>;
  fallbackName?: string | null;
  fallbackEmail?: string | null;
}) {
  const firstName = readString(data, "firstName", "playerFirstName", "nameFirst");
  const lastName = readString(data, "lastName", "playerLastName", "nameLast");

  return (
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    fallbackName?.trim() ||
    fallbackEmail?.split("@")[0] ||
    "Your Player"
  );
}

export function getPossessiveName(firstName?: string | null) {
  const clean = String(firstName || "").trim();

  if (!clean) return "your player's";

  return `${clean}${clean.endsWith("s") ? "'" : "'s"}`;
}