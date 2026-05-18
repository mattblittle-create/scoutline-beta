// app/dashboard/player/profile/billing/invoices/[invoiceId]/page.tsx

// app/dashboard/player/profile/billing/invoices/[invoiceId]/page.tsx

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

function formatUSD(cents: number | null | undefined) {
  const dollars = (cents || 0) / 100;
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function fmtDate(d?: Date | string | null) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US");
}

export default async function PlayerInvoiceDetailPage({
  params,
}: {
  params: { invoiceId: string };
}) {
  const invoice = await prisma.playerInvoice.findUnique({
    where: { id: params.invoiceId },
    include: {
      playerProfile: {
        select: {
          id: true,
          email: true,
          playerPlanTier: true,
          playerBillingCadence: true,
        },
      },
    },
  });

  if (!invoice) notFound();

  const isPaid = invoice.status === "PAID";
  const isOpen =
    invoice.status === "OPEN" || invoice.status === "PAST_DUE";

  return (
    <main style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 16 }}>
        <Link
          href="/dashboard/player/profile/billing"
          style={{
            color: "#0ea5e9",
            fontWeight: 900,
            textDecoration: "underline",
          }}
        >
          ← Back to Billing
        </Link>
      </div>

      <section
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 18,
          background: "#fff",
          padding: 20,
          boxShadow: "0 10px 24px rgba(15,23,42,0.05)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "flex-start",
            marginBottom: 18,
          }}
        >
          <div>
            <div style={{ color: "#64748b", fontWeight: 800 }}>
              ScoutLine Invoice
            </div>
            <h1 style={{ margin: "4px 0 0", fontSize: 26 }}>
              {invoice.externalId || invoice.id}
            </h1>
          </div>

          <div
            style={{
              borderRadius: 999,
              padding: "8px 12px",
              fontWeight: 950,
              background: isPaid ? "#dcfce7" : "#fff7ed",
              color: isPaid ? "#166534" : "#9a3412",
              border: isPaid ? "1px solid #bbf7d0" : "1px solid #fed7aa",
            }}
          >
            {invoice.status}
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          <InvoiceField label="Player" value={invoice.playerProfile.email || "—"} />
          <InvoiceField label="Plan" value={String(invoice.playerProfile.playerPlanTier || "—")} />
          <InvoiceField label="Cadence" value={invoice.cadence || String(invoice.playerProfile.playerBillingCadence || "—")} />
          <InvoiceField label="Invoice Date" value={fmtDate(invoice.invoiceDate)} />
          <InvoiceField label="Payment Due Date" value={fmtDate(invoice.dueDate)} />
          <InvoiceField label="Paid Date" value={fmtDate(invoice.paidAt)} />
          <InvoiceField label="Amount Due" value={formatUSD(invoice.amountCents)} />
          <InvoiceField label="Amount Paid" value={formatUSD(invoice.amountPaidCents)} />
        </div>

        <div
          style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div style={{ color: "#64748b", fontWeight: 700 }}>
            {isPaid
              ? "This receipt is available for your records."
              : "This invoice has not been marked paid in ScoutLine yet."}
          </div>

          {isOpen && invoice.hostedUrl ? (
            <a
              href={invoice.hostedUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                borderRadius: 999,
                padding: "10px 14px",
                background: "#caa042",
                color: "#0f172a",
                fontWeight: 950,
                textDecoration: "none",
                border: "1px solid #caa042",
              }}
            >
              Pay Invoice
            </a>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function InvoiceField({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        padding: 12,
        background: "#f8fafc",
      }}
    >
      <div style={{ color: "#64748b", fontSize: 12, fontWeight: 900 }}>
        {label}
      </div>
      <div style={{ color: "#0f172a", fontSize: 16, fontWeight: 900 }}>
        {value}
      </div>
    </div>
  );
}