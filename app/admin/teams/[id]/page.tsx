// app/admin/teams/[id]/page.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin/getAdminContext";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function safeId(v: any) {
  return String(v ?? "").trim();
}

function fmt(d: Date) {
  try {
    return d.toLocaleString();
  } catch {
    return String(d);
  }
}

function fmtUSD(cents: number) {
  const n = Number(cents || 0);
  return (n / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default async function AdminTeamDetailPage({ params }: { params: { id: string } }) {
  const ctx = await getAdminContext();
  if (!ctx.ok) redirect("/staff");

  const id = safeId(params?.id);
  if (!id) notFound();

  const team = await prisma.team.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      teamType: true,
      city: true,
      state: true,
      websiteUrl: true,
      logoUrl: true,

      contactEmail: true,
      phone: true,
      phoneExt: true,
      phonePrivate: true,
      xUrl: true,
      instagramUrl: true,

      billingMode: true,
      sponsorName: true,
      sponsorNote: true,

      planTier: true,
      billingCadence: true,
      billingStatus: true,
      cancelRequestedAt: true,
      cancelEffectiveAt: true,

      createdAt: true,
      updatedAt: true,

      billingProfile: {
        select: {
          id: true,
          provider: true,
          providerCustomerId: true,
          providerPaymentRef: true,
          paymentType: true,
          brand: true,
          last4: true,
          createdAt: true,
          updatedAt: true,
        },
      },

      invoices: {
        select: {
          id: true,
          status: true,
          periodStart: true,
          periodEnd: true,
          amountCents: true,
          currency: true,
          externalId: true,
          hostedUrl: true,
          createdAt: true,
          paidAt: true,
        },
        orderBy: { periodStart: "desc" },
        take: 12,
      },

      memberships: {
        select: {
          id: true,
          role: true,
          isActive: true,
          season: true,
          createdAt: true,
          user: { select: { id: true, email: true, name: true } },
          playerProfile: { select: { id: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      },

      ownerProfiles: {
        select: { id: true, email: true },
        orderBy: { createdAt: "desc" },
        take: 25,
      },
    },
  });

  if (!team) notFound();

  const backToSearch = `/admin/search?q=${encodeURIComponent(team.slug || team.name)}`;

  return (
    <main style={{ padding: 24, maxWidth: 1100, fontFamily: "Arial, sans-serif", fontSize: 11 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 18, margin: 0 }}>Team</h1>
          <div style={{ opacity: 0.9, marginTop: 4, fontWeight: 900 }}>
            {team.name} <span style={{ opacity: 0.7 }}>({team.slug})</span>
          </div>
          <div style={{ opacity: 0.75, marginTop: 4 }}>
            <code>{team.id}</code>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Link href={backToSearch} style={a}>
            ← Back to Search
          </Link>

          <Link href={`/team/${team.slug}`} style={a} target="_blank">
            Public page
          </Link>
        </div>
      </div>

      {/* Snapshot */}
      <section style={card}>
        <div style={sectionTitle}>Snapshot</div>
        <div style={grid2}>
          <Field label="Team Type" value={team.teamType} />
          <Field label="Location" value={[team.city, team.state].filter(Boolean).join(", ") || "—"} />
          <Field label="Website" value={team.websiteUrl ?? "—"} />
          <Field label="Contact Email" value={team.contactEmail ?? "—"} />
          <Field label="Phone" value={team.phone ? `${team.phone}${team.phoneExt ? ` x${team.phoneExt}` : ""}` : "—"} />
          <Field label="Phone Private" value={String(team.phonePrivate)} />
          <Field label="X" value={team.xUrl ?? "—"} />
          <Field label="Instagram" value={team.instagramUrl ?? "—"} />

          <Field label="Billing Mode" value={team.billingMode} />
          <Field label="Sponsor" value={team.sponsorName ?? "—"} />
          <Field label="Plan Tier" value={team.planTier} />
          <Field label="Cadence" value={team.billingCadence} />
          <Field label="Billing Status" value={team.billingStatus} />
          <Field label="Cancel Requested" value={team.cancelRequestedAt ? fmt(team.cancelRequestedAt) : "—"} />
          <Field label="Cancel Effective" value={team.cancelEffectiveAt ? fmt(team.cancelEffectiveAt) : "—"} />

          <Field label="Created" value={fmt(team.createdAt)} />
          <Field label="Updated" value={fmt(team.updatedAt)} />
        </div>
        {team.sponsorNote ? (
          <div style={{ marginTop: 10, opacity: 0.85 }}>
            <span style={{ fontWeight: 900 }}>Sponsor Note:</span> {team.sponsorNote}
          </div>
        ) : null}
      </section>

      {/* Billing method */}
      <section style={card}>
        <div style={sectionTitle}>Billing Method (TeamBillingProfile)</div>
        {!team.billingProfile ? (
          <div style={{ opacity: 0.75 }}>No billing profile.</div>
        ) : (
          <div style={grid2}>
            <Field label="Provider" value={team.billingProfile.provider} />
            <Field label="Customer ID" value={team.billingProfile.providerCustomerId ?? "—"} />
            <Field label="Payment Ref" value={team.billingProfile.providerPaymentRef ?? "—"} />
            <Field label="Payment Type" value={team.billingProfile.paymentType ?? "—"} />
            <Field label="Brand" value={team.billingProfile.brand ?? "—"} />
            <Field label="Last4" value={team.billingProfile.last4 ?? "—"} />
            <Field label="Created" value={fmt(team.billingProfile.createdAt)} />
            <Field label="Updated" value={fmt(team.billingProfile.updatedAt)} />
          </div>
        )}
      </section>

      {/* Invoices */}
      <section style={card}>
        <div style={sectionTitle}>Invoices (latest {team.invoices.length})</div>
        {team.invoices.length === 0 ? (
          <div style={{ opacity: 0.75 }}>No invoices found.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Status", "Period", "Amount", "Paid At", "External", "Hosted"].map((h) => (
                  <th key={h} style={th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {team.invoices.map((inv) => (
                <tr key={inv.id}>
                  <td style={td}>{inv.status}</td>
                  <td style={td}>
                    {fmt(inv.periodStart)} → {fmt(inv.periodEnd)}
                  </td>
                  <td style={td}>{fmtUSD(inv.amountCents)}</td>
                  <td style={td}>{inv.paidAt ? fmt(inv.paidAt) : "—"}</td>
                  <td style={td}>{inv.externalId ?? "—"}</td>
                  <td style={td}>
                    {inv.hostedUrl ? (
                      <a href={inv.hostedUrl} target="_blank" rel="noreferrer" style={a}>
                        Open
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Memberships */}
      <section style={card}>
        <div style={sectionTitle}>Memberships (latest {team.memberships.length})</div>
        {team.memberships.length === 0 ? (
          <div style={{ opacity: 0.75 }}>No memberships found.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Role", "Active", "Season", "User", "PlayerProfile", "Created", "Actions"].map((h) => (
                  <th key={h} style={th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {team.memberships.map((m) => (
                <tr key={m.id}>
                  <td style={td}>{m.role}</td>
                  <td style={td}>{String(m.isActive)}</td>
                  <td style={td}>{m.season ?? "—"}</td>
                  <td style={td}>
                    {m.user ? (
                      <>
                        {m.user.email}
                        {m.user.name ? <span style={{ opacity: 0.7 }}> ({m.user.name})</span> : null}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={td}>{m.playerProfile ? <code>{m.playerProfile.id}</code> : "—"}</td>
                  <td style={td}>{fmt(m.createdAt)}</td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {m.user?.id ? (
                        <Link href={`/admin/users/${m.user.id}`} style={a}>
                          View user
                        </Link>
                      ) : null}
                      {m.playerProfile?.id ? (
                        <Link href={`/admin/players/${m.playerProfile.id}`} style={a}>
                          View player
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Owner profiles (Team-owned) */}
      <section style={card}>
        <div style={sectionTitle}>Owner Profiles (team-owned) ({team.ownerProfiles.length})</div>
        {team.ownerProfiles.length === 0 ? (
          <div style={{ opacity: 0.75 }}>No owner profiles.</div>
        ) : (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {team.ownerProfiles.map((p) => (
              <Link key={p.id} href={`/admin/players/${p.id}`} style={chip}>
                {p.email}
              </Link>
            ))}
          </div>
        )}
      </section>

      <div style={{ marginTop: 18 }}>
        <Link href="/admin" style={a}>
          ← Back to Admin
        </Link>
      </div>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
      <div style={{ fontSize: 11, fontWeight: 900, opacity: 0.65 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
    </div>
  );
}

const card: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,0.10)",
  borderRadius: 12,
  padding: 14,
  background: "#fff",
};

const sectionTitle: React.CSSProperties = {
  fontWeight: 900,
  marginBottom: 8,
};

const grid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 10,
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  borderBottom: "1px solid rgba(0,0,0,0.10)",
  fontWeight: 900,
  fontSize: 11,
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

const chip: React.CSSProperties = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(0,0,0,0.12)",
  background: "#fff",
  textDecoration: "none",
  fontWeight: 900,
  color: "#0f172a",
};
