// app/admin/players/[profileId]/page.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin/getAdminContext";
import AdminPublicControls from "./AdminPublicControls";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function safeId(v: any) {
  return String(v ?? "").trim();
}

function safeEmail(v: any) {
  return String(v ?? "").trim().toLowerCase();
}

function fmt(d: Date) {
  try {
    return d.toLocaleString();
  } catch {
    return String(d);
  }
}

function impersonateHref(args: { userId: string; next: string }) {
  return `/admin/impersonate?userId=${encodeURIComponent(args.userId)}&next=${encodeURIComponent(args.next)}`;
}

export default async function AdminPlayerProfileDetailPage({
  params,
}: {
  params: { profileId: string };
}) {
  const ctx = await getAdminContext();
  if (!ctx.ok) redirect("/staff");

  const profileId = safeId(params?.profileId);
  if (!profileId) notFound();

  const profile = await prisma.playerProfile.findUnique({
    where: { id: profileId },
    select: {
      id: true,
      email: true,
      userId: true,
      profileState: true,
      ownershipMode: true,
      ownerTeamId: true,
      hasActiveTeamBilling: true,
      hasActivePlayerBilling: true,
      billingConflictFlag: true,
      playerPlanTier: true,
      playerBillingCadence: true,
      playerBillingStatus: true,
      playerCancelRequestedAt: true,
      playerCancelEffectiveAt: true,
      schemaVersion: true,
      createdAt: true,
      updatedAt: true,
      data: true,

      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          slug: true,
          Player: {
            select: {
              id: true,
              gradYear: true,
              primaryPos: true,
              secondaryPos: true,
              pitcherHand: true,
              plan: true,
              isCommitted: true,
              committedProgram: true,
              publicEnabled: true,
              publicVisibility: true,
            },
          },
        },
      },

      ownerTeam: {
        select: {
          id: true,
          name: true,
          slug: true,
          teamType: true,
          city: true,
          state: true,
        },
      },

      playerBillingProfile: {
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

      playerInvoices: {
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
          externalId: true,
          hostedUrl: true,
          paidAt: true,
          createdAt: true,
        },
        orderBy: { invoiceDate: "desc" },
        take: 12,
      },
    },
  });

  if (!profile) notFound();

  const canImpersonate =
    (ctx.roles ?? []).includes("SCOUTLINE_ADMIN") || (ctx.roles ?? []).includes("SUPPORT_AGENT");

  const backToSearch = `/admin/search?q=${encodeURIComponent(safeEmail(profile.email))}`;

  const player = profile.user?.Player ?? null;

  return (
    <main style={{ padding: 24, maxWidth: 1100, fontFamily: "Arial, sans-serif", fontSize: 11 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 18, margin: 0 }}>Player Profile</h1>
          <div style={{ opacity: 0.75, marginTop: 4 }}>
            <code>{profile.id}</code>
          </div>
          <div style={{ opacity: 0.8, marginTop: 4 }}>{profile.email}</div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Link href={backToSearch} style={a}>
            ← Back to Search
          </Link>

          {profile.userId ? (
            <Link href={`/admin/users/${profile.userId}`} style={a}>
              View user
            </Link>
          ) : null}

          {profile.ownerTeamId ? (
            <Link href={`/admin/teams/${profile.ownerTeamId}`} style={a}>
              View team
            </Link>
          ) : null}

          {canImpersonate && profile.userId ? (
            // ✅ hard nav anchor for cookie set/redirect
            <a
              href={impersonateHref({
                userId: profile.userId,
                next: `/admin/players/${encodeURIComponent(profile.id)}`,
              })}
              style={a}
            >
              View as
            </a>
          ) : null}
        </div>
      </div>

      {/* ✅ Public controls */}
      {player ? (
        <div style={{ marginTop: 14 }}>
          <AdminPublicControls
            profileId={profile.id}
            publicEnabled={!!player.publicEnabled}
            publicVisibility={(player.publicVisibility as any) ?? "PUBLIC"}
          />
        </div>
      ) : null}

      {/* Snapshot */}
      <section style={card}>
        <div style={sectionTitle}>Snapshot</div>
        <div style={grid2}>
          <Field label="Profile State" value={profile.profileState} />
          <Field label="Ownership Mode" value={profile.ownershipMode} />
          <Field label="Owner Team" value={profile.ownerTeam ? `${profile.ownerTeam.name} (${profile.ownerTeam.slug})` : "—"} />
          <Field label="Team Billing Active" value={String(profile.hasActiveTeamBilling)} />
          <Field label="Player Billing Active" value={String(profile.hasActivePlayerBilling)} />
          <Field label="Billing Conflict" value={String(profile.billingConflictFlag)} />

          <Field label="Plan Tier" value={profile.playerPlanTier} />
          <Field label="Billing Cadence" value={profile.playerBillingCadence} />
          <Field label="Billing Status" value={profile.playerBillingStatus} />

          <Field label="Cancel Requested" value={profile.playerCancelRequestedAt ? fmt(profile.playerCancelRequestedAt) : "—"} />
          <Field label="Cancel Effective" value={profile.playerCancelEffectiveAt ? fmt(profile.playerCancelEffectiveAt) : "—"} />

          <Field label="Schema Version" value={String(profile.schemaVersion)} />
          <Field label="Created" value={fmt(profile.createdAt)} />
          <Field label="Updated" value={fmt(profile.updatedAt)} />
        </div>
      </section>

      {/* Linked User summary */}
      <section style={card}>
        <div style={sectionTitle}>Linked User</div>
        {!profile.user ? (
          <div style={{ opacity: 0.75 }}>No User linked to this PlayerProfile.</div>
        ) : (
          <div style={grid2}>
            <Field label="User Email" value={profile.user.email} />
            <Field label="User Name" value={profile.user.name ?? "—"} />
            <Field label="User Role" value={profile.user.role ?? "—"} />
            <Field label="User Slug" value={profile.user.slug ?? "—"} />

            <Field label="Player.plan (User.Player)" value={profile.user.Player?.plan ?? "—"} />
            <Field label="Grad Year" value={profile.user.Player?.gradYear?.toString() ?? "—"} />
            <Field label="Primary Pos" value={profile.user.Player?.primaryPos ?? "—"} />
            <Field label="Secondary Pos" value={profile.user.Player?.secondaryPos ?? "—"} />
          </div>
        )}
      </section>

      {/* Billing method */}
      <section style={card}>
        <div style={sectionTitle}>Billing Method (PlayerBillingProfile)</div>
        {!profile.playerBillingProfile ? (
          <div style={{ opacity: 0.75 }}>No billing profile.</div>
        ) : (
          <div style={grid2}>
            <Field label="Provider" value={profile.playerBillingProfile.provider} />
            <Field label="Customer ID" value={profile.playerBillingProfile.providerCustomerId ?? "—"} />
            <Field label="Payment Ref" value={profile.playerBillingProfile.providerPaymentRef ?? "—"} />
            <Field label="Payment Type" value={profile.playerBillingProfile.paymentType ?? "—"} />
            <Field label="Brand" value={profile.playerBillingProfile.brand ?? "—"} />
            <Field label="Last4" value={profile.playerBillingProfile.last4 ?? "—"} />
            <Field label="Created" value={fmt(profile.playerBillingProfile.createdAt)} />
            <Field label="Updated" value={fmt(profile.playerBillingProfile.updatedAt)} />
          </div>
        )}
      </section>

      {/* Invoices */}
      <section style={card}>
        <div style={sectionTitle}>Invoices (latest {profile.playerInvoices.length})</div>
        {profile.playerInvoices.length === 0 ? (
          <div style={{ opacity: 0.75 }}>No invoices found.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Status", "Cadence", "Invoice Date", "Due", "Period", "Amount", "Paid", "External", "Hosted"].map((h) => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {profile.playerInvoices.map((inv) => (
                <tr key={inv.id}>
                  <td style={td}>{inv.status}</td>
                  <td style={td}>{inv.cadence}</td>
                  <td style={td}>{fmt(inv.invoiceDate)}</td>
                  <td style={td}>{fmt(inv.dueDate)}</td>
                  <td style={td}>
                    {fmt(inv.periodStart)} → {fmt(inv.periodEnd)}
                  </td>
                  <td style={td}>${(inv.amountCents / 100).toFixed(2)}</td>
                  <td style={td}>${(inv.amountPaidCents / 100).toFixed(2)}</td>
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

      {/* Raw data preview */}
      <section style={card}>
        <div style={sectionTitle}>Raw profile JSON (preview)</div>
        <pre
          style={{
            margin: 0,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontSize: 11,
            lineHeight: 1.35,
            background: "#f8fafc",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: 10,
            padding: 12,
            maxHeight: 380,
            overflow: "auto",
          }}
        >
          {JSON.stringify(profile.data, null, 2)}
        </pre>
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
  marginTop: 14,
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
