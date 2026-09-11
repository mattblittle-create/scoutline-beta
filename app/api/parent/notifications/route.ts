// app/api/parent/notifications/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { sanitizeParentNotification } from "@/lib/parent/sanitizeParentNotification";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user?.id) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    const role = String(user.role || "").toUpperCase();
    if (role !== "PARENT" && role !== "ADMIN") {
      return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        type: true,
        message: true,
        data: true,
        readAt: true,
        createdAt: true,
      },
    });

    const items = notifications.map((n) => ({
      ...sanitizeParentNotification(n),
      read: Boolean(n.readAt),
    }));

    return NextResponse.json({
      ok: true,
      unreadCount: notifications.filter((n) => !n.readAt).length,
      notifications: items,
    });
  } catch (err) {
    console.error("PARENT_NOTIFICATIONS_GET_ERROR", err);
    return NextResponse.json(
      { ok: false, error: "Unable to load parent notifications." },
      { status: 500 }
    );
  }
}

export async function PATCH() {
  try {
    const user = await getCurrentUser();

    if (!user?.id) {
      return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
    }

    await prisma.notification.updateMany({
      where: {
        userId: user.id,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PARENT_NOTIFICATIONS_PATCH_ERROR", err);
    return NextResponse.json(
      { ok: false, error: "Unable to mark notifications read." },
      { status: 500 }
    );
  }
}