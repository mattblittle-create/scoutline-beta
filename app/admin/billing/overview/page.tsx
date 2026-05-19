// app/admin/billing/overview/page.tsx

import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatUSD(cents: number) {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export default async function AdminBillingOverviewPage() {
  const now = new Date();
  const todayStart = startOfToday();
  const tomorrowStart = addDays(todayStart, 1);
  const next7Days = addDays(todayStart, 7);

  const [
    activePlayerSubscribers,
    pastDuePlayers,
    pendingCancellations,
    paidTodayAgg,
    upcomingDrafts,
    upcomingDraftAmountAgg,
    failedRetryQueue,
    recentAuditLogs,
  ] = await Promise.all([
    prisma.playerProfile.count({
      where: {
        hasActivePlayerBilling: true,
        playerBillingStatus: "Active",
      },
    }),

    prisma.playerProfile.count({
      where: {
        playerBillingStatus: {
          in: ["Past Due", "Suspended"],
        },
      },
    }),

    prisma.playerProfile.count({
      where: {
        playerCancelEffectiveAt: {
          gt: now,
        },
      },
    }),

    prisma.playerInvoice.aggregate({
      where: {
        status: "PAID",
        paidAt: {
          gte: todayStart,
          lt: tomorrowStart,
        },
      },
      _sum: {
        amountPaidCents: true,
        cardFeeCents: true,
      },
      _count: true,
    }),

    prisma.playerInvoice.count({
      where: {
        status: "UPCOMING",
        dueDate: {
          gte: todayStart,
          lt: next7Days,
        },
      },
    }),

    prisma.playerInvoice.aggregate({
      where: {
        status: "UPCOMING",
        dueDate: {
          gte: todayStart,
          lt: next7Days,
        },
      },
      _sum: {
        amountCents: true,
        cardFeeCents: true,
      },
    }),

    prisma.playerInvoice.count({
      where: {
        status: "PAST_DUE",
        OR: [
          { nextRetryAt: null },
          { nextRetryAt: { lte: now } },
        ],
      },
    }),

    prisma.billingAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const paidTodayCents = Number(paidTodayAgg._sum.amountPaidCents || 0);
  const cardFeesTodayCents = Number(paidTodayAgg._sum.cardFeeCents || 0);
  const upcomingAmountCents =
    Number(upcomingDraftAmountAgg._sum.amountCents || 0) +
    Number(upcomingDraftAmountAgg._sum.cardFeeCents || 0);

  return (
    <main style={{ padding: 18, maxWidth: 1200, margin: "0 auto" }}>
      <div style={headerStyle}>
        <div>
          <div style={{ color: "#64748b", fontWeight: 900 }}>
            ScoutLine Admin
          </div>
          <h1 style={{ margin: "4px 0 0", fontSize: 28 }}>
            Billing Overview
          </h1>
        </div>

        <Link href="/admin" style={linkButtonStyle}>
          Back to Admin
        </Link>
      </div>

      <section style={gridStyle}>
        <MetricCard
          label="Active Player Subscribers"
          value={String(activePlayerSubscribers)}
        />
        <MetricCard label="Past Due / Suspended" value={String(pastDuePlayers)} />
        <MetricCard
          label="Pending Cancellations"
          value={String(pendingCancellations)}
        />
        <MetricCard
          label="Paid Today"
          value={formatUSD(paidTodayCents)}
          sub={`${paidTodayAgg._count} paid invoice(s)`}
        />
        <MetricCard
          label="Card Fees Today"
          value={formatUSD(cardFeesTodayCents)}
        />
        <MetricCard
          label="Upcoming Drafts - 7 Days"
          value={String(upcomingDrafts)}
          sub={formatUSD(upcomingAmountCents)}
        />
        <MetricCard
          label="Retry Queue"
          value={String(failedRetryQueue)}
          sub="Past due invoices ready for retry"
        />
      </section>

      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Billing Operations</h2>
        </div>

        <div style={actionGridStyle}>
          <AdminActionLink
            href="/admin/billing/dunning"
            title="Dunning / Recovery"
            text="Review failed payments, retry invoices, suspend access, and recover billing methods."
          />
          <AdminActionLink
            href="/admin/billing/invoices"
            title="Invoices"
            text="Review billing invoices and payment states."
          />
          <AdminActionLink
            href="/admin/billing/health"
            title="Billing Health"
            text="Review billing system status and integrity checks."
          />
          <AdminActionLink
            href="/admin/billing/discounts"
            title="Discounts"
            text="Manage discount and referral billing tools."
          />
          <AdminActionLink
            href="/admin/billing/payouts"
            title="Payouts"
            text="Review commissions and payout activity."
          />
        </div>
      </section>

      <section style={sectionStyle}>
        <div style={sectionHeaderStyle}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Recent Billing Audit Logs</h2>
        </div>

        {recentAuditLogs.length === 0 ? (
          <div style={{ color: "#64748b", fontWeight: 700 }}>
            No billing audit events yet.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <Th>Time</Th>
                  <Th>Event</Th>
                  <Th>Target</Th>
                  <Th>Message</Th>
                </tr>
              </thead>
              <tbody>
                {recentAuditLogs.map((log) => (
                  <tr key={log.id}>
                    <Td>{log.createdAt.toLocaleString("en-US")}</Td>
                    <Td>{log.eventType}</Td>
                    <Td>
                      {log.targetType}:{log.targetId}
                    </Td>
                    <Td>{log.message}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div style={metricCardStyle}>
      <div style={{ color: "#64748b", fontSize: 12, fontWeight: 900 }}>
        {label}
      </div>
      <div style={{ marginTop: 6, fontSize: 26, fontWeight: 950 }}>
        {value}
      </div>
      {sub ? (
        <div style={{ marginTop: 6, color: "#64748b", fontWeight: 700 }}>
          {sub}
        </div>
      ) : null}
    </div>
  );
}

function AdminActionLink({
  href,
  title,
  text,
}: {
  href: string;
  title: string;
  text: string;
}) {
  return (
    <Link href={href} style={actionCardStyle}>
      <div style={{ fontWeight: 950, color: "#0f172a" }}>{title}</div>
      <div style={{ marginTop: 5, color: "#64748b", fontWeight: 700 }}>
        {text}
      </div>
    </Link>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={thStyle}>{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={tdStyle}>{children}</td>;
}

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "center",
  marginBottom: 18,
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: 12,
};

const metricCardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  background: "#fff",
  padding: 16,
  boxShadow: "0 8px 18px rgba(15,23,42,0.04)",
};

const sectionStyle: React.CSSProperties = {
  marginTop: 16,
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  background: "#fff",
  padding: 16,
};

const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  marginBottom: 12,
};

const actionGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};

const actionCardStyle: React.CSSProperties = {
  display: "block",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 14,
  textDecoration: "none",
  background: "#f8fafc",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 10px",
  fontSize: 12,
  fontWeight: 950,
  color: "#64748b",
  borderBottom: "1px solid #e5e7eb",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 10px",
  borderBottom: "1px solid #f1f5f9",
  color: "#0f172a",
  fontWeight: 700,
  verticalAlign: "top",
};

const linkButtonStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: "9px 13px",
  background: "#0ea5e9",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 900,
};