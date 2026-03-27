// app/admin/page.tsx
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export default async function AdminHomePage() {
  const { user, admin } = await requireAdmin("/staff");

  return (
    <main style={{ padding: 24, fontFamily: "Arial, sans-serif", fontSize: 11 }}>
      <h1 style={{ fontSize: 18, marginBottom: 6 }}>ScoutLine Admin</h1>
      <div style={{ opacity: 0.8, marginBottom: 16 }}>
        Signed in as <b>{user.email}</b> · Roles:{" "}
        <b>{admin.roles.map((r) => r.role).join(", ") || "None"}</b>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href="/admin/search">Search</Link>
        <Link href="/admin/billing/subscriptions">Subscriptions</Link>
        <Link href="/admin/billing/discounts">Discount Codes</Link>
        <Link href="/admin/audit">Audit Log</Link>
        <Link href="/admin/system/flags">Feature Flags</Link>
        <Link href="/admin/demo">Demo (old)</Link>
      </div>
    </main>
  );
}
