import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deliverNotificationEmail } from "@/lib/notificationEmails";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== "Bearer " + process.env.CRON_SECRET) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await prisma.notificationEmailDelivery.findMany({ where: { attempts: { lt: 10 }, OR: [{ status: "PENDING", nextAttemptAt: { lte: new Date() } }, { status: "SENDING", updatedAt: { lt: new Date(Date.now() - 5 * 60 * 1000) } }] }, take: 50, orderBy: { createdAt: "asc" }, select: { id: true } });
  let failed = 0;
  for (const row of rows) { try { await deliverNotificationEmail(row.id); } catch { failed++; } }
  return NextResponse.json({ ok: failed === 0, processed: rows.length, failed }, { status: failed ? 503 : 200 });
}
