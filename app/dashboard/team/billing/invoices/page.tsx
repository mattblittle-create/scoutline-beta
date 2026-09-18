// app/dashboard/team/billing/invoices/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentTeam } from "@/lib/team/getCurrentTeam";
import { PLAN_PRICES_CENTS } from "@/lib/billing/plans";

function formatUSD(cents: number) {
  const dollars = cents / 100;
  return dollars.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

async function resolveTeamDevFallback(searchParams?: Record<string, string | string[] | undefined>) {
  const emailRaw = searchParams?.email;
  const email = Array.isArray(emailRaw) ? emailRaw[0] : emailRaw;

  const usernameRaw = searchParams?.username;
  const username = Array.isArray(usernameRaw) ? usernameRaw[0] : usernameRaw;

  const e = String(email || username || "").trim().toLowerCase();
  if (!e) return null;

  // 1) Prefer resolving by User (TEAM_ADMIN logged in later)
  const user = await prisma.user.findFirst({
    where: { email: { equals: e, mode: "insensitive" } },
    select: { id: true },
  });

  if (user?.id) {
    const membership = await prisma.teamMembership.findFirst({
      where: { isActive: true, userId: user.id },
      include: { team: true },
      orderBy: { createdAt: "desc" as any },
    });

    if (membership?.team) return membership.team;

    const anyMembership = await prisma.teamMembership.findFirst({
      where: { userId: user.id },
      include: { team: true },
      orderBy: { createdAt: "desc" as any },
    });

    if (anyMembership?.team) return anyMembership.team;
  }

  // 2) Secondary fallback: resolve by PlayerProfile.email (useful in dev if you haven’t created Users)
  const pp = await prisma.playerProfile.findFirst({
    where: { email: { equals: e, mode: "insensitive" } },
    select: { id: true },
  });

  if (pp?.id) {
    const membership = await prisma.teamMembership.findFirst({
      where: { isActive: true, playerProfileId: pp.id },
      include: { team: true },
      orderBy: { createdAt: "desc" as any },
    });

    if (membership?.team) return membership.team;

    const anyMembership = await prisma.teamMembership.findFirst({
      where: { playerProfileId: pp.id },
      include: { team: true },
      orderBy: { createdAt: "desc" as any },
    });

    if (anyMembership?.team) return anyMembership.team;
  }

  return null;
}

function nextBillingDateLabel() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return next.toLocaleDateString();
}

export default async function TeamBillingInvoicesPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const teamSlugRaw = searchParams?.teamSlug;
  const teamSlug = Array.isArray(teamSlugRaw) ? teamSlugRaw[0] : teamSlugRaw;

  let team = await getCurrentTeam({ teamSlug: teamSlug ?? null });
  if (!team) team = await resolveTeamDevFallback(searchParams);

  if (!team) {
    return (
      <main style={{ display: "grid", gap: 14 }}>
        <section style={topRow}>
          <div style={{ minWidth: 260, flex: 1 }}>
            <div style={pageTitle}>Invoices</div>
            <div style={muted}>View upcoming billing and invoice history.</div>
            <div style={miniHint}>
              Dev mode: pass <span style={{ fontFamily: "monospace" }}>?email=admin@email.com</span> to resolve a team.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/dashboard/team/billing" style={btnGhost}>
              Back to Billing
            </Link>
          </div>
        </section>

        <section style={card}>
          <div style={emptyBox}>
            <div style={{ fontWeight: 900, fontSize: 16, color: "#0f172a" }}>No team resolved (dev)</div>
            <div style={{ marginTop: 8, color: "#64748b", fontWeight: 800 }}>
              Try: <span style={{ fontFamily: "monospace" }}>/dashboard/team/billing/invoices?email=admin@email.com</span>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const planTier = "Teams" as const;
  const cadence = "monthly" as const;
  const basePriceCents = PLAN_PRICES_CENTS[planTier][cadence];

  const seatsUsed = await prisma.teamMembership.count({
    where: { teamId: team.id, isActive: true, role: "PLAYER" },
  });

  // Placeholder totals (discount + sponsored are handled on Billing page today)
  const totalCents = team.billingMode === "SPONSORED" ? 0 : basePriceCents;

  // Invoice history not wired yet (Stripe later). Show the flow now.
  const invoices: Array<{ id: string; date: string; totalCents: number; status: "PAID" | "DUE" | "VOID" }> = [];

  return (
    <main style={{ display: "grid", gap: 14 }}>
      <section style={topRow}>
        <div style={{ minWidth: 260, flex: 1 }}>
          <div style={pageTitle}>Invoices</div>
          <div style={muted}>Upcoming billing, previous invoices, and your monthly billing schedule.</div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Link href="/dashboard/team/billing" style={btnGhost}>
            Back to Billing
          </Link>
          <Link href="/dashboard/team/roster" style={btnGhost}>
            Back to Roster
          </Link>
        </div>
      </section>

      <section style={card}>
        <div style={sectionHeaderRow}>
          <div style={{ display: "grid", gap: 4 }}>
            <div style={sectionTitle}>Upcoming Billing</div>
            <div style={miniHint}>
              Teams plan bills monthly. Total is based on your active roster count.
            </div>
          </div>

          <div style={pill}>Monthly schedule</div>
        </div>

        <div style={summaryGrid}>
          <div style={summaryTile}>
            <div style={tileLabel}>Next billing date</div>
            <div style={tileValue}>{nextBillingDateLabel()}</div>
          </div>

          <div style={summaryTile}>
            <div style={tileLabel}>Active roster count</div>
            <div style={tileValue}>{seatsUsed} players</div>
            <div style={tileHint}>If you need to adjust the total, update Active/Inactive on your roster.</div>
          </div>

          <div style={summaryTile}>
            <div style={tileLabel}>Estimated total</div>
            <div style={tileValue}>{formatUSD(totalCents)} <span style={tileSub}>per month</span></div>
          </div>
        </div>

        <div style={breakdownBox}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Billing schedule</div>
          <div style={{ color: "#475569", fontWeight: 800, lineHeight: 1.35 }}>
            Billing runs monthly for Teams plan. Your monthly total is calculated from the plan price and any applied
            discounts/sponsorship, with roster count as the driver for “active players”.
          </div>

          <div style={quickLinksRow}>
            <Link href="/dashboard/team/roster" style={btnGhostSolid}>
              Go to Roster (update Active/Inactive)
            </Link>
            <Link href="/dashboard/team/billing" style={btnGhostSolid}>
              Back to Billing Methods
            </Link>
          </div>
        </div>
      </section>

      <section style={card}>
        <div style={sectionHeaderRow}>
          <div style={{ display: "grid", gap: 4 }}>
            <div style={sectionTitle}>Invoice History</div>
            <div style={miniHint}>Previous invoices and payment status will appear here.</div>
          </div>
        </div>

        {invoices.length === 0 ? (
          <div style={emptyBox}>
            <div style={{ fontWeight: 900, color: "#0f172a" }}>No invoices yet</div>
            <div style={{ marginTop: 6, color: "#64748b", fontWeight: 800 }}>
              Once billing is enabled, your invoice history will populate here automatically.
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {invoices.map((inv) => (
              <div key={inv.id} style={rowCard}>
                <div style={{ display: "grid", gap: 4 }}>
                  <div style={{ fontWeight: 900, color: "#0f172a" }}>{inv.date}</div>
                  <div style={{ color: "#64748b", fontWeight: 800, fontSize: 12 }}>
                    Invoice #{inv.id}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div style={{ fontWeight: 900, color: "#0f172a" }}>{formatUSD(inv.totalCents)}</div>
                  <div style={pill}>{inv.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

/* ---------------- Styles ---------------- */

const topRow: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  alignItems: "flex-end",
  justifyContent: "space-between",
  padding: 0,
  border: "none",
  borderRadius: 0,
  background: "none",
};

const pageTitle: React.CSSProperties = {
  fontWeight: 900,
  fontSize: "1.75rem",
  letterSpacing: "-0.02em",
  lineHeight: 1.15,
};

const muted: React.CSSProperties = {
  marginTop: 6,
  color: "#475569",
  lineHeight: 1.35,
};

const miniHint: React.CSSProperties = {
  color: "#64748b",
  fontWeight: 700,
  fontSize: 12,
  lineHeight: 1.35,
  marginTop: 6,
};

const card: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  background: "#fff",
  padding: 14,
  boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
};

const sectionHeaderRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
  flexWrap: "wrap",
};

const sectionTitle: React.CSSProperties = {
  fontWeight: 900,
  fontSize: 14,
  color: "#0f172a",
};

const pill: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 999,
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  color: "#0f172a",
  fontWeight: 800,
  fontSize: 12,
};

const summaryGrid: React.CSSProperties = {
  marginTop: 12,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 10,
  alignItems: "stretch",
};

const summaryTile: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  background: "#f8fafc",
  padding: 12,
};

const tileLabel: React.CSSProperties = { color: "#64748b", fontWeight: 800, fontSize: 12 };
const tileValue: React.CSSProperties = { marginTop: 4, color: "#0f172a", fontWeight: 900, fontSize: 14 };
const tileSub: React.CSSProperties = { color: "#64748b", fontWeight: 800, fontSize: 12 };
const tileHint: React.CSSProperties = { marginTop: 6, color: "#64748b", fontWeight: 800, fontSize: 12, lineHeight: 1.35 };

const breakdownBox: React.CSSProperties = {
  marginTop: 12,
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  background: "#fff",
  padding: 12,
};

const quickLinksRow: React.CSSProperties = {
  marginTop: 12,
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "center",
};

const rowCard: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 12,
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  background: "#fff",
};

const emptyBox: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 14,
  background: "#f8fafc",
};

const btnGhost: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 900,
  textDecoration: "none",
  cursor: "pointer",
};

const btnGhostSolid: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  color: "#0f172a",
  fontWeight: 900,
  textDecoration: "none",
  cursor: "pointer",
};
