// app/api/notifications/read-all/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Err = { ok: false; error: string };

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json<Err>({ ok: false, error: "Unauthorized" }, { status: 401 });

  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
