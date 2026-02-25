// app/admin/billing/subscriptions/page.tsx

import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin/getAdminContext";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Cadence = "monthly" | "annual" | string;

function fmtDate(d?: Date | null) {
  if (!d) return "—";
  try {
    return d.toLocaleDateString();
  } catch {
    return String(d);
  }
}

function usdFromCents(cents: number) {
  const n = Number(cents || 0) / 100;
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function computeMRRARR(args: { cadence: Cadence; amountCents: number }) {
  const amount = Math.max(0, Number(args.amountCents || 0));
  const cadence = String(args.cadence || "").toLowerCase();
  if (cadence === "annual" || cadence === "year" || cadence === "yearly") {
    return { mrrCents: Math.round(amount / 12), arrCents: amount };
  }
  return { mrrCents: amount, arrCents: amount * 12 };
}

function asTs(d?: Date | null) {
  if (!d) return null;
  const t = d.getTime?.();
  return Number.isFinite(t) ? t : null;
}

function StatusPill({ label }: { label: string }) {
  const L = String(label || "—").toUpperCase();

  let border = "1px solid rgba(148,163,184,0.35)";
  let bg = "rgba(148,163,184,0.10)";
  let color = "#475569";

  if (L === "ACTIVE" || L === "PAID") {
    border = "1px solid rgba(34,197,94,0.35)";
    bg = "rgba(34,197,94,0.10)";
    color = "#0f172a";
  } else if (L === "PAST_DUE") {
    border = "1px solid rgba(239,68,68,0.35)";
    bg = "rgba(239,68,68,0.10)";
    color = "#7f1d1d";
  } else if (L === "CANCELED" || L === "VOID") {
    border = "1px solid rgba(100,116,139,0.35)";
    bg = "rgba(100,116,139,0.10)";
    color = "#334155";
  } else if (L === "OPEN") {
    border = "1px solid rgba(234,179,8,0.35)";
    bg = "rgba(234,179,8,0.14)";
    color = "#0f172a";
  }

  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        border,
        background: bg,
        color,
        fontWeight: 900,
        fontSize: 11,
        whiteSpace: "nowrap",
      }}
    >
      {L}
    </span>
  );
}

function PlanPill({ label }: { label: string }) {
  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        border: "1px solid rgba(0,0,0,0.12)",
        background: "#fff",
        fontWeight: 900,
        fontSize: 11,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function ActionButton({ href, children, target }: { href: string; children: React.ReactNode; target?: string }) {
  return (
    <a
      href={href}
      target={target}
      rel={target ? "noreferrer" : undefined}
      style={{
        padding: "6px 10px",
        borderRadius: 8,
        border: "1px solid #0ea5e9",
        background: "#fff",
        fontSize: 11,
        fontWeight: 900,
        textDecoration: "none",
        color: "#2563eb",
        whiteSpace: "nowrap",
        display: "inline-block",
      }}
    >
      {children}
    </a>
  );
}

export default async function AdminBillingSubscriptionsPage() {
  const ctx = await getAdminContext();
  if (!ctx.ok) redirect("/staff");

  // Minimal invoices pull: only need enough to derive “next bill” + implied amount
  const playerProfiles = await prisma.playerProfile.findMany({
    select: {
      id: true,
      email: true,
      playerPlanTier: true,
      playerBillingCadence: true,
      playerBillingStatus: true,
      playerCancelEffectiveAt: true,
      createdAt: true,
      playerInvoices: {
        select: {
          status: true,
          cadence: true,
          invoiceDate: true,
          dueDate: true,
          amountCents: true,
          createdAt: true,
        },
        orderBy: { invoiceDate: "desc" },
        take: 6,
      },
    },
    orderBy: { createdAt: "desc" },
    take: 250,
  });

  const teams = await prisma.team.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      planTier: true,
      billingCadence: true,
      billingStatus: true,
      cancelEffectiveAt: true,
      createdAt: true,
      invoices: {
        select: {
          status: true,
          periodStart: true,
          amountCents: true,
          createdAt: true,
        },
        orderBy: { periodStart: "desc" },
        take: 6,
      },
    },
    orderBy: { createdAt: "desc" },
    take: 250,
  });

  function nextPlayerInvoice(inv: any[]) {
    const upcoming = inv.find((x) => x.status === "UPCOMING" || x.status === "OPEN");
    return upcoming ?? inv[0] ?? null;
  }
  function nextTeamInvoice(inv: any[]) {
    const upcoming = inv.find((x) => x.status === "UPCOMING" || x.status === "OPEN");
    return upcoming ?? inv[0] ?? null;
  }

  const subscriptionRows: any[] = [];

  for (const p of playerProfiles) {
    const inv = nextPlayerInvoice(p.playerInvoices || []);
    const amountCents = inv?.amountCents ?? 0;
    const cadence = String(p.playerBillingCadence || inv?.cadence || "monthly");
    const { mrrCents, arrCents } = computeMRRARR({ cadence, amountCents });

    const nextDate = inv?.invoiceDate ?? inv?.dueDate ?? null;

    subscriptionRows.push({
      type: "PLAYER",
      id: p.id,
      label: p.email,
      plan: String(p.playerPlanTier || "REDSHIRT"),
      cadence,
      status: String(p.playerBillingStatus || "—"),
      nextBillLabel: fmtDate(nextDate),
      nextBillTs: asTs(nextDate),
      mrrCents,
      arrCents,
      cancelEffectiveAt: fmtDate(p.playerCancelEffectiveAt),
      viewLink: `/admin/players/${encodeURIComponent(p.id)}`,
    });
  }

  for (const t of teams) {
    const inv = nextTeamInvoice(t.invoices || []);
    const amountCents = inv?.amountCents ?? 0;
    const cadence = String(t.billingCadence || "monthly");
    const { mrrCents, arrCents } = computeMRRARR({ cadence, amountCents });

    const nextDate = inv?.periodStart ?? inv?.createdAt ?? null;

    subscriptionRows.push({
      type: "TEAM",
      id: t.id,
      label: `${t.name} (${t.slug})`,
      plan: String(t.planTier || "TEAM"),
      cadence,
      status: String(t.billingStatus || "—"),
      nextBillLabel: fmtDate(nextDate),
      nextBillTs: asTs(nextDate),
      mrrCents,
      arrCents,
      cancelEffectiveAt: fmtDate(t.cancelEffectiveAt),
      viewLink: `/admin/teams/${encodeURIComponent(t.id)}`,
    });
  }

  const totalMRR = subscriptionRows.reduce((sum, r) => sum + (r.mrrCents || 0), 0);
  const totalARR = subscriptionRows.reduce((sum, r) => sum + (r.arrCents || 0), 0);

  subscriptionRows.sort((a, b) => {
    const at = a.nextBillTs;
    const bt = b.nextBillTs;
    const aOk = typeof at === "number" && Number.isFinite(at);
    const bOk = typeof bt === "number" && Number.isFinite(bt);
    if (aOk && bOk) return at - bt;
    if (aOk) return -1;
    if (bOk) return 1;
    return String(a.label).localeCompare(String(b.label));
  });

  return (
    <main style={{ padding: 24, maxWidth: 1200, fontFamily: "Arial, sans-serif", fontSize: 11 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
        <div>
          <h1 style={{ fontSize: 18, margin: 0 }}>Billing • Subscriptions</h1>
          <div style={{ opacity: 0.75, marginTop: 6 }}>
            Canonical subscription view. (Players + Teams)
          </div>

          {/* ✅ Quick links */}
          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href="/admin/billing/subscriptions" style={a}>Refresh</a>
            <Link href="/admin/billing/invoices" style={a}>Invoices</Link>
            <Link href="/admin/billing/discounts" style={a}>Discount Codes</Link>
            <Link href="/admin/billing/payouts" style={a}>Payouts</Link>
            <Link href="/admin/billing/health" style={a}>Health</Link>
            <Link href="/admin" style={a}>Back to Admin</Link>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={pill}>Total MRR: {usdFromCents(totalMRR)}</div>
          <div style={pill}>Total ARR: {usdFromCents(totalARR)}</div>
        </div>
      </div>

      <section style={card}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Subscriptions ({subscriptionRows.length})</div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Type", "Account", "Plan", "Cadence", "Status", "Next Bill", "MRR", "ARR", "Cancel Effective", "Actions"].map((h) => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subscriptionRows.map((r) => (
                <tr key={`${r.type}:${r.id}`}>
                  <td style={td}><PlanPill label={r.type} /></td>
                  <td style={td}>{r.label}</td>
                  <td style={td}><PlanPill label={r.plan} /></td>
                  <td style={td}><PlanPill label={String(r.cadence || "—")} /></td>
                  <td style={td}><StatusPill label={r.status} /></td>
                  <td style={td}>{r.nextBillLabel}</td>
                  <td style={td}>{usdFromCents(r.mrrCents)}</td>
                  <td style={td}>{usdFromCents(r.arrCents)}</td>
                  <td style={td}>{r.cancelEffectiveAt}</td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <ActionButton href={r.viewLink}>View</ActionButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

/* styles */
const card: React.CSSProperties = {
  marginTop: 14,
  border: "1px solid rgba(0,0,0,0.10)",
  borderRadius: 12,
  padding: 14,
  background: "#fff",
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  borderBottom: "1px solid rgba(0,0,0,0.10)",
  fontWeight: 900,
  fontSize: 11,
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: "8px 10px",
  borderBottom: "1px solid rgba(0,0,0,0.06)",
  fontSize: 11,
  verticalAlign: "top",
};

const a: React.CSSProperties = {
  color: "#2563eb",
  textDecoration: "none",
  fontWeight: 800,
};

const pill: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(0,0,0,0.12)",
  background: "rgba(202,160,66,0.16)",
  fontWeight: 900,
};
