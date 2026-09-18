// app/api/notifications/preferences/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import {
  getOrCreateNotificationPreference,
  updateNotificationPreference,
} from "@/app/lib/notifications/preferences";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();

  if (!user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const preferences = await getOrCreateNotificationPreference(user.id);

  return NextResponse.json({ ok: true, preferences });
}

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();

  if (!user?.id) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  const preferences = await updateNotificationPreference(user.id, {
    instantChatMessages: body?.instantChatMessages,
    digestChatMessages: body?.digestChatMessages,
    instantProgramSaves: body?.instantProgramSaves,
    instantNewMatches: body?.instantNewMatches,
    instantStaffActivity: body?.instantStaffActivity,
    weeklyDigest: body?.weeklyDigest,
    verificationReminders: body?.verificationReminders,
  });

  return NextResponse.json({ ok: true, preferences });
}