import { dispatchNotificationEmails } from "@/lib/notificationEmailDispatch";
import { prisma } from "@/lib/prisma";
import { Prisma, NotificationType } from "@prisma/client";

export const outreachAdvice = "Make sure your profile is up to date. Research the school and athletics program, then reach out through email and social media to introduce yourself and express your interest, following the communication rules for that program’s division and your graduation year.";
export function playerFirstName(user: { name?: string | null } | null, data: any = {}) {
  const n = data.normalized || data;
  return String(n.firstName || n.core?.firstName || n.player?.firstName || user?.name?.trim().split(/\s+/)[0] || "Player");
}
export function listAlertMessage(firstName: string, coachName: string | null, role: string | null, college: string) {
  const coach = [role, coachName].filter(Boolean).join(" ") || "A coach";
  return firstName + ", " + coach + " from " + college + " has added you to their recruiting target list. " + outreachAdvice;
}
export function viewAlertMessage(firstName: string, college: string) {
  return firstName + ", a coach from " + college + " has viewed your profile. " + outreachAdvice;
}
export function searchAlertMessage(firstName: string, cohort: boolean) {
  return firstName + (cohort
    ? ", coaches are actively searching the ScoutLine database for players matching your graduation year and position. Make sure your profile is up to date so they can find you."
    : ", your profile appeared in a coach’s ScoutLine search results. Make sure your profile is up to date so coaches can learn about you.");
}

// One alert per type/program/player per 24 hours, including concurrent requests.
// Search alerts use one global daily bucket and do not disclose coach search criteria.
export async function createPlayerRecruitingAlert(args: {
  userId: string; type: NotificationType; message: string;
  collegeId?: string | null; playerProfileId: string; event: string;
}) {
  const result = await prisma.$transaction(async tx => {
    const bucket = args.type + ":" + (args.collegeId || "all");
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${args.userId}), hashtext(${bucket}))`;
    const existing = await tx.notification.findFirst({ where: {
      userId: args.userId, type: args.type,
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      ...(args.collegeId ? { data: { path: ["collegeId"], equals: args.collegeId } } : {}),
    } });
    if (existing) return { created: false, deliveryIds: [] as string[] };
    const actionPath = "/dashboard/player";
    const notification = await tx.notification.create({ data: {
      userId: args.userId, type: args.type, message: args.message,
      data: { event: args.event, playerProfileId: args.playerProfileId, collegeId: args.collegeId || null, actionPath } satisfies Prisma.InputJsonObject,
      emailDelivery: { create: {} },
    }, include: { emailDelivery: true } });
    const deliveryIds = notification.emailDelivery ? [notification.emailDelivery.id] : [];
    const links = await tx.parentPlayerLink.findMany({ where: { playerProfileId: args.playerProfileId }, select: { parentProfile: { select: { userId: true } } } });
    for (const userId of new Set(links.map(link => link.parentProfile.userId))) {
      if (userId === args.userId) continue;
      const parentAlert = await tx.notification.create({ data: {
        userId, type: args.type, message: args.message,
        data: { event: args.event, playerProfileId: args.playerProfileId, parentPlayerProfileId: args.playerProfileId, collegeId: args.collegeId || null, actionPath: "/dashboard/parent" },
        emailDelivery: { create: {} },
      }, include: { emailDelivery: true } });
      if (parentAlert.emailDelivery) deliveryIds.push(parentAlert.emailDelivery.id);
    }
    return { created: true, deliveryIds };
  });
  await dispatchNotificationEmails(result.deliveryIds);
  return result.created;
}

export async function notifyPlayerProfileView(playerProfileId: string, coach: {
  id: string; collegeId: string | null; college?: { name: string } | null;
  coachProfile?: { coachAccountType: string | null } | null;
}) {
  if (!coach.collegeId || coach.coachProfile?.coachAccountType !== "COLLEGE_COACH") return false;
  const profile = await prisma.playerProfile.findUnique({ where: { id: playerProfileId }, include: { user: true } });
  if (!profile?.userId || profile.userId === coach.id) return false;
  const college = coach.college || await prisma.college.findUnique({ where: { id: coach.collegeId }, select: { name: true } });
  if (!college) return false;
  return createPlayerRecruitingAlert({ userId: profile.userId, playerProfileId,
    collegeId: coach.collegeId, type: "PLAYER_PROFILE_VIEWED_BY_COACH", event: "PROFILE_VIEW",
    message: viewAlertMessage(playerFirstName(profile.user, profile.data), college.name),
  });
}
