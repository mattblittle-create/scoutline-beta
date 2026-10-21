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
          playerBillingProfile: {
            select: {
              paymentType: true,
              brand: true,
              last4: true,
            },
          },
        },
      },
    },
  });

  if (!invoice) notFound();

  const isPaid = invoice.status === "PAID";
  const isOpen = invoice.status === "OPEN" || invoice.status === "PAST_DUE";

  const subtotalCents = invoice.amountCents || 0;
  const cardFeeCents = invoice.cardFeeCents || 0;
  const totalPaidCents = invoice.amountPaidCents || 0;
  const projectedTotalCents = subtotalCents + cardFeeCents;

  const receiptUrl =
    invoice.processorReceiptUrl || invoice.hostedUrl || null;

  const billingMethod = invoice.playerProfile.playerBillingProfile?.last4
    ? `${invoice.playerProfile.playerBillingProfile.paymentType || "Payment"} • ${
        invoice.playerProfile.playerBillingProfile.brand || ""
      } • **** ${invoice.playerProfile.playerBillingProfile.last4}`.replace(
        /\s+•\s+•/g,
        " •"
      )
    : "No billing method on file";

  return (
    <main style={{ padding: 16, maxWidth: 940, margin: "0 auto" }}>
      <div
        className="no-print"
        style={{
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <Link href="/dashboard/player/profile/billing" style={topLinkStyle}>
          ← Back to Billing
        </Link>

        <button
          type="button"
          onClick={undefined as any}
          style={printButtonStyle}
        >
          Print / Save PDF
        </button>
      </div>

      <section style={cardStyle}>
        <div style={headerRowStyle}>
          <div>
            <div style={{ color: "#64748b", fontWeight: 900 }}>
              ScoutLine Invoice
            </div>
            <h1 style={{ margin: "4px 0 0", fontSize: 28 }}>
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

        <div style={sectionGridStyle}>
          <InvoiceField label="Player" value={invoice.playerProfile.email || "—"} />
          <InvoiceField label="Plan" value={String(invoice.playerProfile.playerPlanTier || "—")} />
          <InvoiceField label="Cadence" value={invoice.cadence || String(invoice.playerProfile.playerBillingCadence || "—")} />
          <InvoiceField label="Billing Method" value={billingMethod} />
          <InvoiceField label="Invoice Date" value={fmtDate(invoice.invoiceDate)} />
          <InvoiceField label="Payment Draft Date" value={fmtDate(invoice.dueDate)} />
          <InvoiceField label="Paid Date" value={fmtDate(invoice.paidAt)} />
          <InvoiceField label="Processor Response" value={invoice.processorResponseCode || "—"} />
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={sectionTitleStyle}>Amount Breakdown</div>

          <div style={amountBoxStyle}>
            <AmountRow label="Amount Due" value={formatUSD(subtotalCents)} />
            <AmountRow
              label="Card Processing Fee"
              value={cardFeeCents > 0 ? formatUSD(cardFeeCents) : "—"}
            />
            <AmountRow
              label={isPaid ? "Amount Paid" : "Projected Total"}
              value={formatUSD(isPaid ? totalPaidCents : projectedTotalCents)}
              strong
            />
          </div>

          <div style={disclaimerStyle}>
            Debit and credit card transactions are subject to a 3% processing fee
            in accordance with applicable card network regulations and ScoutLine
            Terms &amp; Conditions. Bank account (ACH / eCheck) payments are
            available as a fee-free alternative.
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={sectionTitleStyle}>Processor Details</div>

          <div style={sectionGridStyle}>
            <InvoiceField
              label="Processor"
              value="VALOR"
            />
            <InvoiceField
              label="Transaction ID"
              value={invoice.processorTransactionId || "—"}
            />
            <InvoiceField
              label="Receipt"
              value={receiptUrl ? "Available" : "—"}
            />
            <InvoiceField
              label="Internal Invoice ID"
              value={invoice.id}
            />
          </div>
        </div>

        <div className="no-print" style={footerActionStyle}>
          <div style={{ color: "#64748b", fontWeight: 700 }}>
            {isPaid
              ? "This receipt is available for your records."
              : "This invoice has not been marked paid in ScoutLine yet."}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {receiptUrl ? (
              <a
                href={receiptUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={secondaryButtonStyle}
              >
                View Valor Receipt
              </a>
            ) : null}

            {isOpen && invoice.hostedUrl ? (
              <a
                href={invoice.hostedUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={primaryButtonStyle}
              >
                Pay Invoice
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            const btns = document.querySelectorAll('button');
            btns.forEach((btn) => {
              if (btn.textContent && btn.textContent.includes('Print')) {
                btn.addEventListener('click', () => window.print());
              }
            });
          `,
        }}
      />

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              .no-print {
                display: none !important;
              }

              body {
                background: white !important;
              }

              main {
                padding: 0 !important;
                max-width: none !important;
              }
            }
          `,
        }}
      />
    </main>
  );
}

function InvoiceField({ label, value }: { label: string; value: string }) {
  return (
    <div style={fieldStyle}>
      <div style={{ color: "#64748b", fontSize: 12, fontWeight: 900 }}>
        {label}
      </div>
      <div style={{ color: "#0f172a", fontSize: 15, fontWeight: 900 }}>
        {value}
      </div>
    </div>
  );
}

function AmountRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "10px 0",
        borderTop: "1px solid #e5e7eb",
        fontWeight: strong ? 950 : 800,
        fontSize: strong ? 18 : 15,
      }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

const topLinkStyle: React.CSSProperties = {
  color: "#0ea5e9",
  fontWeight: 900,
  textDecoration: "underline",
};

const cardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  background: "#fff",
  padding: 20,
  boxShadow: "0 10px 24px rgba(15,23,42,0.05)",
};

const headerRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "flex-start",
  marginBottom: 18,
};

const sectionGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 12,
};

const fieldStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 12,
  background: "#f8fafc",
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 950,
  color: "#0f172a",
  marginBottom: 10,
};

const amountBoxStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: "4px 14px",
  background: "#f8fafc",
};

const disclaimerStyle: React.CSSProperties = {
  marginTop: 10,
  color: "#64748b",
  fontSize: 12,
  lineHeight: 1.45,
  fontWeight: 700,
};

const footerActionStyle: React.CSSProperties = {
  marginTop: 20,
  paddingTop: 16,
  borderTop: "1px solid #e5e7eb",
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "center",
};

const primaryButtonStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: "10px 14px",
  background: "#caa042",
  color: "#0f172a",
  fontWeight: 950,
  textDecoration: "none",
  border: "1px solid #caa042",
};

const secondaryButtonStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: "10px 14px",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 950,
  textDecoration: "none",
  border: "1px solid #e5e7eb",
};

const printButtonStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: "9px 13px",
  background: "#0ea5e9",
  color: "#fff",
  fontWeight: 900,
  border: "1px solid #0ea5e9",
  cursor: "pointer",
};