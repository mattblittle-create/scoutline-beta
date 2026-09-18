// app/lib/notifications/preferences.ts

import { prisma } from "@/lib/prisma";

export type NotificationPreferenceInput = {
  instantChatMessages?: boolean;
  digestChatMessages?: boolean;
  instantProgramSaves?: boolean;
  instantNewMatches?: boolean;
  instantStaffActivity?: boolean;
  weeklyDigest?: boolean;
  verificationReminders?: boolean;
};

export async function getOrCreateNotificationPreference(userId: string) {
  let prefs = await prisma.notificationPreference.findUnique({
    where: { userId },
  });

  if (!prefs) {
    prefs = await prisma.notificationPreference.create({
      data: { userId },
    });
  }

  return prefs;
}

export async function updateNotificationPreference(
  userId: string,
  input: NotificationPreferenceInput
) {
  await getOrCreateNotificationPreference(userId);

  return prisma.notificationPreference.update({
    where: { userId },
    data: {
      ...(typeof input.instantChatMessages === "boolean" && {
        instantChatMessages: input.instantChatMessages,
      }),
      ...(typeof input.digestChatMessages === "boolean" && {
        digestChatMessages: input.digestChatMessages,
      }),
      ...(typeof input.instantProgramSaves === "boolean" && {
        instantProgramSaves: input.instantProgramSaves,
      }),
      ...(typeof input.instantNewMatches === "boolean" && {
        instantNewMatches: input.instantNewMatches,
      }),
      ...(typeof input.instantStaffActivity === "boolean" && {
        instantStaffActivity: input.instantStaffActivity,
      }),
      ...(typeof input.weeklyDigest === "boolean" && {
        weeklyDigest: input.weeklyDigest,
      }),
      ...(typeof input.verificationReminders === "boolean" && {
        verificationReminders: input.verificationReminders,
      }),
    },
  });
}