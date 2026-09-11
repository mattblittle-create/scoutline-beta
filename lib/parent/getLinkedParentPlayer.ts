// lib/parent/getLinkedParentPlayer.ts
import { prisma } from "@/lib/prisma";

export async function getLinkedParentPlayer(args: {
  userId: string;
  playerProfileId: string;
}) {
  const userId = String(args.userId || "").trim();
  const playerProfileId = String(args.playerProfileId || "").trim();

  if (!userId || !playerProfileId) return null;

  const parentProfile = await prisma.parentProfile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!parentProfile?.id) return null;

  const link = await prisma.parentPlayerLink.findUnique({
    where: {
      parentProfileId_playerProfileId: {
        parentProfileId: parentProfile.id,
        playerProfileId,
      },
    },
    select: {
      id: true,
      relationship: true,
      isPrimary: true,
      playerProfile: {
        select: {
          id: true,
          email: true,
          data: true,
          updatedAt: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              slug: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!link?.playerProfile) return null;

  return {
    parentProfileId: parentProfile.id,
    linkId: link.id,
    relationship: link.relationship,
    isPrimary: link.isPrimary,
    playerProfile: link.playerProfile,
  };
}