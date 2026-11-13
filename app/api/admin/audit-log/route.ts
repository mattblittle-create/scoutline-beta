// app/api/admin/audit-log/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clampTake(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 200;
  return Math.max(1, Math.min(500, Math.floor(n)));
}

export async function GET(req: Request) {
  await requireAdmin("/staff");

  const url = new URL(req.url);
  const action = String(url.searchParams.get("action") ?? "").trim();
  const entityType = String(url.searchParams.get("entityType") ?? "").trim();
  const entityId = String(url.searchParams.get("entityId") ?? "").trim();
  const q = String(url.searchParams.get("q") ?? "").trim();
  const take = clampTake(url.searchParams.get("take"));

  const where: any = {};

  if (action) where.action = action;
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;

  // "q" does a broad match (action/entityType/entityId/requestId/ip + emails)
  // Emails require joining; easiest V1 is: fetch recent rows then filter in memory.
  const raw = await prisma.adminAuditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    include: {
      adminUser: {
        include: {
          user: { select: { email: true } },
        },
      },
      actingUser: { select: { email: true } },
    },
  });

  let rows = raw.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    action: r.action,
    entityType: r.entityType,
    entityId: r.entityId ?? null,
    adminUserId: r.adminUserId ?? null,
    actingUserId: r.actingUserId ?? null,
    ip: r.ip ?? null,
    userAgent: r.userAgent ?? null,
    requestId: r.requestId ?? null,
    adminEmail: r.adminUser?.user?.email ?? null,
    actingEmail: r.actingUser?.email ?? null,
    beforeJson: (r as any).beforeJson ?? null,
    afterJson: (r as any).afterJson ?? null,
  }));

  if (q) {
    const needle = q.toLowerCase();
    rows = rows.filter((r) => {
      const hay = [
        r.action,
        r.entityType,
        r.entityId ?? "",
        r.requestId ?? "",
        r.ip ?? "",
        r.adminEmail ?? "",
        r.actingEmail ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }

  return NextResponse.json({ ok: true, data: { rows } });
}
