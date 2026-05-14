// app/api/parent/notifications/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getParentDashboardContext } from "@/lib/parent/getParentDashboardContext";
import { sanitizeParentNotification } from "@/lib/parent/sanitizeParentNotification";

export async function GET() {
  try {
    const { activePlayerProfile } = await getParentDashboardContext({
      requireLinkedPlayer: true,
    });

    if (!activePlayerProfile?.userId) {
      return NextResponse.json({
        ok: true,
        count: 0,
        notifications: [],
      });
    }

    const notifications = await prisma.notification.findMany({
      where: {
        userId: activePlayerProfile.userId,
      },
      orderBy: [{ createdAt: "desc" }],
      take: 25,
    });

    const safeNotifications = notifications.map(sanitizeParentNotification);

    return NextResponse.json({
      ok: true,
      count: safeNotifications.length,
      notifications: safeNotifications,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Unable to load parent notifications.",
      },
      { status: 500 }
    );
  }
}