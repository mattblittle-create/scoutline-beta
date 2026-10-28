// app/admin/audit-log/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import AuditLogClient from "./AuditLogClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function safeInt(v: any, fallback: number) {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) ? Math.max(1, Math.floor(n)) : fallback;
}

function parseDateTimeLocal(v: string): Date | null {
  // expects "YYYY-MM-DDTHH:mm" from datetime-local input
  const s = safeStr(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dateFromPreset(last: string): Date | null {
  const now = Date.now();
  if (last === "24h") return new Date(now - 24 * 60 * 60 * 1000);
  if (last === "7d") return new Date(now - 7 * 24 * 60 * 60 * 1000);
  if (last === "30d") return new Date(now - 30 * 24 * 60 * 60 * 1000);
  return null;
}

export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: {
    q?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    requestId?: string;

    last?: string; // 24h | 7d | 30d
    from?: string; // datetime-local
    to?: string;   // datetime-local

    take?: string;
  };
}) {
  await requireAdmin("/staff");

  const q = safeStr(searchParams.q);
  const action = safeStr(searchParams.action);
  const entityType = safeStr(searchParams.entityType);
  const entityId = safeStr(searchParams.entityId);
  const requestId = safeStr(searchParams.requestId);

  const take = safeInt(searchParams.take, 200);

  // date filtering
  const last = safeStr(searchParams.last);
  const fromPreset = dateFromPreset(last);
  const fromCustom = parseDateTimeLocal(String(searchParams.from ?? ""));
  const toCustom = parseDateTimeLocal(String(searchParams.to ?? ""));

  const from = fromCustom ?? fromPreset ?? null;
  const to = toCustom ?? null;

  const where: any = {};

  // Quick search (matches admin email, acting email, action, entityType, entityId, requestId)
  if (q) {
    where.OR = [
      { action: { contains: q, mode: "insensitive" } },
      { entityType: { contains: q, mode: "insensitive" } },
      { entityId: { contains: q, mode: "insensitive" } },
      { requestId: { contains: q, mode: "insensitive" } },
      { ip: { contains: q, mode: "insensitive" } },
      { adminUser: { user: { email: { contains: q, mode: "insensitive" } } } },
      { actingUser: { email: { contains: q, mode: "insensitive" } } },
    ];
  }

  if (action) where.action = action;
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;
  if (requestId) where.requestId = requestId;

  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = from;
    if (to) where.createdAt.lte = to;
  }

  const events = await prisma.adminAuditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    include: {
      adminUser: { include: { user: { select: { email: true } } } },
      actingUser: { select: { email: true } },
    },
  });

  const initial = events.map((e) => ({
    id: e.id,
    createdAt: e.createdAt,
    adminEmail: e.adminUser?.user?.email ?? "—",
    actingEmail: e.actingUser?.email ?? "—",
    action: e.action,
    entityType: e.entityType,
    entityId: e.entityId,
    ip: e.ip,
    requestId: e.requestId,
    userAgent: e.userAgent,
    beforeJson: e.beforeJson,
    afterJson: e.afterJson,
  }));

  return (
    <main style={{ padding: 24, maxWidth: 1200, fontFamily: "Arial, sans-serif", fontSize: 11 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 18, margin: 0 }}>Audit Log</h1>
          <div style={{ opacity: 0.75, marginTop: 6 }}>
            Admin actions with before/after snapshots (V1).
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <a href="/admin/audit-log" style={a}>Refresh</a>
          <Link href="/admin" style={a}>Back to Admin</Link>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <AuditLogClient
          initialEvents={initial}
          initialFilters={{
            q,
            action,
            entityType,
            entityId,
            requestId,
            last,
            from: safeStr(searchParams.from),
            to: safeStr(searchParams.to),
            take,
          }}
        />
      </div>
    </main>
  );
}

const a: React.CSSProperties = {
  color: "#2563eb",
  textDecoration: "none",
  fontWeight: 800,
};
