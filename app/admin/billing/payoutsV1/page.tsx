// app/admin/billing/payoutsV1/page.tsx

import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin/getAdminContext";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function usdFromCents(cents: number) {
  const n = Number(cents || 0) / 100;
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function fmtDateTime(d?: Date | null) {
  if (!d) return "—";
  try {
    return d.toLocaleString();
  } catch {
    return String(d);
  }
}

function Pill({ label }: { label: string }) {
  return (
    <span
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid rgba(0,0,0,0.12)",
        background: "rgba(202,160,66,0.16)",
        fontWeight: 900,
        fontSize: 11,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

export default async function AdminBillingPayoutsPage() {
  const ctx = await getAdminContext();
  if (!ctx.ok) redirect("/staff");

  // Pull recent commissions (read-only dashboard)
  const commissions = await prisma.commissionEvent.findMany({
    include: {
      referral: {
        include: {
          referrerUser: { select: { id: true, email: true, name: true } },
        },
      },
      payout: { select: { id: true, status: true, paidAt: true, sentAt: true, method: true } },
    },
    orderBy: { earnedAt: "desc" },
    take: 800,
  });

  // Totals by status
  const sumBy = (status: string) =>
    commissions
      .filter((c) => String(c.status).toUpperCase() === status)
      .reduce((sum, c) => sum + (c.commissionAmountCents || 0), 0);

  const pendingCents = sumBy("PENDING");
  const eligibleCents = sumBy("ELIGIBLE");
  const paidCents = sumBy("PAID");

  // Group "what we owe" by payee (referrer user)
  type Bucket = {
    payeeUserId: string;
    payeeLabel: string;
    pendingCents: number;
    eligibleCents: number;
    paidCents: number;
    countPending: number;
    countEligible: number;
    countPaid: number;
    lastEarnedAt: Date | null;
  };

  const buckets = new Map<string, Bucket>();

  for (const c of commissions) {
    const u = c.referral?.referrerUser;
    const payeeUserId = u?.id ?? "UNKNOWN";
    const payeeLabel = u?.name ? `${u.name} (${u.email})` : u?.email ?? "Unknown referrer";

    if (!buckets.has(payeeUserId)) {
      buckets.set(payeeUserId, {
        payeeUserId,
        payeeLabel,
        pendingCents: 0,
        eligibleCents: 0,
        paidCents: 0,
        countPending: 0,
        countEligible: 0,
        countPaid: 0,
        lastEarnedAt: null,
      });
    }

    const b = buckets.get(payeeUserId)!;
    const st = String(c.status || "").toUpperCase();
    if (st === "PENDING") {
      b.pendingCents += c.commissionAmountCents || 0;
      b.countPending += 1;
    } else if (st === "ELIGIBLE") {
      b.eligibleCents += c.commissionAmountCents || 0;
      b.countEligible += 1;
    } else if (st === "PAID") {
      b.paidCents += c.commissionAmountCents || 0;
      b.countPaid += 1;
    }

    if (!b.lastEarnedAt || (c.earnedAt && c.earnedAt.getTime() > b.lastEarnedAt.getTime())) {
      b.lastEarnedAt = c.earnedAt ?? b.lastEarnedAt;
    }
  }

  const bucketRows = Array.from(buckets.values()).sort((a, b) => {
    // prioritize eligible dollars, then pending
    if (b.eligibleCents !== a.eligibleCents) return b.eligibleCents - a.eligibleCents;
    if (b.pendingCents !== a.pendingCents) return b.pendingCents - a.pendingCents;
    return a.payeeLabel.localeCompare(b.payeeLabel);
  });

  return (
    <main style={{ padding: 24, maxWidth: 1200, fontFamily: "Arial, sans-serif", fontSize: 11 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
        <div>
          <h1 style={{ fontSize: 18, margin: 0 }}>Billing • Payouts</h1>
          <div style={{ opacity: 0.75, marginTop: 6 }}>
            Referral commissions + payout readiness. (Read-only V1)
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href="/admin/billing/payouts" style={a}>Refresh</a>
            <Link href="/admin/billing/invoices" style={a}>Invoices</Link>
            <Link href="/admin/billing/subscriptions" style={a}>Subscriptions</Link>
            <Link href="/admin/billing/discounts" style={a}>Discount Codes</Link>
            <Link href="/admin/billing/health" style={a}>Health</Link>
            <Link href="/admin" style={a}>Back to Admin</Link>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Pill label={`Pending: ${usdFromCents(pendingCents)}`} />
          <Pill label={`Eligible: ${usdFromCents(eligibleCents)}`} />
          <Pill label={`Paid: ${usdFromCents(paidCents)}`} />
        </div>
      </div>

      <section style={card}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Payees ({bucketRows.length})</div>

        {bucketRows.length === 0 ? (
          <div style={{ opacity: 0.75 }}>
            No commission events yet. Once you start generating CommissionEvent rows, this page will populate automatically.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Payee", "Eligible", "Pending", "Paid", "Counts (E/P/PD)", "Last Earned"].map((h) => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bucketRows.map((r) => (
                  <tr key={r.payeeUserId}>
                    <td style={td}>{r.payeeLabel}</td>
                    <td style={td}><span style={{ fontWeight: 900 }}>{usdFromCents(r.eligibleCents)}</span></td>
                    <td style={td}><span style={{ fontWeight: 900 }}>{usdFromCents(r.pendingCents)}</span></td>
                    <td style={td}>{usdFromCents(r.paidCents)}</td>
                    <td style={td}>
                      <span style={{ fontWeight: 900 }}>
                        {r.countEligible}/{r.countPending}/{r.countPaid}
                      </span>
                    </td>
                    <td style={td}>{fmtDateTime(r.lastEarnedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={card}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Recent Commission Events ({commissions.length})</div>

        {commissions.length === 0 ? (
          <div style={{ opacity: 0.75 }}>No commission rows found.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Earned", "Eligible At", "Status", "Referrer", "Target", "Plan", "Billed", "Commission", "Payout"].map((h) => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {commissions.slice(0, 250).map((c) => {
                  const u = c.referral?.referrerUser;
                  const refLabel = u?.name ? `${u.name} (${u.email})` : u?.email ?? "—";
                  const tgt = `${c.referral?.targetType ?? "—"}:${c.referral?.targetId ?? "—"}`;
                  const payoutLabel = c.payout
                    ? `${String(c.payout.status)}${c.payout.paidAt ? ` • ${fmtDateTime(c.payout.paidAt)}` : ""}`
                    : "—";

                  return (
                    <tr key={c.id}>
                      <td style={td}>{fmtDateTime(c.earnedAt)}</td>
                      <td style={td}>{fmtDateTime(c.eligibleAt)}</td>
                      <td style={td}><code>{String(c.status)}</code></td>
                      <td style={td}>{refLabel}</td>
                      <td style={td}><code>{tgt}</code></td>
                      <td style={td}><code>{c.planTier}</code> / <code>{c.cadence}</code></td>
                      <td style={td}>{usdFromCents(c.billedAmountCents || 0)}</td>
                      <td style={td}><span style={{ fontWeight: 900 }}>{usdFromCents(c.commissionAmountCents || 0)}</span></td>
                      <td style={td}>{payoutLabel}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: 8, opacity: 0.75 }}>
          Showing up to 250 most recent rows.
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
