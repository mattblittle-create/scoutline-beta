import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Err = { ok: false; error: string };

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json<Err>({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({} as any));
  const notificationId = String(body?.notificationId || "").trim();
  if (!notificationId) return NextResponse.json<Err>({ ok: false, error: "notificationId is required." }, { status: 400 });

  const row = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!row) return NextResponse.json<Err>({ ok: false, error: "Not found." }, { status: 404 });
  if (row.userId !== user.id) return NextResponse.json<Err>({ ok: false, error: "Forbidden." }, { status: 403 });

  await prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
