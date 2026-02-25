// app/admin/billing/discounts/page.tsx

import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin/getAdminContext";

// ✅ reuse the existing client component (no duplication)
import DiscountCodesClient from "@/app/admin/discount-codes/DiscountCodesClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function safeParsePlans(s: any): string[] {
  const t = String(s ?? "").trim();
  if (!t) return [];
  try {
    const j = JSON.parse(t);
    return Array.isArray(j) ? j.map((x) => String(x)) : [];
  } catch {
    return [];
  }
}

export default async function AdminBillingDiscountsPage() {
  const ctx = await getAdminContext();
  if (!ctx.ok) redirect("/staff");

  const roles = ctx.roles ?? [];
  const canManage =
    roles.includes("SCOUTLINE_ADMIN") ||
    roles.includes("SUPPORT_AGENT") ||
    roles.includes("BILLING_ADMIN") ||
    roles.includes("MARKETING_ADMIN");

  const codes = await prisma.discountCode.findMany({
    orderBy: { createdAt: "desc" },
    take: 500,
    include: {
      createdByAdminUser: {
        include: { user: { select: { email: true } } },
      },
      _count: { select: { applications: true } },
    },
  });

  const statsRows = await prisma.discountApplication.groupBy({
    by: ["discountCodeId", "status"],
    _count: { _all: true },
  });

  const statsByCode: Record<string, { active: number; revoked: number; expired: number }> = {};
  for (const r of statsRows) {
    const codeId = r.discountCodeId;
    if (!statsByCode[codeId]) statsByCode[codeId] = { active: 0, revoked: 0, expired: 0 };
    const n = r._count._all ?? 0;
    if (r.status === "ACTIVE") statsByCode[codeId].active += n;
    if (r.status === "REVOKED") statsByCode[codeId].revoked += n;
    if (r.status === "EXPIRED") statsByCode[codeId].expired += n;
  }

  const recentApps = await prisma.discountApplication.findMany({
    orderBy: { appliedAt: "desc" },
    take: 50,
    include: {
      discountCode: { select: { code: true, type: true, value: true } },
    },
  });

  const initialCodes = codes.map((c) => {
    const s = statsByCode[c.id] ?? { active: 0, revoked: 0, expired: 0 };
    return {
      id: c.id,
      code: c.code,
      type: c.type,
      value: c.value,
      appliesTo: c.appliesTo,
      cadence: c.cadence,
      durationType: c.durationType,
      durationMonths: c.durationMonths,
      expiresAt: c.expiresAt,
      maxRedemptions: c.maxRedemptions,
      isActive: c.isActive,
      oncePerTarget: c.oncePerTarget,

      plansAllowedJson: c.plansAllowedJson,
      plansAllowed: safeParsePlans(c.plansAllowedJson),

      allowedTargetIdsJson: c.allowedTargetIdsJson,

      createdByAdminEmail: c.createdByAdminUser?.user?.email ?? "—",
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,

      applicationsCount: c._count.applications,
      activeApps: s.active,
      revokedApps: s.revoked,
      expiredApps: s.expired,
    };
  });

  const initialRecentApps = recentApps.map((a) => ({
    id: a.id,
    discountCodeId: a.discountCodeId,
    discountCode: a.discountCode?.code ?? "—",
    targetType: a.targetType,
    targetId: a.targetId,
    planTier: a.planTier,
    cadence: a.cadence,
    status: a.status,
    appliedAt: a.appliedAt,
    endsAt: a.endsAt,
    revokedAt: a.revokedAt,
  }));

  return (
    <main style={{ padding: 24, maxWidth: 1200, fontFamily: "Arial, sans-serif", fontSize: 11 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 18, margin: 0 }}>Billing • Discount Codes</h1>
          <div style={{ opacity: 0.75, marginTop: 6 }}>
            Create / toggle / edit codes + apply/revoke (audited). {canManage ? "" : "Read-only."}
          </div>
        </div>

        {/* ✅ quick links */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <a href="/admin/billing/discounts" style={a}>Refresh</a>
          <Link href="/admin/billing/invoices" style={a}>Invoices</Link>
          <Link href="/admin/billing/subscriptions" style={a}>Subscriptions</Link>
          <Link href="/admin/billing/payouts" style={a}>Payouts</Link>
          <Link href="/admin/billing/health" style={a}>Health</Link>
          <Link href="/admin" style={a}>Back to Admin</Link>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <DiscountCodesClient initialCodes={initialCodes} initialRecentApps={initialRecentApps} canManage={canManage} />
      </div>
    </main>
  );
}

const a: React.CSSProperties = {
  color: "#2563eb",
  textDecoration: "none",
  fontWeight: 800,
};
