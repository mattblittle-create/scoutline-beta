// app/dashboard/team/billing/BillingInvoices.tsx

import React from "react";

function formatUSD(cents: number) {
  const dollars = cents / 100;
  return dollars.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function fmtDate(d?: Date | null) {
  if (!d) return "—";
  return d.toLocaleDateString("en-US");
}

export default function BillingInvoices(props: {
  invoices: Array<{
    id: string;
    status: string;
    amountCents: number;
    hostedUrl?: string | null;
    createdAt: Date;
    periodEnd: Date;
    paidAt?: Date | null;
  }>;
}) {
  const rows = props.invoices || [];

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "#fff" }}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>Invoices</div>

      {rows.length === 0 ? (
        <div style={{ color: "#64748b" }}>No invoices yet.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "8px 6px", color: "#64748b", fontSize: 12 }}>Invoice Date</th>
                <th style={{ textAlign: "right", padding: "8px 6px", color: "#64748b", fontSize: 12 }}>Amount Due</th>
                <th style={{ textAlign: "left", padding: "8px 6px", color: "#64748b", fontSize: 12 }}>Payment Due Date</th>
                <th style={{ textAlign: "right", padding: "8px 6px", color: "#64748b", fontSize: 12 }}>Amount Paid</th>
                <th style={{ textAlign: "left", padding: "8px 6px", color: "#64748b", fontSize: 12 }}>Paid Date</th>
                <th style={{ textAlign: "right", padding: "8px 6px", color: "#64748b", fontSize: 12 }}>Invoice</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((inv) => {
                const amountPaid = inv.status === "PAID" ? inv.amountCents : 0;

                return (
                  <tr key={inv.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "10px 6px" }}>{fmtDate(inv.createdAt)}</td>
                    <td style={{ padding: "10px 6px", textAlign: "right" }}>{formatUSD(inv.amountCents)}</td>
                    <td style={{ padding: "10px 6px" }}>{fmtDate(inv.periodEnd)}</td>
                    <td style={{ padding: "10px 6px", textAlign: "right" }}>{formatUSD(amountPaid)}</td>
                    <td style={{ padding: "10px 6px" }}>{fmtDate(inv.paidAt ?? null)}</td>
                    <td style={{ padding: "10px 6px", textAlign: "right" }}>
                      {inv.hostedUrl ? (
                        <a href={inv.hostedUrl} style={{ color: "#0369a1", fontWeight: 700 }}>
                          View / Pay
                        </a>
                      ) : (
                        <span style={{ color: "#94a3b8" }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>
        Upcoming + historical invoices (paid/past due). Hosted invoice links will appear once wired to payment page.
      </div>
    </div>
  );
}
