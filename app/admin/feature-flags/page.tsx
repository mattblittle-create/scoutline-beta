// app/admin/feature-flags/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin/getAdminContext";
import FeatureFlagsClient from "./FeatureFlagsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminFeatureFlagsPage() {
  const ctx = await getAdminContext();
  if (!ctx.ok) redirect("/staff");

  const roles = ctx.roles ?? [];
  const canManage = roles.includes("SCOUTLINE_ADMIN"); // only admins can change flags

  const flags = await prisma.featureFlag.findMany({
    orderBy: { key: "asc" },
    select: {
      id: true,
      key: true,
      description: true,
      enabled: true,
      config: true,
      createdAt: true,
      updatedAt: true,
      updatedByAdminUserId: true,
      updatedByAdminUser: {
        select: { id: true, user: { select: { email: true } } },
      },
    },
    take: 500,
  });

  const isProd = process.env.NODE_ENV === "production";

  return (
    <main style={{ padding: 24, maxWidth: 1100, fontFamily: "Arial, sans-serif", fontSize: 11 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 18, margin: 0 }}>Feature Flags</h1>
          <div style={{ opacity: 0.75, marginTop: 6 }}>
            Create, toggle, and configure flags for rollouts. All changes are audited.
          </div>
        </div>

        <Link href="/admin" style={a}>
          ← Back to Admin
        </Link>
      </div>

      <div style={{ marginTop: 14 }}>
        <FeatureFlagsClient initialFlags={flags} canManage={canManage} isProd={isProd} />
      </div>
    </main>
  );
}

const a: React.CSSProperties = {
  color: "#2563eb",
  textDecoration: "none",
  fontWeight: 800,
};
