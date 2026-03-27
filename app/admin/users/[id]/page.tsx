// app/admin/users/[id]/page.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin/getAdminContext";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function fmt(d: Date) {
  try {
    return d.toLocaleString();
  } catch {
    return String(d);
  }
}

function safeId(v: any) {
  return String(v ?? "").trim();
}

function impersonateHref(args: { userId: string; next: string }) {
  return `/admin/impersonate?userId=${encodeURIComponent(args.userId)}&next=${encodeURIComponent(args.next)}`;
}

export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const ctx = await getAdminContext();
  if (!ctx.ok) redirect("/staff");

  const id = safeId(params?.id);
  if (!id) notFound();

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      slug: true,
      workPhone: true,
      workPhoneExt: true,
      phonePrivate: true,
      emailPrivate: true,
      createdAt: true,
      updatedAt: true,

      adminProfile: {
        select: {
          id: true,
          isActive: true,
          twoFactorRequired: true,
          roles: { select: { role: true } },
          createdAt: true,
          updatedAt: true,
        },
      },

      Player: {
        select: {
          id: true,
          gradYear: true,
          primaryPos: true,
          secondaryPos: true,
          pitcherHand: true,
          throws: true,
          bats: true,
          hsName: true,
          travelTeam: true,
          hometown: true,
          state: true,
          gpa: true,
          act: true,
          sat: true,
          ncaaId: true,
          plan: true,
          isCommitted: true,
          committedProgram: true,
          committedProgramId: true,
        },
      },

      PlayerProfile: {
        select: {
          id: true,
          email: true,
          profileState: true,
          ownershipMode: true,
          ownerTeamId: true,
          hasActiveTeamBilling: true,
          hasActivePlayerBilling: true,
          billingConflictFlag: true,
          playerPlanTier: true,
          playerBillingCadence: true,
          playerBillingStatus: true,
          createdAt: true,
          updatedAt: true,
        },
      },

      teamMemberships: {
        select: {
          id: true,
          role: true,
          isActive: true,
          season: true,
          createdAt: true,
          team: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });

  if (!user) notFound();

  const adminRoles = user.adminProfile?.roles?.map((r: { role: string }) => r.role) ?? [];
  const canImpersonate = (ctx.roles ?? []).includes("SCOUTLINE_ADMIN") || (ctx.roles ?? []).includes("SUPPORT_AGENT");

  return (
    <main style={{ padding: 24, maxWidth: 1100, fontFamily: "Arial, sans-serif", fontSize: 11 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 18, margin: 0 }}>User Detail</h1>
          <div style={{ opacity: 0.75, marginTop: 4 }}>
            <code>{user.id}</code>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Link href={`/admin/search?q=${encodeURIComponent(user.email)}`} style={a}>
            ← Back to Search
          </Link>

          {canImpersonate ? (
            // ✅ anchor (hard nav) so cookie set/redirect is reliable
            <a
              href={impersonateHref({
                userId: user.id,
                next: `/admin/users/${encodeURIComponent(user.id)}`,
              })}
              style={a}
            >
              View as
            </a>
          ) : null}
        </div>
      </div>

      <section style={card}>
        <div style={sectionTitle}>Account</div>
        <div style={grid2}>
          <Field label="Email" value={user.email} />
          <Field label="Name" value={user.name ?? "—"} />
          <Field label="Role (app)" value={user.role ?? "—"} />
          <Field label="Slug" value={user.slug ?? "—"} />
          <Field label="Work Phone" value={user.workPhone ?? "—"} />
          <Field label="Ext" value={user.workPhoneExt ?? "—"} />
          <Field label="Email Private" value={String(user.emailPrivate)} />
          <Field label="Phone Private" value={String(user.phonePrivate)} />
          <Field label="Created" value={fmt(user.createdAt)} />
          <Field label="Updated" value={fmt(user.updatedAt)} />
        </div>
      </section>

      <section style={card}>
        <div style={sectionTitle}>Staff Admin (AdminUser)</div>
        {!user.adminProfile ? (
          <div style={{ opacity: 0.75 }}>No AdminUser row for this account.</div>
        ) : (
          <div style={grid2}>
            <Field label="AdminUserId" value={user.adminProfile.id} />
            <Field label="Active" value={String(user.adminProfile.isActive)} />
            <Field label="2FA Required" value={String(user.adminProfile.twoFactorRequired)} />
            <Field label="Roles" value={adminRoles.length ? adminRoles.join(", ") : "—"} />
            <Field label="Created" value={fmt(user.adminProfile.createdAt)} />
            <Field label="Updated" value={fmt(user.adminProfile.updatedAt)} />
          </div>
        )}
      </section>

      <section style={card}>
        <div style={sectionTitle}>Player (User.Player)</div>
        {!user.Player ? (
          <div style={{ opacity: 0.75 }}>No Player row.</div>
        ) : (
          <div style={grid2}>
            <Field label="Grad Year" value={user.Player.gradYear?.toString() ?? "—"} />
            <Field label="Primary Pos" value={user.Player.primaryPos ?? "—"} />
            <Field label="Secondary Pos" value={user.Player.secondaryPos ?? "—"} />
            <Field label="Pitcher Hand" value={user.Player.pitcherHand ?? "—"} />
            <Field label="Throws" value={user.Player.throws ?? "—"} />
            <Field label="Bats" value={user.Player.bats ?? "—"} />
            <Field label="High School" value={user.Player.hsName ?? "—"} />
            <Field label="Travel Team" value={user.Player.travelTeam ?? "—"} />
            <Field label="Hometown" value={user.Player.hometown ?? "—"} />
            <Field label="State" value={user.Player.state ?? "—"} />
            <Field label="GPA" value={user.Player.gpa?.toString() ?? "—"} />
            <Field label="ACT" value={user.Player.act?.toString() ?? "—"} />
            <Field label="SAT" value={user.Player.sat?.toString() ?? "—"} />
            <Field label="NCAA ID" value={user.Player.ncaaId ?? "—"} />
            <Field label="Plan" value={user.Player.plan} />
            <Field label="Committed" value={String(user.Player.isCommitted)} />
            <Field label="Committed Program" value={user.Player.committedProgram ?? "—"} />
          </div>
        )}
      </section>

      <section style={card}>
        <div style={sectionTitle}>Player Profile</div>
        {!user.PlayerProfile ? (
          <div style={{ opacity: 0.75 }}>No PlayerProfile row.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Email", "Profile ID", "State", "Ownership", "Plan", "Billing", "Actions"].map((h) => (
                  <th key={h} style={th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={td}>{user.PlayerProfile.email}</td>
                <td style={td}>
                  <code>{user.PlayerProfile.id}</code>
                </td>
                <td style={td}>{user.PlayerProfile.profileState}</td>
                <td style={td}>{user.PlayerProfile.ownershipMode}</td>
                <td style={td}>{user.PlayerProfile.playerPlanTier}</td>
                <td style={td}>
                  {user.PlayerProfile.playerBillingStatus} · {user.PlayerProfile.playerBillingCadence}
                </td>
                <td style={td}>
                  <Link href={`/admin/players/${user.PlayerProfile.id}`} style={a}>
                    View
                  </Link>
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </section>

      <section style={card}>
        <div style={sectionTitle}>Team Memberships ({user.teamMemberships.length})</div>
        {user.teamMemberships.length === 0 ? (
          <div style={{ opacity: 0.75 }}>No team memberships.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Team", "Role", "Season", "Active", "Created", "Actions"].map((h) => (
                  <th key={h} style={th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {user.teamMemberships.map((m) => (
                <tr key={m.id}>
                  <td style={td}>
                    {m.team ? (
                      <>
                        {m.team.name} <span style={{ opacity: 0.7 }}>({m.team.slug})</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td style={td}>{m.role}</td>
                  <td style={td}>{m.season ?? "—"}</td>
                  <td style={td}>{String(m.isActive)}</td>
                  <td style={td}>{fmt(m.createdAt)}</td>
                  <td style={td}>
                    {m.team?.id ? (
                      <Link href={`/admin/teams/${m.team.id}`} style={a}>
                        View team
                      </Link>
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
