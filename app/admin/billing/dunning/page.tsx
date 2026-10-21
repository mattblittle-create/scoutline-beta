// app/admin/billing/dunning/page.tsx

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import RetryInvoiceButton from "./RetryInvoiceButton";
import PlayerBillingStatusButtons from "./PlayerBillingStatusButtons";
import SendPaymentUpdateEmailButton from "./SendPaymentUpdateEmailButton";

export const dynamic = "force-dynamic";

function formatUSD(cents: number | null | undefined) {
  return ((cents || 0) / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function fmtDate(d?: Date | string | null) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-US");
}

export default async function AdminBillingDunningPage() {
  const now = new Date();

  const invoices = await prisma.playerInvoice.findMany({
    where: {
      status: "PAST_DUE",
    },
    orderBy: [
      { nextRetryAt: "asc" },
      { lastFailedAt: "desc" },
    ],
    take: 100,
    include: {
      playerProfile: {
        select: {
          id: true,
          email: true,
          playerBillingStatus: true,
          playerPlanTier: true,
          playerBillingCadence: true,
          playerBillingProfile: {
            select: {
              provider: true,
              paymentType: true,
              brand: true,
              last4: true,
            },
          },
        },
      },
    },
  });

  const readyForRetry = invoices.filter(
    (invoice) => !invoice.nextRetryAt || invoice.nextRetryAt <= now
  ).length;

  const totalPastDueCents = invoices.reduce(
    (sum, invoice) =>
      sum + Number(invoice.amountCents || 0) + Number(invoice.cardFeeCents || 0),
    0
  );

  return (
    <main style={{ padding: 18, maxWidth: 1300, margin: "0 auto" }}>
      <div style={headerStyle}>
        <div>
          <div style={{ color: "#64748b", fontWeight: 900 }}>
            ScoutLine Admin
          </div>
          <h1 style={{ margin: "4px 0 0", fontSize: 28 }}>
            Billing Dunning
          </h1>
          <div style={{ marginTop: 6, color: "#64748b", fontWeight: 700 }}>
            Past due invoices, retry timing, and failed billing recovery.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/admin/billing/overview" style={secondaryButtonStyle}>
            Billing Overview
          </Link>
          <Link href="/admin/billing/audit" style={secondaryButtonStyle}>
            Audit Log
          </Link>
          <Link href="/admin" style={primaryButtonStyle}>
            Back to Admin
          </Link>
        </div>
      </div>

      <section style={gridStyle}>
        <MetricCard label="Past Due Invoices" value={String(invoices.length)} />
        <MetricCard label="Ready for Retry" value={String(readyForRetry)} />
        <MetricCard label="Past Due Amount" value={formatUSD(totalPastDueCents)} />
      </section>

      <section style={tableCardStyle}>
        {invoices.length === 0 ? (
          <div style={{ color: "#64748b", fontWeight: 800 }}>
            No past due invoices right now.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <Th>Player</Th>
                  <Th>Invoice #</Th>
                  <Th>Amount</Th>
                  <Th>Card Fee</Th>
                  <Th>Total</Th>
                  <Th>Failed Attempts</Th>
                  <Th>Last Failed</Th>
                  <Th>Next Retry</Th>
                  <Th>Status</Th>
                  <Th>Billing Method</Th>
                  <Th>Failure Reason</Th>
                  <Th>Retry</Th>
                  <Th>Access</Th>
                  <Th>Payment Method</Th>
                  <Th>Email</Th>
                </tr>
              </thead>

              <tbody>
                {invoices.map((invoice) => {
                  const totalCents =
                    Number(invoice.amountCents || 0) +
                    Number(invoice.cardFeeCents || 0);

                  const billing = invoice.playerProfile.playerBillingProfile;

                  const billingMethod = billing?.last4
                    ? `${billing.paymentType || "Payment"} • ${
                        billing.brand || billing.provider || "VALOR"
                      } • **** ${billing.last4}`
                    : "No billing method";

                  const retryReady =
                    !invoice.nextRetryAt || invoice.nextRetryAt <= now;

                  return (
                    <tr key={invoice.id}>
                      <Td>
                        <div style={{ fontWeight: 950 }}>
                          {invoice.playerProfile.email}
                        </div>
                        <div style={mutedSmallStyle}>
                          {String(invoice.playerProfile.playerPlanTier)} /{" "}
                          {String(invoice.playerProfile.playerBillingCadence)}
                        </div>
                      </Td>

                      <Td>
                        <Link
                          href={`/dashboard/player/profile/billing/invoices/${invoice.id}`}
                          style={tableLinkStyle}
                        >
                          {invoice.externalId || invoice.id}
                        </Link>
                      </Td>

                      <Td>{formatUSD(invoice.amountCents)}</Td>
                      <Td>
                        {invoice.cardFeeCents > 0
                          ? formatUSD(invoice.cardFeeCents)
                          : "—"}
                      </Td>
                      <Td>{formatUSD(totalCents)}</Td>

                      <Td>{invoice.failedAttemptCount}</Td>
                      <Td>{fmtDate(invoice.lastFailedAt)}</Td>

                      <Td>
                        <div>{fmtDate(invoice.nextRetryAt)}</div>
                        {retryReady ? (
                          <div style={readyPillStyle}>Ready</div>
                        ) : null}
                      </Td>

                      <Td>
                        <span style={statusPillStyle}>
                          {invoice.playerProfile.playerBillingStatus}
                        </span>
                      </Td>

                      <Td>{billingMethod}</Td>

                      <Td>{invoice.failureReason || "—"}</Td>

                      <Td>
                        <RetryInvoiceButton invoiceId={invoice.id} />
                      </Td>

                      <Td>
                        <PlayerBillingStatusButtons
                          playerProfileId={invoice.playerProfile.id}
                          currentStatus={invoice.playerProfile.playerBillingStatus}
                        />
                      </Td>

                      <Td>
                        <Link
                          href={`/dashboard/player/profile/billing/update-payment?playerProfileId=${invoice.playerProfile.id}&invoiceId=${invoice.id}`}
                          style={tableLinkStyle}
                        >
                          Update Payment
                        </Link>
                      </Td>

                      <Td>
                        <SendPaymentUpdateEmailButton invoiceId={invoice.id} />
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={metricCardStyle}>
      <div style={{ color: "#64748b", fontSize: 12, fontWeight: 900 }}>
        {label}
      </div>
      <div style={{ marginTop: 6, fontSize: 26, fontWeight: 950 }}>
        {value}
      </div>
    </div>
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
  marginBottom: 16,
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
  marginBottom: 16,
};

const metricCardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  background: "#fff",
  padding: 16,
  boxShadow: "0 8px 18px rgba(15,23,42,0.04)",
};

const tableCardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  background: "#fff",
  padding: 16,
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px",
  fontSize: 12,
  color: "#64748b",
  fontWeight: 950,
  borderBottom: "1px solid #e5e7eb",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "10px",
  borderBottom: "1px solid #f1f5f9",
  color: "#0f172a",
  fontWeight: 700,
  verticalAlign: "top",
};

const mutedSmallStyle: React.CSSProperties = {
  marginTop: 4,
  color: "#64748b",
  fontSize: 12,
  fontWeight: 700,
};

const tableLinkStyle: React.CSSProperties = {
  color: "#0ea5e9",
  fontWeight: 900,
  textDecoration: "underline",
};

const statusPillStyle: React.CSSProperties = {
  display: "inline-flex",
  borderRadius: 999,
  padding: "4px 8px",
  background: "#fff7ed",
  color: "#9a3412",
  border: "1px solid #fed7aa",
  fontSize: 12,
  fontWeight: 950,
  whiteSpace: "nowrap",
};

const readyPillStyle: React.CSSProperties = {
  display: "inline-flex",
  marginTop: 5,
  borderRadius: 999,
  padding: "3px 7px",
  background: "#dcfce7",
  color: "#166534",
  border: "1px solid #bbf7d0",
  fontSize: 11,
  fontWeight: 950,
};

const primaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  padding: "9px 13px",
  background: "#0ea5e9",
  color: "#fff",
  border: "1px solid #0ea5e9",
  fontWeight: 900,
  textDecoration: "none",
};

const secondaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  padding: "9px 13px",
  background: "#fff",
  color: "#0f172a",
  border: "1px solid #e5e7eb",
  fontWeight: 900,
  textDecoration: "none",
};