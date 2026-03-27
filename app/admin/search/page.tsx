// app/admin/search/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import CopyButton from "./CopyButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function norm(q: string) {
  return q.trim();
}

function localPart(email: string) {
  const s = String(email || "").trim().toLowerCase();
  const at = s.indexOf("@");
  return at > 0 ? s.slice(0, at) : s;
}

function impersonateHref(args: { userId: string; next: string }) {
  return `/admin/impersonate?userId=${encodeURIComponent(args.userId)}&next=${encodeURIComponent(args.next)}`;
}

function Pill({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "success" | "danger" | "muted";
}) {
  let border = "1px solid rgba(0,0,0,0.12)";
  let bg = "#fff";
  let color = "#0f172a";

  if (tone === "success") {
    border = "1px solid rgba(34,197,94,0.35)";
    bg = "rgba(34,197,94,0.10)";
  }

  if (tone === "danger") {
    border = "1px solid rgba(239,68,68,0.35)";
    bg = "rgba(239,68,68,0.10)";
  }

  if (tone === "muted") {
    border = "1px solid rgba(148,163,184,0.35)";
    bg = "rgba(148,163,184,0.10)";
    color = "#475569";
  }

  return (
    <span
      style={{
        padding: "4px 8px",
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 900,
        border,
        background: bg,
        color,
        whiteSpace: "nowrap",
      }}
      title={label}
    >
      {label}
    </span>
  );
}

function ActionButton({
  href,
  children,
  target,
  title,
}: {
  href: string;
  children: React.ReactNode;
  target?: string;
  title?: string;
}) {
  return (
    <a
      href={href}
      target={target}
      rel={target ? "noreferrer" : undefined}
      title={title}
      style={btnLink}
    >
      {children}
    </a>
  );
}

function billingTone(status?: string | null) {
  const s = String(status ?? "").toLowerCase();
  if (!s || s === "—") return "muted" as const;
  if (s.includes("active") || s.includes("paid") || s.includes("good")) return "success" as const;
  if (s.includes("past") || s.includes("fail") || s.includes("canceled") || s.includes("cancel")) return "danger" as const;
  return "default" as const;
}

function planTone(tier?: any) {
  const s = String(tier ?? "").toLowerCase();
  if (!s || s === "—") return "muted" as const;
  if (s.includes("all")) return "success" as const;
  if (s.includes("walk")) return "default" as const;
  if (s.includes("red")) return "muted" as const;
  return "default" as const;
}

export default async function AdminSearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  await requireAdmin("/staff");

  const q = norm(String(searchParams?.q ?? ""));
  const hasQ = q.length >= 2;

  const backToThisSearch = `/admin/search?q=${encodeURIComponent(q)}`;

  const [users, profiles, teams, invites] = hasQ
    ? await Promise.all([
        prisma.user.findMany({
          where: {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
              { slug: { contains: q, mode: "insensitive" } },
              { id: { equals: q } },
            ],
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            slug: true,
            createdAt: true,

            PlayerProfile: {
              select: {
                id: true,
                playerPlanTier: true,
                playerBillingStatus: true,
                playerBillingCadence: true,
                hasActivePlayerBilling: true,
              },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
          take: 20,
          orderBy: { createdAt: "desc" },
        }),

        prisma.playerProfile.findMany({
          where: {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { id: { equals: q } },
              { userId: { equals: q } },
            ],
          },
          select: {
            id: true,
            email: true,
            userId: true,
            profileState: true,
            ownershipMode: true,
            ownerTeamId: true,

            playerPlanTier: true,
            playerBillingStatus: true,
            playerBillingCadence: true,
            hasActivePlayerBilling: true,

            user: { select: { slug: true, email: true } },
          },
          take: 20,
          orderBy: { createdAt: "desc" },
        }),

        prisma.team.findMany({
          where: {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { slug: { contains: q, mode: "insensitive" } },
              { id: { equals: q } },
            ],
          },
          select: {
            id: true,
            name: true,
            slug: true,
            teamType: true,
            city: true,
            state: true,
            createdAt: true,
          },
          take: 20,
          orderBy: { createdAt: "desc" },
        }),

        prisma.teamInvite.findMany({
          where: {
            OR: [
              { invitedEmail: { contains: q, mode: "insensitive" } },
              { parentEmail: { contains: q, mode: "insensitive" } },
              { tokenHash: { equals: q } },
              { id: { equals: q } },
            ],
          },
          select: {
            id: true,
            teamId: true,
            invitedEmail: true,
            parentEmail: true,
            status: true,
            createdAt: true,
            expiresAt: true,
            acceptedAt: true,
            team: { select: { name: true, slug: true } },
          },
          take: 20,
          orderBy: { createdAt: "desc" },
        }),
      ])
    : [[], [], [], []];

  return (
    <main style={{ padding: 24, fontFamily: "Arial, sans-serif", fontSize: 11, maxWidth: 1200 }}>
      <h1 style={{ fontSize: 18, marginBottom: 6 }}>Admin Search</h1>
      <div style={{ opacity: 0.75, marginBottom: 14 }}>Search users, players, teams by email, name, slug, or id.</div>

      <form action="/admin/search" method="get" style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        <input
          name="q"
          defaultValue={q}
          placeholder="Type at least 2 characters… (email, name, slug, id)"
          style={{
            flex: 1,
            padding: "10px 12px",
            border: "1px solid rgba(0,0,0,0.18)",
            borderRadius: 10,
            fontSize: 12,
          }}
        />
        <button
          type="submit"
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.18)",
            cursor: "pointer",
            fontWeight: 800,
          }}
        >
          Search
        </button>
      </form>

      {!hasQ ? (
        <div style={{ opacity: 0.7 }}>Enter at least 2 characters to search.</div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {/* USERS */}
          <section style={box}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Users ({users.length})</div>
            {users.length === 0 ? (
              <div style={{ opacity: 0.7 }}>No users found.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Email", "Name", "Role", "Slug", "Plan / Billing", "Actions"].map((h) => (
                      <th key={h} style={th}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(users as any[]).map((u) => {
                    const latest = u.PlayerProfile?.[0] ?? null;

                    const publicSlug = u.slug ? u.slug : localPart(u.email);
                    const publicHref = publicSlug ? `/player/${encodeURIComponent(publicSlug)}` : null;

                    const plan = latest?.playerPlanTier ?? "—";
                    const status = latest?.playerBillingStatus ?? "—";
                    const cadence = latest?.playerBillingCadence ?? "—";
                    const billingOn =
                      typeof latest?.hasActivePlayerBilling === "boolean"
                        ? latest.hasActivePlayerBilling
                        : null;

                    return (
                      <tr key={u.id}>
                        <td style={td}>
                          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                            <span>{u.email}</span>
                            <CopyButton value={u.email} label="Copy email" />
                          </div>
                        </td>

                        <td style={td}>{u.name ?? "—"}</td>
                        <td style={td}>{u.role ?? "—"}</td>
                        <td style={td}>{u.slug ?? "—"}</td>

                        <td style={td}>
                          {latest ? (
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                              <Pill label={String(plan)} tone={planTone(plan)} />
                              <Pill label={String(status)} tone={billingTone(status)} />
                              <Pill label={String(cadence)} tone="muted" />
                              <Pill
                                label={billingOn === null ? "Billing —" : billingOn ? "Billing On" : "Billing Off"}
                                tone={billingOn === null ? "muted" : billingOn ? "success" : "danger"}
                              />
                            </div>
                          ) : (
                            <span style={{ opacity: 0.65, fontWeight: 900 }}>—</span>
                          )}
                        </td>

                        <td style={td}>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                            {/* ✅ FIX: user View button */}
                            <ActionButton href={`/admin/users/${encodeURIComponent(u.id)}`}>View</ActionButton>

                            <ActionButton href={impersonateHref({ userId: u.id, next: backToThisSearch })}>
                              View as
                            </ActionButton>

                            <CopyButton value={u.id} label="Copy ID" title={u.id} />

                            {publicHref ? (
                              <ActionButton href={publicHref} target="_blank" title="Open public player page">
                                Public
                              </ActionButton>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>

          {/* PLAYER PROFILES */}
          <section style={box}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Player Profiles ({profiles.length})</div>
            {profiles.length === 0 ? (
              <div style={{ opacity: 0.7 }}>No player profiles found.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Email", "Profile ID", "User ID", "State", "Ownership", "Plan / Billing", "Actions"].map((h) => (
                      <th key={h} style={th}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(profiles as any[]).map((p) => {
                    const canImp = !!p.userId;
                    const publicSlug = p.user?.slug ? p.user.slug : localPart(p.email);
                    const publicHref = publicSlug ? `/player/${encodeURIComponent(publicSlug)}` : null;

                    return (
                      <tr key={p.id}>
                        <td style={td}>
                          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                            <span>{p.email}</span>
                            <CopyButton value={p.email} label="Copy email" />
                          </div>
                        </td>

                        <td style={td}>
                          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                            <code>{p.id}</code>
                            <CopyButton value={p.id} label="Copy ID" title={p.id} />
                          </div>
                        </td>

                        <td style={td}>
                          {p.userId ? (
                            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                              <code>{p.userId}</code>
                              <CopyButton value={p.userId} label="Copy ID" title={p.userId} />
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>

                        <td style={td}>{p.profileState}</td>
                        <td style={td}>{p.ownershipMode}</td>

                        <td style={td}>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                            <Pill label={String(p.playerPlanTier ?? "—")} tone={planTone(p.playerPlanTier)} />
                            <Pill label={String(p.playerBillingStatus ?? "—")} tone={billingTone(p.playerBillingStatus)} />
                            <Pill label={String(p.playerBillingCadence ?? "—")} tone="muted" />
                            <Pill
                              label={
                                typeof p.hasActivePlayerBilling === "boolean"
                                  ? p.hasActivePlayerBilling
                                    ? "Billing On"
                                    : "Billing Off"
                                  : "Billing —"
                              }
                              tone={
                                typeof p.hasActivePlayerBilling === "boolean"
                                  ? p.hasActivePlayerBilling
                                    ? "success"
                                    : "danger"
                                  : "muted"
                              }
                            />
                          </div>
                        </td>

                        <td style={td}>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                            <ActionButton href={`/admin/players/${encodeURIComponent(p.id)}`}>View</ActionButton>

                            {canImp ? (
                              <ActionButton
                                href={impersonateHref({
                                  userId: p.userId!,
                                  next: backToThisSearch,
                                })}
                              >
                                View as
                              </ActionButton>
                            ) : (
                              <span style={{ opacity: 0.6, fontWeight: 900 }}>No user</span>
                            )}

                            {publicHref ? (
                              <ActionButton href={publicHref} target="_blank" title="Open public player page">
                                Public
                              </ActionButton>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>

          {/* TEAMS */}
          <section style={box}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Teams ({teams.length})</div>
            {teams.length === 0 ? (
              <div style={{ opacity: 0.7 }}>No teams found.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Name", "Slug", "Type", "Location", "Actions"].map((h) => (
                      <th key={h} style={th}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(teams as any[]).map((t) => (
                    <tr key={t.id}>
                      <td style={td}>
                        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                          <span>{t.name}</span>
                          <CopyButton value={t.id} label="Copy ID" title={t.id} />
                        </div>
                      </td>
                      <td style={td}>{t.slug}</td>
                      <td style={td}>{t.teamType}</td>
                      <td style={td}>{[t.city, t.state].filter(Boolean).join(", ") || "—"}</td>
                      <td style={td}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          <ActionButton href={`/admin/teams/${encodeURIComponent(t.id)}`}>View</ActionButton>
                          <ActionButton href={`/team/${encodeURIComponent(t.slug)}`} target="_blank">
                            Public
                          </ActionButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* TEAM INVITES */}
          <section style={box}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Team Invites ({invites.length})</div>
            {invites.length === 0 ? (
              <div style={{ opacity: 0.7 }}>No team invites found.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Team", "Invited Email", "Parent Email", "Status", "Created", "Actions"].map((h) => (
                      <th key={h} style={th}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(invites as any[]).map((i) => (
                    <tr key={i.id}>
                      <td style={td}>
                        {i.team ? (
                          <>
                            {i.team.name} <span style={{ opacity: 0.7 }}>({i.team.slug})</span>
                          </>
                        ) : (
                          <code>{i.teamId}</code>
                        )}
                      </td>
                      <td style={td}>{i.invitedEmail}</td>
                      <td style={td}>{i.parentEmail ?? "—"}</td>
                      <td style={td}>{i.status}</td>
                      <td style={td}>{new Date(i.createdAt as any).toLocaleString()}</td>
                      <td style={td}>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          {i.teamId ? (
                            <ActionButton href={`/admin/teams/${encodeURIComponent(i.teamId)}`}>View team</ActionButton>
                          ) : null}
                          <CopyButton value={i.id} label="Copy invite ID" title={i.id} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        <Link href="/admin" style={a}>
          ← Back to Admin
        </Link>
      </div>
    </main>
  );
}

const box: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,0.10)",
  borderRadius: 12,
  padding: 14,
  background: "#fff",
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  borderBottom: "1px solid rgba(0,0,0,0.10)",
  fontWeight: 900,
  fontSize: 11,
  whiteSpace: "nowrap",
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

const btnLink: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 8,
  border: "1px solid #0ea5e9",
  background: "#fff",
  fontSize: 11,
  fontWeight: 900,
  textDecoration: "none",
  color: "#2563eb",
  whiteSpace: "nowrap",
  display: "inline-block",
};
