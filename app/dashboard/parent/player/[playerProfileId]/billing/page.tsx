// app/dashboard/parent/player/[playerProfileId]/billing/page.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import ParentBillingActions from "./ParentBillingActions";
import { getTeamSponsoredBillingInfo } from "@/lib/billing/getTeamSponsoredBillingInfo";

type PageProps = {
  params: {
    playerProfileId: string;
  };
};

function formatPlan(value?: string | null) {
  const v = String(value || "").trim().toUpperCase();
  if (v === "REDSHIRT") return "Redshirt";
  if (v === "WALK_ON") return "Walk-On";
  if (v === "ALL_AMERICAN") return "All-American";
  if (v === "TEAM") return "Team";
  return value || "—";
}

function formatCadence(value?: string | null) {
  const v = String(value || "").trim().toLowerCase();
  if (v === "monthly") return "Monthly";
  if (v === "annual" || v === "yearly") return "Annual";
  return value || "—";
}

function formatMoneyFromCents(cents?: number | null, currency = "USD") {
  const amount = Number(cents || 0) / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function formatDate(value?: Date | string | null) {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

function formatDateTime(value?: Date | string | null) {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function statusTone(status?: string | null) {
  const s = String(status || "").trim().toUpperCase();

  if (s === "PAID" || s === "ACTIVE") {
    return {
      bg: "#f0fdf4",
      border: "#bbf7d0",
      text: "#166534",
    };
  }

  if (s === "OPEN" || s === "UPCOMING") {
    return {
      bg: "#eff6ff",
      border: "#bfdbfe",
      text: "#1d4ed8",
    };
  }

  if (s === "PAST_DUE") {
    return {
      bg: "#fff7ed",
      border: "#fed7aa",
      text: "#c2410c",
    };
  }

  if (s === "VOID" || s === "CANCELED" || s === "CANCELLED") {
    return {
      bg: "#f8fafc",
      border: "#e2e8f0",
      text: "#334155",
    };
  }

  return {
    bg: "#fff",
    border: "#e5e7eb",
    text: "#0f172a",
  };
}

export default async function ParentPlayerBillingPage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user?.id) {
    redirect("/login?role=parent");
  }

  const playerProfileId = String(params?.playerProfileId || "").trim();
  if (!playerProfileId) notFound();

  const parentProfile = await prisma.parentProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (!parentProfile?.id) {
    return (
      <div style={{ display: "grid", gap: 18 }}>
        <section style={hero}>
          <div style={eyebrow}>Parent Portal</div>
          <h1 style={h1}>Billing</h1>
          <p style={heroText}>
            This parent account is not linked to a player yet.
          </p>
        </section>

        <section style={warningCard}>
          No parent-player link was found for this account.
        </section>

        <div>
          <Link href="/dashboard/parent" style={goldBtn}>
            Back to Parent Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const link = await prisma.parentPlayerLink.findUnique({
    where: {
      parentProfileId_playerProfileId: {
        parentProfileId: parentProfile.id,
        playerProfileId,
      },
    },
    select: {
      playerProfile: {
        select: {
          id: true,
          email: true,
          playerPlanTier: true,
          playerBillingCadence: true,
          playerBillingStatus: true,
          playerCancelRequestedAt: true,
          playerCancelEffectiveAt: true,
          createdAt: true,
          updatedAt: true,
          data: true,
          playerBillingProfile: {
            select: {
              id: true,
              provider: true,
              paymentType: true,
              brand: true,
              last4: true,
              providerCustomerId: true,
              providerPaymentRef: true,
              updatedAt: true,
            },
          },
          playerInvoices: {
            orderBy: [{ invoiceDate: "desc" }, { createdAt: "desc" }],
            take: 12,
            select: {
              id: true,
              status: true,
              cadence: true,
              invoiceDate: true,
              dueDate: true,
              periodStart: true,
              periodEnd: true,
              amountCents: true,
              amountPaidCents: true,
              paidAt: true,
              hostedUrl: true,
              externalId: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  if (!link?.playerProfile) notFound();

  const profile = link.playerProfile;
  const data =
    profile.data && typeof profile.data === "object" && !Array.isArray(profile.data)
      ? (profile.data as Record<string, any>)
      : {};

  const firstName = String(
    data?.firstName || data?.playerFirstName || data?.nameFirst || ""
  ).trim();

  const lastName = String(
    data?.lastName || data?.playerLastName || data?.nameLast || ""
  ).trim();

  const fullName =
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    profile.email.split("@")[0];

  const possessiveName = firstName
    ? `${firstName}${firstName.endsWith("s") ? "'" : "'s"}`
    : "Player";

  const billingProfile = profile.playerBillingProfile;
  const invoices = profile.playerInvoices ?? [];

const teamSponsoredInfo = await getTeamSponsoredBillingInfo(profile.id);

  const latestInvoice = invoices[0] ?? null;
  const activePaymentLabel = billingProfile
    ? [
        billingProfile.brand || billingProfile.paymentType || "Payment Method",
        billingProfile.last4 ? `•••• ${billingProfile.last4}` : null,
      ]
        .filter(Boolean)
        .join(" ")
    : "No payment method on file";

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <section style={hero}>
        <div style={eyebrow}>Parent Portal</div>
        <h1 style={h1}>{fullName} — Billing</h1>
        <p style={heroText}>
          Review {possessiveName} ScoutLine plan, payment method, invoice history,
          and current billing status from one place.
        </p>

        <div style={actionRow}>
          <Link
            href={`/dashboard/parent/player/${encodeURIComponent(profile.id)}`}
            style={ghostBtn}
          >
            Back to Player Overview
          </Link>

          <Link href="/dashboard/parent" style={ghostBtn}>
            Parent Dashboard
          </Link>
        </div>
      </section>

      {teamSponsoredInfo ? (
        <TeamSponsoredBillingCard
          playerFirstName={firstName || "Player"}
          teamSponsoredInfo={teamSponsoredInfo}
        />
      ) : (
        <>
          <ParentBillingActions
            playerProfileId={profile.id}
            cancelRequested={Boolean(profile.playerCancelRequestedAt)}
            cancelEffectiveAt={
              profile.playerCancelEffectiveAt
                ? profile.playerCancelEffectiveAt.toISOString()
                : null
            }
          />

          <section style={grid2}>
            <div style={card}>
              <div style={cardTitle}>Billing Summary</div>

              <div style={infoGrid}>
                <InfoItem label="Plan" value={formatPlan(profile.playerPlanTier)} />
                <InfoItem
                  label="Cadence"
                  value={formatCadence(profile.playerBillingCadence)}
                />
                <InfoItem
                  label="Status"
                  value={profile.playerBillingStatus || "—"}
                  tone={statusTone(profile.playerBillingStatus)}
                />
                <InfoItem
                  label="Latest Invoice"
                  value={
                    latestInvoice
                      ? formatMoneyFromCents(latestInvoice.amountCents)
                      : "No invoices yet"
                  }
                />
                <InfoItem
                  label="Latest Due Date"
                  value={latestInvoice ? formatDate(latestInvoice.dueDate) : "—"}
                />
                <InfoItem
                  label="Paid Amount"
                  value={
                    latestInvoice
                      ? formatMoneyFromCents(latestInvoice.amountPaidCents)
                      : "—"
                  }
                />
              </div>
            </div>

        <div style={card}>
          <div style={cardTitle}>Payment Method</div>

          <div style={infoGrid}>
            <InfoItem
              label="Provider"
              value={billingProfile?.provider || "Not connected"}
            />
            <InfoItem label="Method" value={activePaymentLabel} />
            <InfoItem
              label="Updated"
              value={billingProfile ? formatDateTime(billingProfile.updatedAt) : "—"}
            />
            <InfoItem
              label="Customer Ref"
              value={billingProfile?.providerCustomerId || "—"}
            />
          </div>

          <div style={{ marginTop: 10, color: "#64748b", fontWeight: 600, lineHeight: 1.5 }}>
            This page is ready for parent-managed billing actions. Hosted portal
            and payment-method flows will use your provider connection when you
            wire the Valor/NMI side.
          </div>
        </div>
      </section>

      <section style={card}>
        <div style={cardTitle}>Account Status</div>

        <div style={infoGrid}>
          <InfoItem
            label="Cancel Requested"
            value={profile.playerCancelRequestedAt ? "Yes" : "No"}
          />
          <InfoItem
            label="Cancel Request Date"
            value={formatDate(profile.playerCancelRequestedAt)}
          />
          <InfoItem
            label="Cancellation Effective"
            value={formatDate(profile.playerCancelEffectiveAt)}
          />
          <InfoItem
            label="Profile Updated"
            value={formatDateTime(profile.updatedAt)}
          />
        </div>
      </section>

      <section style={card}>
        <div style={cardHeaderRow}>
          <div style={cardTitle}>Invoice History</div>
          <div style={smallMuted}>
            Showing {invoices.length} most recent invoice{invoices.length === 1 ? "" : "s"}
          </div>
        </div>

        {invoices.length === 0 ? (
          <div style={emptyState}>No invoices available yet.</div>
        ) : (
          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Invoice Date</th>
                  <th style={th}>Period</th>
                  <th style={th}>Amount</th>
                  <th style={th}>Paid</th>
                  <th style={th}>Status</th>
                  <th style={th}>Due</th>
                  <th style={th}>Paid At</th>
                  <th style={th}>Link</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => {
                  const tone = statusTone(invoice.status);

                  return (
                    <tr key={invoice.id}>
                      <td style={td}>{formatDate(invoice.invoiceDate)}</td>
                      <td style={td}>
                        {formatDate(invoice.periodStart)} – {formatDate(invoice.periodEnd)}
                      </td>
                      <td style={td}>{formatMoneyFromCents(invoice.amountCents)}</td>
                      <td style={td}>
                        {formatMoneyFromCents(invoice.amountPaidCents)}
                      </td>
                      <td style={td}>
                        <span
                          style={{
                            ...pill,
                            background: tone.bg,
                            borderColor: tone.border,
                            color: tone.text,
                          }}
                        >
                          {invoice.status}
                        </span>
                      </td>
                      <td style={td}>{formatDate(invoice.dueDate)}</td>
                      <td style={td}>{formatDate(invoice.paidAt)}</td>
                      <td style={td}>
                        {invoice.hostedUrl ? (
                          <a
                            href={invoice.hostedUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={tableLink}
                          >
                            Open
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
      </section>
        </>
      )}
    </div>
  );
}

function TeamSponsoredBillingCard({
  playerFirstName,
  teamSponsoredInfo,
}: {
  playerFirstName: string;
  teamSponsoredInfo: {
    teamName: string;
    adminName: string;
    adminEmail: string;
    adminPhone: string;
  };
}) {
  return (
    <section style={card}>
      <div style={cardTitle}>Billing Managed by Team</div>

      <div style={bodyText}>
        {playerFirstName}&apos;s ScoutLine billing is currently managed by{" "}
        <strong>{teamSponsoredInfo.teamName}</strong>. Questions or concerns
        should be directed to <strong>{teamSponsoredInfo.adminName}</strong>
        {teamSponsoredInfo.adminEmail ? ` at ${teamSponsoredInfo.adminEmail}` : ""}
        {teamSponsoredInfo.adminPhone ? ` or ${teamSponsoredInfo.adminPhone}` : ""}.
      </div>

      <div>
        <Link href="/pricing" style={selfPlanButtonStyle}>
          Start Individual Plan
        </Link>
      </div>

      <div style={bodyText}>
        Starting an individual plan will preserve the player&apos;s profile,
        metrics, video, recruiting data, public profile, and login. It only
        changes billing ownership from team-sponsored to player-owned.
      </div>
    </section>
  );
}

function InfoItem({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: { bg: string; border: string; text: string };
}) {
  return (
    <div style={infoRow}>
      <div style={infoLabel}>{label}</div>
      <div style={infoValue}>
        {tone ? (
          <span
            style={{
              ...pill,
              background: tone.bg,
              borderColor: tone.border,
              color: tone.text,
            }}
          >
            {value}
          </span>
        ) : (
          value
        )}
      </div>
    </div>
  );
}

const bodyText: React.CSSProperties = {
  color: "#475569",
  lineHeight: 1.6,
  fontWeight: 700,
};

const selfPlanButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  padding: "10px 14px",
  background: "#caa042",
  color: "#0f172a",
  textDecoration: "none",
  fontWeight: 900,
  border: "1px solid #caa042",
};

const hero: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  background: "linear-gradient(180deg, #fffdf7 0%, #ffffff 100%)",
  padding: 20,
  boxShadow: "0 12px 30px rgba(15,23,42,0.06)",
};

const eyebrow: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 900,
  color: "#8a6a21",
  textTransform: "uppercase",
  letterSpacing: ".06em",
  marginBottom: 8,
};

const h1: React.CSSProperties = {
  margin: 0,
  fontSize: "1.8rem",
  fontWeight: 900,
  letterSpacing: "-0.02em",
  color: "#0f172a",
};

const heroText: React.CSSProperties = {
  margin: "10px 0 0",
  color: "#475569",
  maxWidth: 820,
  lineHeight: 1.55,
  fontWeight: 600,
};

const actionRow: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  marginTop: 16,
};

const grid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 16,
};

const card: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  background: "#fff",
  padding: 18,
  boxShadow: "0 10px 24px rgba(15,23,42,0.05)",
  display: "grid",
  gap: 14,
};

const cardTitle: React.CSSProperties = {
  fontSize: "1.05rem",
  fontWeight: 900,
  color: "#0f172a",
};

const cardHeaderRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
};

const smallMuted: React.CSSProperties = {
  color: "#64748b",
  fontWeight: 700,
  fontSize: 12,
};

const infoGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: 12,
};

const infoRow: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 12,
  background: "#fff",
  display: "grid",
  gap: 6,
};

const infoLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: ".04em",
};

const infoValue: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 800,
  color: "#0f172a",
  lineHeight: 1.45,
  wordBreak: "break-word",
};

const emptyState: React.CSSProperties = {
  color: "#64748b",
  fontWeight: 700,
  lineHeight: 1.5,
};

const tableWrap: React.CSSProperties = {
  overflowX: "auto",
};

const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 900,
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  borderBottom: "1px solid #e5e7eb",
  color: "#64748b",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: ".04em",
  fontWeight: 900,
};

const td: React.CSSProperties = {
  padding: "12px",
  borderBottom: "1px solid #f1f5f9",
  color: "#0f172a",
  fontWeight: 600,
  verticalAlign: "middle",
};

const pill: React.CSSProperties = {
  display: "inline-block",
  padding: "5px 10px",
  borderRadius: 999,
  border: "1px solid #e5e7eb",
  fontWeight: 900,
  fontSize: 12,
  whiteSpace: "nowrap",
};

const goldBtn: React.CSSProperties = {
  display: "inline-block",
  padding: "11px 15px",
  borderRadius: 12,
  textDecoration: "none",
  fontWeight: 900,
  border: "1px solid #caa042",
  background: "#caa042",
  color: "#0f172a",
  boxShadow: "0 8px 18px rgba(202,160,66,0.22)",
};

const ghostBtn: React.CSSProperties = {
  display: "inline-block",
  padding: "11px 15px",
  borderRadius: 12,
  textDecoration: "none",
  fontWeight: 900,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#0f172a",
};

const tableLink: React.CSSProperties = {
  color: "#0f172a",
  fontWeight: 900,
  textDecoration: "underline",
  textUnderlineOffset: 3,
};

const warningCard: React.CSSProperties = {
  border: "1px solid #fde68a",
  background: "#fffbeb",
  color: "#78350f",
  borderRadius: 16,
  padding: 16,
  fontWeight: 700,
  lineHeight: 1.5,
};