// app/dashboard/player/profile/billing/PlayerBillingInvoices.tsx

"use client";

import React from "react";

function formatUSD(cents: number) {
  const dollars = cents / 100;
  return dollars.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("en-US");
}

export default function PlayerBillingInvoices(props: {
  invoices: Array<{
    id: string;
    externalId: string | null;
    status: string;
    invoiceDate: string | Date;
    dueDate: string | Date;
    amountCents: number;
    amountPaidCents: number;
    paidAt: string | Date | null;
    hostedUrl: string | null;
  }>;
}) {
  const invoices = props.invoices || [];

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "#fff" }}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>Invoices</div>

      {invoices.length === 0 ? (
        <div style={{ color: "#64748b", fontWeight: 700 }}>No invoices yet.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
            <thead>
              <tr>
                {["Invoice #", "Invoice Date", "Amount Due", "Payment Due Date", "Amount Paid", "Paid Date", "Status", ""].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      fontSize: 12,
                      color: "#64748b",
                      fontWeight: 900,
                      padding: "10px 10px",
                      borderBottom: "1px solid #e5e7eb",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td style={{ padding: "10px 10px", borderBottom: "1px solid #f1f5f9", fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap" }}>
                  {inv.externalId || "—"}
                </td>
                <td style={{ padding: "10px 10px", borderBottom: "1px solid #f1f5f9", fontWeight: 800, color: "#0f172a" }}>
                  {fmtDate(inv.invoiceDate)}
                </td>
                  <td style={{ padding: "10px 10px", borderBottom: "1px solid #f1f5f9", fontWeight: 800 }}>
                    {formatUSD(inv.amountCents)}
                  </td>
                  <td style={{ padding: "10px 10px", borderBottom: "1px solid #f1f5f9" }}>{fmtDate(inv.dueDate)}</td>
                  <td style={{ padding: "10px 10px", borderBottom: "1px solid #f1f5f9" }}>{formatUSD(inv.amountPaidCents)}</td>
                  <td style={{ padding: "10px 10px", borderBottom: "1px solid #f1f5f9" }}>{fmtDate(inv.paidAt)}</td>
                  <td style={{ padding: "10px 10px", borderBottom: "1px solid #f1f5f9", fontWeight: 800, color: "#0f172a" }}>
                    {inv.status}
                  </td>
                  <td style={{ padding: "10px 10px", borderBottom: "1px solid #f1f5f9", textAlign: "right" }}>
                    {inv.hostedUrl ? (
                      <a
                        href={inv.hostedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "#0ea5e9", fontWeight: 800, textDecoration: "underline", whiteSpace: "nowrap" }}
                      >
                        View / Pay
                      </a>
                    ) : (
                      <span style={{ color: "#94a3b8", fontWeight: 700 }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
