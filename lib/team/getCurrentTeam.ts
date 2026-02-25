// lib/team/getCurrentTeam.ts

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

function isCanceledAndEffective(team: { billingStatus: string; cancelEffectiveAt?: Date | null }) {
  if (team.billingStatus === "Canceled") return true;
  if (!team.cancelEffectiveAt) return false;
  return team.cancelEffectiveAt.getTime() <= Date.now();
}

async function enforceCancellation(team: { id: string; billingStatus: string; cancelEffectiveAt?: Date | null }) {
  if (team.billingStatus === "Canceled") return;
  if (!team.cancelEffectiveAt) return;
  if (team.cancelEffectiveAt.getTime() > Date.now()) return;

  await prisma.team.update({
    where: { id: team.id },
    data: { billingStatus: "Canceled" },
  });
}

export async function getCurrentTeam(args?: { teamSlug?: string | null }) {
  const slug = String(args?.teamSlug || "").trim();

  // ----------------------------------------
  // 1) Explicit slug (public or direct routing)
  // ----------------------------------------
  if (slug) {
    const team = await prisma.team.findUnique({ where: { slug } });
    if (!team) return null;

    if (isCanceledAndEffective(team)) {
      await enforceCancellation(team);
      return null;
    }

    return team;
  }

  // ----------------------------------------
  // 2) AUTH path: current user -> TEAM_ADMIN membership -> team
  // ----------------------------------------
  const viewer = await getCurrentUser().catch(() => null);

  if (viewer?.id) {
    const membership = await prisma.teamMembership.findFirst({
      where: {
        userId: viewer.id,
        role: "TEAM_ADMIN",
        isActive: true,
      },
      select: {
        team: true,
      },
    });

    const team = membership?.team ?? null;

    if (team) {
      if (isCanceledAndEffective(team)) {
        await enforceCancellation(team);
        return null;
      }
      return team;
    }
  }

  // ----------------------------------------
  // 3) DEV cookie override
  // ----------------------------------------
  const cookieStore = cookies();
  const devTeamId = String(cookieStore.get("scoutline_dev_teamId")?.value || "").trim();

  if (devTeamId) {
    const team = await prisma.team.findUnique({ where: { id: devTeamId } });
    if (!team) return null;

    if (isCanceledAndEffective(team)) {
      await enforceCancellation(team);
      return null;
    }

    return team;
  }

  // ----------------------------------------
  // 4) DEV fallback (first team)
  // ----------------------------------------
  const team = await prisma.team.findFirst({ orderBy: { createdAt: "asc" } });
  if (!team) return null;

  if (isCanceledAndEffective(team)) {
    await enforceCancellation(team);
    return null;
  }

  return team;
}
