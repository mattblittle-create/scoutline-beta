// lib/notifications.ts

import { PrismaClient, NotificationType, Notification } from "@prisma/client";

const prisma = new PrismaClient();

/* ------------------------------------------------------------------
 * Create Notification
 * ------------------------------------------------------------------ */

export type CreateNotificationOptions = {
  prisma?: PrismaClient;
  userId: string;
  type: NotificationType;
  message: string;
  data?: Record<string, any> | null;
};

export async function createNotification(
  options: CreateNotificationOptions
): Promise<Notification> {
  const { prisma: prismaOverride, userId, type, message, data } = options;
  const db = prismaOverride ?? prisma;

  return db.notification.create({
    data: {
      userId,
      type,
      message,
      data: data ?? null,
    },
  });
}

/* ------------------------------------------------------------------
 * List Notifications
 * ------------------------------------------------------------------ */

export type ListNotificationsOptions = {
  prisma?: PrismaClient;
  userId: string;
  onlyUnread?: boolean;
  limit?: number;
};

export async function listNotificationsForUser(
  options: ListNotificationsOptions
): Promise<Notification[]> {
  const {
    prisma: prismaOverride,
    userId,
    onlyUnread = false,
    limit = 50,
  } = options;

  const db = prismaOverride ?? prisma;

  return db.notification.findMany({
    where: {
      userId,
      ...(onlyUnread ? { readAt: null } : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });
}

/* ------------------------------------------------------------------
 * Mark a single notification as read
 * ------------------------------------------------------------------ */

export type MarkNotificationReadOptions = {
  prisma?: PrismaClient;
  userId: string;
  notificationId: string;
};

export async function markNotificationRead(
  options: MarkNotificationReadOptions
): Promise<void> {
  const { prisma: prismaOverride, userId, notificationId } = options;
  const db = prismaOverride ?? prisma;

  await db.notification.updateMany({
    where: {
      id: notificationId,
      userId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });
}

/* ------------------------------------------------------------------
 * Mark ALL notifications as read
 * ------------------------------------------------------------------ */

export type MarkAllNotificationsReadOptions = {
  prisma?: PrismaClient;
  userId: string;
};

export async function markAllNotificationsRead(
  options: MarkAllNotificationsReadOptions
): Promise<void> {
  const { prisma: prismaOverride, userId } = options;
  const db = prismaOverride ?? prisma;

  await db.notification.updateMany({
    where: {
      userId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });
}

/* ------------------------------------------------------------------
 * OPTIONAL BUT RECOMMENDED:
 * Delete a notification
 * ------------------------------------------------------------------ */

export type DeleteNotificationOptions = {
  prisma?: PrismaClient;
  userId: string;
  notificationId: string;
};

export async function deleteNotification(
  options: DeleteNotificationOptions
): Promise<void> {
  const { prisma: prismaOverride, userId, notificationId } = options;
  const db = prismaOverride ?? prisma;

  await db.notification.deleteMany({
    where: {
      id: notificationId,
      userId,
    },
  });
}
