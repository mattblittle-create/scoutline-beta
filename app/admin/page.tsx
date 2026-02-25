// app/admin/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminContext } from "@/lib/admin/getAdminContext";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function Btn({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "10px 14px",
        borderRadius: 12,
        border: "1px solid #0ea5e9",
        background: "#0369a1",
        color: "#fff",
        fontWeight: 900,
        textDecoration: "none",
        fontSize: 12,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </Link>
  );
}

export default async function AdminHomePage() {
  const ctx = await getAdminContext();
  if (!ctx.ok) redirect("/staff");

  return (
    <main style={{ padding: 24, maxWidth: 1100, fontFamily: "Arial, sans-serif", fontSize: 11 }}>
      <h1 style={{ fontSize: 18, margin: 0 }}>Admin</h1>
      <div style={{ opacity: 0.75, marginTop: 6, marginBottom: 14 }}>
        Quick access to core tools.
      </div>

      <section
        style={{
          border: "1px solid rgba(0,0,0,0.10)",
          borderRadius: 12,
          padding: 14,
          background: "#fff",
        }}
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {/* Order requested:
              Search, Invoices, Subscriptions, Discount Codes, Payouts, Audit Log, Feature Flags, Health
          */}
          <Btn href="/admin/search" label="Search" />
          <Btn href="/admin/billing/invoices" label="Invoices" />
          <Btn href="/admin/billing/subscriptions" label="Subscriptions" />
          <Btn href="/admin/billing/discounts" label="Discount Codes" />
          <Btn href="/admin/billing/payouts" label="Payouts" />
          <Btn href="/admin/audit-log" label="Audit Log" />
          <Btn href="/admin/feature-flags" label="Feature Flags" />
          <Btn href="/admin/billing/health" label="Health" />
        </div>
      </section>
    </main>
  );
}
