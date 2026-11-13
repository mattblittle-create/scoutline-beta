import { prisma } from "@/lib/prisma";
import { matchesRecruitingTargets } from "@/lib/recruitingTargetMatch";
import { dispatchNotificationEmails } from "@/lib/notificationEmailDispatch";
export async function notifyCollegeCoachesOfProgramSave(params: { collegeId: string; playerProfileId: string }) {
  const [coaches, profile] = await Promise.all([
    prisma.user.findMany({ where: { collegeId: params.collegeId, role: "COACH", coachProfile: { is: { coachAccountType: "COLLEGE_COACH" } } }, include: { coachProfile: true } }),
    prisma.playerProfile.findUnique({ where: { id: params.playerProfileId }, include: { user: { include: { Player: true } } } }),
  ]);
  const player = profile?.user?.Player;
  const gradYear = player?.gradYear ?? null, primaryPos = player?.primaryPos ?? null;
  const targets = coaches.flatMap(c => Array.isArray(c.coachProfile?.recruitingTargets) ? c.coachProfile.recruitingTargets : []);
  if (!profile || !matchesRecruitingTargets(targets, gradYear, primaryPos, player?.pitcherHand || player?.throws)) return;
  const actionPath = profile.user?.slug ? "/player/" + encodeURIComponent(profile.user.slug) : "/dashboard/coach/player/" + encodeURIComponent(profile.id);
  const ids = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${params.playerProfileId}), hashtext(${params.collegeId}))`;
    const deliveryIds: string[] = [];
    for (const coach of coaches) {
      if (coach.id === profile.userId) continue;
      const existing = await tx.notification.findFirst({ where: { userId: coach.id, type: "COACH_PROGRAM_SAVED", createdAt: { gte: new Date(Date.now() - 86400000) }, AND: [{ data: { path: ["collegeId"], equals: params.collegeId } }, { data: { path: ["playerProfileId"], equals: profile.id } }] } });
      if (existing) continue;
      const surname = coach.name?.trim().split(/\s+/).pop() || "Coach";
      const n = await tx.notification.create({ data: {
        userId: coach.id, type: "COACH_PROGRAM_SAVED",
        message: surname + ", a " + gradYear + " " + primaryPos + " has added your program to their Target Programs list. View the player’s profile to learn more.",
        data: { event: "PLAYER_SAVED_PROGRAM", collegeId: params.collegeId, playerProfileId: profile.id, actionPath },
        emailDelivery: { create: {} },
      }, include: { emailDelivery: true } });
      if (n.emailDelivery) deliveryIds.push(n.emailDelivery.id);
    }
    return deliveryIds;
  });
  await dispatchNotificationEmails(ids);
}
