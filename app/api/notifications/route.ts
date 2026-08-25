// app/api/notifications/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { listNotificationsForUser } from "@/lib/notifications";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ListNotificationsResponse =
  | {
      ok: true;
      data: {
        notifications: Array<{
          id: string;
          type: string;
          message: string;
          data: any | null;
          readAt: string | null;
          createdAt: string;
        }>;
      };
    }
  | { ok: false; error: string };

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json<ListNotificationsResponse>(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const onlyUnread = searchParams.get("onlyUnread") === "true";
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Math.min(Number(limitParam) || 50, 100) : 50;

  try {
    const notifications = await listNotificationsForUser({
      prisma,
      userId: user.id,
      onlyUnread,
      limit,
    });

    return NextResponse.json<ListNotificationsResponse>({
      ok: true,
      data: {
        notifications: notifications.map((n) => ({
          id: n.id,
          type: n.type,
          message: n.message,
          data: n.data,
          readAt: n.readAt ? n.readAt.toISOString() : null,
          createdAt: n.createdAt.toISOString(),
        })),
      },
    });
  } catch (err) {
    console.error("Error listing notifications", err);
    return NextResponse.json<ListNotificationsResponse>(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
