// app/admin/billing/invoices/page.tsx

import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin/getAdminContext";
import MarkPaidButton from "./MarkPaidButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function fmtDate(d?: Date | null) {
  if (!d) return "—";
  try {
    return d.toLocaleDateString();
  } catch {
    return String(d);
  }
}

function asTs(d?: Date | null) {
  if (!d) return null;
  const t = d.getTime?.();
  return Number.isFinite(t) ? t : null;
}

function usdFromCents(cents: number) {
  const n = Number(cents || 0) / 100;
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function normalizeQ(v: any) {
  const q = String(v ?? "").trim();
  return q.length ? q : "";
}

function includesLoose(hay: string, needle: string) {
  return String(hay || "").toLowerCase().includes(String(needle || "").toLowerCase());
}

function StatusPill({ label }: { label: string }) {
  const L = String(label || "—").toUpperCase();

  let border = "1px solid rgba(148,163,184,0.35)";
  let bg = "rgba(148,163,184,0.10)";
  let color = "#475569";

  if (L === "PAID") {
    border = "1px solid rgba(34,197,94,0.35)";
    bg = "rgba(34,197,94,0.10)";
    color = "#0f172a";
  } else if (L === "PAST_DUE") {
    border = "1px solid rgba(239,68,68,0.35)";
    bg = "rgba(239,68,68,0.10)";
    color = "#7f1d1d";
  } else if (L === "OPEN") {
    border = "1px solid rgba(234,179,8,0.35)";
    bg = "rgba(234,179,8,0.14)";
    color = "#0f172a";
  } else if (L === "UPCOMING") {
    border = "1px solid rgba(59,130,246,0.35)";
    bg = "rgba(59,130,246,0.10)";
    color = "#0f172a";
  } else if (L === "VOID" || L === "CANCELED" || L === "CANCELLED") {
    border = "1px solid rgba(100,116,139,0.35)";
    bg = "rgba(100,116,139,0.10)";
    color = "#334155";
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

type InvoiceRow = {
  type: "PLAYER" | "TEAM";
  accountLabel: string;
  accountId: string;
  invoiceId: string;
  status: string;
  amountCents: number;
  dateLabel: string;
  dateTs: number | null;
  hostedUrl: string | null;
  viewLink: string;
};

function InvoiceTable({ rows, showDevActions }: { rows: InvoiceRow[]; showDevActions: boolean }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["Type", "Account", "Invoice ID", "Status", "Amount", "Date", "Actions"].map((h) => (
              <th key={h} style={th}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const st = String(r.status || "").toUpperCase();
            const showMarkPaid = showDevActions && st !== "PAID" && st !== "VOID";

            return (
              <tr key={`${r.type}:${r.invoiceId}`}>
                <td style={td}>
                  <span style={miniPill}>{r.type}</span>
                </td>
                <td style={td}>{r.accountLabel}</td>
                <td style={td}>
                  <code>{r.invoiceId}</code>
                </td>
                <td style={td}>
                  <StatusPill label={r.status} />
                </td>
                <td style={td}>
                  <span style={{ fontWeight: 900 }}>{usdFromCents(r.amountCents || 0)}</span>
                </td>
                <td style={td}>{r.dateLabel}</td>
                <td style={td}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <ActionButton href={r.viewLink}>View</ActionButton>
                    {r.hostedUrl ? (
                      <ActionButton href={r.hostedUrl} target="_blank">
                        Hosted
                      </ActionButton>
                    ) : null}
                    {showMarkPaid ? (
                      <MarkPaidButton type={r.type} invoiceId={r.invoiceId} amountCents={r.amountCents} />
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function AdminBillingInvoicesPage({ searchParams }: { searchParams?: { q?: string } }) {
  const ctx = await getAdminContext();
  if (!ctx.ok) redirect("/staff");

  const isDev = process.env.NODE_ENV !== "production";

  const q = normalizeQ(searchParams?.q);
  const hasQ = q.length >= 2;

  const playerWhere: any = hasQ
    ? {
        OR: [
          { email: { contains: q, mode: "insensitive" } },
          {
            user: {
              is: {
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { email: { contains: q, mode: "insensitive" } },
                  { slug: { contains: q, mode: "insensitive" } },
                ],
              },
            },
          },
        ],
      }
    : undefined;

  const teamWhere: any = hasQ
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
        ],
      }
    : undefined;

  const players = await prisma.playerProfile.findMany({
    where: playerWhere,
    select: {
      id: true,
      email: true,
      user: { select: { name: true, email: true, slug: true } },
      playerInvoices: {
        select: {
          id: true,
          status: true,
          invoiceDate: true,
          dueDate: true,
          amountCents: true,
          hostedUrl: true,
          createdAt: true,
        },
        orderBy: { invoiceDate: "desc" },
        take: 60,
      },
    },
    orderBy: { createdAt: "desc" },
    take: hasQ ? 60 : 20,
  });

  const teams = await prisma.team.findMany({
    where: teamWhere,
    select: {
      id: true,
      name: true,
      slug: true,
      invoices: {
        select: {
          id: true,
          status: true,
          periodStart: true,
          amountCents: true,
          hostedUrl: true,
          createdAt: true,
        },
        orderBy: { periodStart: "desc" },
        take: 60,
      },
    },
    orderBy: { createdAt: "desc" },
    take: hasQ ? 500 : 500,
  });

  const all: InvoiceRow[] = [];

  for (const p of players) {
    for (const i of p.playerInvoices || []) {
      const d = i.invoiceDate ?? i.dueDate ?? i.createdAt ?? null;
      all.push({
        type: "PLAYER",
        accountLabel: p.user?.name ? `${p.user.name} (${p.email})` : p.email,
        accountId: p.id,
        invoiceId: i.id,
        status: String(i.status || "—"),
        amountCents: Number(i.amountCents || 0),
        dateLabel: fmtDate(d),
        dateTs: asTs(d),
        hostedUrl: i.hostedUrl ?? null,
        viewLink: `/admin/players/${encodeURIComponent(p.id)}`,
      });
    }
  }

  for (const t of teams) {
    const label = `${t.name} (${t.slug})`;
    for (const i of t.invoices || []) {
      const d = i.periodStart ?? i.createdAt ?? null;
      all.push({
        type: "TEAM",
        accountLabel: label,
        accountId: t.id,
        invoiceId: i.id,
        status: String(i.status || "—"),
        amountCents: Number(i.amountCents || 0),
        dateLabel: fmtDate(d),
        dateTs: asTs(d),
        hostedUrl: i.hostedUrl ?? null,
        viewLink: `/admin/teams/${encodeURIComponent(t.id)}`,
      });
    }
  }

  all.sort((a, b) => {
    const at = a.dateTs;
    const bt = b.dateTs;
    const aOk = typeof at === "number" && Number.isFinite(at);
    const bOk = typeof bt === "number" && Number.isFinite(bt);
    if (aOk && bOk) return bt - at;
    if (aOk) return -1;
    if (bOk) return 1;
    return String(a.accountLabel).localeCompare(String(b.accountLabel));
  });

  const filtered = hasQ ? all.filter((r) => includesLoose(r.accountLabel, q) || includesLoose(r.invoiceId, q)) : all;

  const byStatus = (s: string) => filtered.filter((x) => String(x.status).toUpperCase() === s);
  const pastDue = byStatus("PAST_DUE");
  const open = byStatus("OPEN");
  const upcoming = byStatus("UPCOMING");
  const paid = byStatus("PAID");

  return (
    <main style={{ padding: 24, maxWidth: 1200, fontFamily: "Arial, sans-serif", fontSize: 11 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
        <div>
          <h1 style={{ fontSize: 18, margin: 0 }}>Billing • Invoices</h1>
          <div style={{ opacity: 0.75, marginTop: 6 }}>Canonical invoices view. (Players + Teams)</div>

          <form method="GET" style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <input name="q" defaultValue={q} placeholder="Search player name/email or team name/slug" style={searchInput} />
            <button type="submit" style={btn}>
              Search
            </button>
            {q ? (
              <a href="/admin/billing/invoices" style={a}>
                Clear
              </a>
            ) : null}
            <span style={{ opacity: 0.7, fontWeight: 800 }}>Tip: 2+ chars. Matches email/name/slug and invoice id.</span>
          </form>

          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href={q ? `/admin/billing/invoices?q=${encodeURIComponent(q)}` : "/admin/billing/invoices"} style={a}>
              Refresh
            </a>
            <Link href="/admin/billing/subscriptions" style={a}>
              Subscriptions
            </Link>
            <Link href="/admin/billing/discounts" style={a}>
              Discount Codes
            </Link>
            <Link href="/admin/billing/payouts" style={a}>
              Payouts
            </Link>
            <Link href="/admin/billing/health" style={a}>
              Health
            </Link>
            <Link href="/admin" style={a}>
              Back to Admin
            </Link>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {isDev ? <div style={pill}>DEV: Mark Paid enabled</div> : null}
          <div style={pill}>Results: {filtered.length}</div>
          <div style={pill}>Past Due: {pastDue.length}</div>
          <div style={pill}>Open: {open.length}</div>
          <div style={pill}>Upcoming: {upcoming.length}</div>
          <div style={pill}>Paid: {paid.length}</div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
        <section style={card}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Past Due Invoices ({pastDue.length})</div>
          {pastDue.length === 0 ? <div style={{ opacity: 0.75 }}>None 🎉</div> : <InvoiceTable rows={pastDue} showDevActions={isDev} />}
        </section>

        <section style={card}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Open Invoices ({open.length})</div>
          {open.length === 0 ? <div style={{ opacity: 0.75 }}>None</div> : <InvoiceTable rows={open} showDevActions={isDev} />}
        </section>

        <section style={card}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Upcoming Invoices ({upcoming.length})</div>
          {upcoming.length === 0 ? <div style={{ opacity: 0.75 }}>None</div> : <InvoiceTable rows={upcoming} showDevActions={isDev} />}
        </section>

        <section style={card}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Paid Invoices ({paid.length})</div>
          {paid.length === 0 ? <div style={{ opacity: 0.75 }}>None</div> : <InvoiceTable rows={paid} showDevActions={isDev} />}
        </section>

        <section style={card}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>All Recent Invoices ({filtered.length})</div>
          {filtered.length === 0 ? (
            <div style={{ opacity: 0.75 }}>No invoice rows found.</div>
          ) : (
            <InvoiceTable rows={filtered.slice(0, 200)} showDevActions={isDev} />
          )}
          <div style={{ marginTop: 8, opacity: 0.75 }}>Showing up to 200 most recent rows. (Increase if you want.)</div>
        </section>
      </div>
    </main>
  );
}

/* styles */
const card: React.CSSProperties = {
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

const miniPill: React.CSSProperties = {
  display: "inline-block",
  padding: "4px 10px",
  borderRadius: 999,
  border: "1px solid rgba(0,0,0,0.12)",
  background: "#fff",
  fontWeight: 900,
  fontSize: 11,
  whiteSpace: "nowrap",
};

const searchInput: React.CSSProperties = {
  width: "min(520px, 78vw)",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "10px 12px",
  outline: "none",
  background: "#fff",
  fontSize: 12,
  fontWeight: 800,
};

const btn: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #caa042",
  background: "#caa042",
  color: "#0f172a",
  fontWeight: 900,
  cursor: "pointer",
};
