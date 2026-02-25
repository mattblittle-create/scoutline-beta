// app/admin/billing/health/page.tsx

import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin/getAdminContext";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function fmtDate(d?: Date | null) {
  if (!d) return "—";
  try {
    return d.toLocaleDateString();
  } catch {
    return String(d);
  }
}

function fmtDateTime(d?: Date | null) {
  if (!d) return "—";
  try {
    return d.toLocaleString();
  } catch {
    return String(d);
  }
}

function Pill({ label, tone }: { label: string; tone?: "red" | "yellow" | "green" | "slate" }) {
  const t = tone ?? "slate";

  let border = "1px solid rgba(148,163,184,0.35)";
  let bg = "rgba(148,163,184,0.10)";
  let color = "#475569";

  if (t === "green") {
    border = "1px solid rgba(34,197,94,0.35)";
    bg = "rgba(34,197,94,0.10)";
    color = "#0f172a";
  } else if (t === "yellow") {
    border = "1px solid rgba(234,179,8,0.35)";
    bg = "rgba(234,179,8,0.14)";
    color = "#0f172a";
  } else if (t === "red") {
    border = "1px solid rgba(239,68,68,0.35)";
    bg = "rgba(239,68,68,0.10)";
    color = "#7f1d1d";
  }

  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        border,
        background: bg,
        color,
        fontWeight: 900,
        fontSize: 11,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function TableWrap({ children }: { children: ReactNode }) {
  return <div style={{ overflowX: "auto" }}>{children}</div>;
}

function codeCell(v: any) {
  return <code style={{ fontWeight: 800 }}>{String(v ?? "")}</code>;
}

function safeJsonArrayParse(raw: any): { ok: boolean; arr: string[]; error?: string } {
  const s = String(raw ?? "").trim();
  if (!s) return { ok: true, arr: [] };
  try {
    const j = JSON.parse(s);
    if (!Array.isArray(j)) return { ok: false, arr: [], error: "not-array" };
    return { ok: true, arr: j.map((x) => String(x)) };
  } catch {
    return { ok: false, arr: [], error: "json-parse" };
  }
}

/**
 * DiscountApplication.targetId is your internal id:
 * - TEAM   => Team.id
 * - PLAYER => PlayerProfile.id
 */
function targetAdminHref(targetTypeRaw: any, targetIdRaw: any) {
  const t = String(targetTypeRaw || "").toUpperCase();
  const id = String(targetIdRaw || "").trim();
  if (!id) return null;

  if (t === "TEAM") return `/admin/teams/${encodeURIComponent(id)}`;
  if (t === "PLAYER") return `/admin/players/${encodeURIComponent(id)}`;

  return null;
}

export default async function AdminBillingHealthPage() {
  const ctx = await getAdminContext();
  if (!ctx.ok) redirect("/staff");

  const now = new Date();

  /**
   * =========================
   * CHECK 1: Duplicate ACTIVE discount apps per target
   * (should be <=1 by design)
   * =========================
   */
  const activeGroupsAll = await prisma.discountApplication.groupBy({
    by: ["targetType", "targetId"],
    where: { status: "ACTIVE" },
    _count: { _all: true },
  });

  // Prisma “having _count” isn’t supported in your version -> filter in JS
  const dupActiveGroups = activeGroupsAll.filter((g: any) => (g?._count?._all ?? 0) > 1);

  // Pull sample ACTIVE rows for the dup targets (so the table renders)
  const dupActiveTargets =
    dupActiveGroups.length === 0
      ? []
      : await prisma.discountApplication.findMany({
          where: {
            status: "ACTIVE",
            OR: dupActiveGroups.slice(0, 80).map((g: any) => ({
              targetType: g.targetType,
              targetId: g.targetId,
            })),
          },
          include: {
            discountCode: { select: { code: true, isActive: true, expiresAt: true } },
          },
          orderBy: { appliedAt: "desc" },
          take: 400,
        });

  /**
   * =========================
   * CHECK 2: Discount codes expired but still active
   * (isActive true but expiresAt in past)
   * =========================
   */
  const codesExpiredButActive = await prisma.discountCode.findMany({
    where: {
      isActive: true,
      expiresAt: { lt: now },
    },
    orderBy: { expiresAt: "asc" },
    take: 200,
  });

  /**
   * =========================
   * CHECK 3: plansAllowedJson invalid
   * =========================
   */
  const codesWithPlansJson = await prisma.discountCode.findMany({
    select: {
      id: true,
      code: true,
      plansAllowedJson: true,
      updatedAt: true,
    },
    take: 800,
    orderBy: { updatedAt: "desc" },
  });

  const plansJsonInvalid = codesWithPlansJson
    .map((c) => {
      const parsed = safeJsonArrayParse((c as any).plansAllowedJson);
      if (!parsed.ok) return { ...c, error: parsed.error || "invalid" };
      return null;
    })
    .filter(Boolean) as Array<{ id: string; code: string; plansAllowedJson: any; updatedAt: Date; error: string }>;

  /**
   * =========================
   * CHECK 4: Player billing canceled effective in past but status not canceled
   * =========================
   */
  const playersCancelMismatch = await prisma.playerProfile.findMany({
    where: {
      playerCancelEffectiveAt: { lt: now },
      NOT: { playerBillingStatus: { in: ["CANCELED", "CANCELLED"] as any } },
    },
    select: {
      id: true,
      email: true,
      playerBillingStatus: true,
      playerCancelEffectiveAt: true,
      updatedAt: true,
    },
    orderBy: { playerCancelEffectiveAt: "asc" },
    take: 200,
  });

  /**
   * =========================
   * CHECK 5: Team billing canceled effective in past but status not canceled
   * =========================
   */
  const teamsCancelMismatch = await prisma.team.findMany({
    where: {
      cancelEffectiveAt: { lt: now },
      NOT: { billingStatus: { in: ["CANCELED", "CANCELLED"] as any } },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      billingStatus: true,
      cancelEffectiveAt: true,
      updatedAt: true,
    },
    orderBy: { cancelEffectiveAt: "asc" },
    take: 200,
  });

  /**
   * =========================
   * CHECK 6: Past-due invoices but subscription status not PAST_DUE
   * (heuristic: if latest invoice is PAST_DUE)
   * =========================
   */
  const playersLatestInvoicePastDue = await prisma.playerProfile.findMany({
    select: {
      id: true,
      email: true,
      playerBillingStatus: true,
      playerInvoices: {
        select: { status: true, invoiceDate: true, dueDate: true, createdAt: true },
        orderBy: { invoiceDate: "desc" },
        take: 1,
      },
    },
    take: 600,
    orderBy: { updatedAt: "desc" },
  });

  const playerPastDueMismatch = playersLatestInvoicePastDue
    .map((p) => {
      const inv = p.playerInvoices?.[0];
      const invStatus = String(inv?.status || "").toUpperCase();
      const subStatus = String(p.playerBillingStatus || "").toUpperCase();
      if (invStatus === "PAST_DUE" && subStatus !== "PAST_DUE") {
        const dt = inv?.invoiceDate ?? inv?.dueDate ?? inv?.createdAt ?? null;
        return { id: p.id, email: p.email, subStatus: p.playerBillingStatus, invStatus, invDate: dt };
      }
      return null;
    })
    .filter(Boolean) as Array<{ id: string; email: string; subStatus: any; invStatus: string; invDate: Date | null }>;

  const teamsLatestInvoicePastDue = await prisma.team.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      billingStatus: true,
      invoices: {
        select: { status: true, periodStart: true, createdAt: true },
        orderBy: { periodStart: "desc" },
        take: 1,
      },
    },
    take: 600,
    orderBy: { updatedAt: "desc" },
  });

  const teamPastDueMismatch = teamsLatestInvoicePastDue
    .map((t) => {
      const inv = t.invoices?.[0];
      const invStatus = String(inv?.status || "").toUpperCase();
      const subStatus = String(t.billingStatus || "").toUpperCase();
      if (invStatus === "PAST_DUE" && subStatus !== "PAST_DUE") {
        const dt = inv?.periodStart ?? inv?.createdAt ?? null;
        return { id: t.id, label: `${t.name} (${t.slug})`, subStatus: t.billingStatus, invStatus, invDate: dt };
      }
      return null;
    })
    .filter(Boolean) as Array<{ id: string; label: string; subStatus: any; invStatus: string; invDate: Date | null }>;

  /**
   * =========================
   * CHECK 7: Discount applications ACTIVE whose code is inactive/expired
   * =========================
   */
  const activeAppsWithInactiveCode = await prisma.discountApplication.findMany({
    where: { status: "ACTIVE" },
    include: { discountCode: true },
    orderBy: { appliedAt: "desc" },
    take: 500,
  });

  const activeAppsInvalid = activeAppsWithInactiveCode
    .map((a) => {
      const codeInactive = !a.discountCode?.isActive;
      const codeExpired = a.discountCode?.expiresAt ? a.discountCode.expiresAt.getTime() < now.getTime() : false;
      if (codeInactive || codeExpired) {
        return {
          id: a.id,
          targetType: a.targetType,
          targetId: a.targetId,
          status: a.status,
          appliedAt: a.appliedAt,
          endsAt: a.endsAt,
          code: a.discountCode?.code ?? "—",
          codeIsActive: !!a.discountCode?.isActive,
          codeExpiresAt: a.discountCode?.expiresAt ?? null,
        };
      }
      return null;
    })
    .filter(Boolean) as Array<any>;

  /**
   * Summary counts
   */
  const redCount =
    dupActiveGroups.length +
    codesExpiredButActive.length +
    playersCancelMismatch.length +
    teamsCancelMismatch.length +
    playerPastDueMismatch.length +
    teamPastDueMismatch.length +
    activeAppsInvalid.length;

  const yellowCount = plansJsonInvalid.length;

  return (
    <main style={{ padding: 24, maxWidth: 1200, fontFamily: "Arial, sans-serif", fontSize: 11 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
        <div>
          <h1 style={{ fontSize: 18, margin: 0 }}>Billing • Health</h1>
          <div style={{ opacity: 0.75, marginTop: 6 }}>
            Data integrity checks for billing + discounts. (No writes — read-only diagnostics.)
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href="/admin/billing/health" style={a}>Refresh</a>
            <Link href="/admin/billing/invoices" style={a}>Invoices</Link>
            <Link href="/admin/billing/subscriptions" style={a}>Subscriptions</Link>
            <Link href="/admin/billing/discounts" style={a}>Discount Codes</Link>
            <Link href="/admin/billing/payouts" style={a}>Payouts</Link>
            <Link href="/admin" style={a}>Back to Admin</Link>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={pill}>
            <Pill label={`RED: ${redCount}`} tone={redCount ? "red" : "green"} />
          </div>
          <div style={pill}>
            <Pill label={`YELLOW: ${yellowCount}`} tone={yellowCount ? "yellow" : "green"} />
          </div>
          <div style={pill}>
            <Pill label={`Checked: ${fmtDateTime(now)}`} tone="slate" />
          </div>
        </div>
      </div>

      {/* CHECK 1 */}
      <section style={card}>
        <div style={hRow}>
          <div style={{ fontWeight: 900 }}>Duplicate ACTIVE discounts per target</div>
          <Pill label={`${dupActiveGroups.length} targets`} tone={dupActiveGroups.length ? "red" : "green"} />
        </div>
        <div style={{ opacity: 0.75, marginTop: 6 }}>
          Expected: max 1 ACTIVE discountApplication per (targetType, targetId).
        </div>

        {dupActiveGroups.length === 0 ? (
          <div style={{ marginTop: 10, opacity: 0.75 }}>All good.</div>
        ) : (
          <div style={{ marginTop: 10 }}>
            <TableWrap>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Target Type", "Target ID", "Count", "Actions"].map((x) => (
                      <th key={x} style={th}>{x}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dupActiveGroups.slice(0, 200).map((g: any) => {
                    const href = targetAdminHref(g.targetType, g.targetId);
                    return (
                      <tr key={`${g.targetType}:${g.targetId}`}>
                        <td style={td}>{String(g.targetType)}</td>
                        <td style={td}>{codeCell(g.targetId)}</td>
                        <td style={td}><span style={{ fontWeight: 900 }}>{g._count?._all ?? 0}</span></td>
                        <td style={td}>
                          {href ? <a href={href} style={actionA}>View Target</a> : <span style={{ opacity: 0.6 }}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>

            <div style={{ marginTop: 10, fontWeight: 900 }}>Sample ACTIVE rows</div>
            <TableWrap>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Applied At", "Target", "Target ID", "Code", "Ends At", "Actions"].map((x) => (
                      <th key={x} style={th}>{x}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dupActiveTargets.slice(0, 200).map((a: any) => {
                    const href = targetAdminHref(a.targetType, a.targetId);
                    return (
                      <tr key={a.id}>
                        <td style={td}>{fmtDateTime(a.appliedAt)}</td>
                        <td style={td}>{String(a.targetType)}</td>
                        <td style={td}>{codeCell(a.targetId)}</td>
                        <td style={td}><span style={{ fontWeight: 900 }}>{a.discountCode?.code ?? "—"}</span></td>
                        <td style={td}>{a.endsAt ? fmtDateTime(a.endsAt) : "—"}</td>
                        <td style={td}>
                          {href ? <a href={href} style={actionA}>View Target</a> : <span style={{ opacity: 0.6 }}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
          </div>
        )}
      </section>

      {/* CHECK 2 */}
      <section style={card}>
        <div style={hRow}>
          <div style={{ fontWeight: 900 }}>Discount codes expired but still active</div>
          <Pill label={`${codesExpiredButActive.length} codes`} tone={codesExpiredButActive.length ? "red" : "green"} />
        </div>
        <div style={{ opacity: 0.75, marginTop: 6 }}>
          These codes have expiresAt in the past but isActive=true.
        </div>

        {codesExpiredButActive.length === 0 ? (
          <div style={{ marginTop: 10, opacity: 0.75 }}>All good.</div>
        ) : (
          <div style={{ marginTop: 10 }}>
            <TableWrap>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Code", "Expires At", "Updated"].map((x) => (
                      <th key={x} style={th}>{x}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {codesExpiredButActive.map((c) => (
                    <tr key={c.id}>
                      <td style={td}><span style={{ fontWeight: 900 }}>{c.code}</span></td>
                      <td style={td}>{fmtDateTime(c.expiresAt)}</td>
                      <td style={td}>{fmtDateTime(c.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </div>
        )}
      </section>

      {/* CHECK 3 */}
      <section style={card}>
        <div style={hRow}>
          <div style={{ fontWeight: 900 }}>plansAllowedJson invalid</div>
          <Pill label={`${plansJsonInvalid.length} codes`} tone={plansJsonInvalid.length ? "yellow" : "green"} />
        </div>
        <div style={{ opacity: 0.75, marginTop: 6 }}>
          Expected: empty string OR JSON array string (e.g. ["REDSHIRT","TEAM"]).
        </div>

        {plansJsonInvalid.length === 0 ? (
          <div style={{ marginTop: 10, opacity: 0.75 }}>All good.</div>
        ) : (
          <div style={{ marginTop: 10 }}>
            <TableWrap>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Code", "Error", "plansAllowedJson", "Updated"].map((x) => (
                      <th key={x} style={th}>{x}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {plansJsonInvalid.slice(0, 200).map((c) => (
                    <tr key={c.id}>
                      <td style={td}><span style={{ fontWeight: 900 }}>{c.code}</span></td>
                      <td style={td}>{c.error}</td>
                      <td style={td}><code>{String(c.plansAllowedJson ?? "").slice(0, 140)}</code></td>
                      <td style={td}>{fmtDateTime(c.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </div>
        )}
      </section>

      {/* CHECK 4 */}
      <section style={card}>
        <div style={hRow}>
          <div style={{ fontWeight: 900 }}>Players: cancelEffectiveAt in past but status not canceled</div>
          <Pill label={`${playersCancelMismatch.length} players`} tone={playersCancelMismatch.length ? "red" : "green"} />
        </div>
        {playersCancelMismatch.length === 0 ? (
          <div style={{ marginTop: 10, opacity: 0.75 }}>All good.</div>
        ) : (
          <div style={{ marginTop: 10 }}>
            <TableWrap>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Email", "Status", "Cancel Effective", "Updated", "Actions"].map((x) => (
                      <th key={x} style={th}>{x}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {playersCancelMismatch.map((p) => (
                    <tr key={p.id}>
                      <td style={td}>{p.email}</td>
                      <td style={td}>{String(p.playerBillingStatus || "—")}</td>
                      <td style={td}>{fmtDateTime(p.playerCancelEffectiveAt)}</td>
                      <td style={td}>{fmtDateTime(p.updatedAt)}</td>
                      <td style={td}>
                        <a href={`/admin/players/${encodeURIComponent(p.id)}`} style={actionA}>View</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </div>
        )}
      </section>

      {/* CHECK 5 */}
      <section style={card}>
        <div style={hRow}>
          <div style={{ fontWeight: 900 }}>Teams: cancelEffectiveAt in past but status not canceled</div>
          <Pill label={`${teamsCancelMismatch.length} teams`} tone={teamsCancelMismatch.length ? "red" : "green"} />
        </div>
        {teamsCancelMismatch.length === 0 ? (
          <div style={{ marginTop: 10, opacity: 0.75 }}>All good.</div>
        ) : (
          <div style={{ marginTop: 10 }}>
            <TableWrap>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Team", "Status", "Cancel Effective", "Updated", "Actions"].map((x) => (
                      <th key={x} style={th}>{x}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {teamsCancelMismatch.map((t) => (
                    <tr key={t.id}>
                      <td style={td}>{t.name} ({t.slug})</td>
                      <td style={td}>{String(t.billingStatus || "—")}</td>
                      <td style={td}>{fmtDateTime(t.cancelEffectiveAt)}</td>
                      <td style={td}>{fmtDateTime(t.updatedAt)}</td>
                      <td style={td}>
                        <a href={`/admin/teams/${encodeURIComponent(t.id)}`} style={actionA}>View</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </div>
        )}
      </section>

      {/* CHECK 6 */}
      <section style={card}>
        <div style={hRow}>
          <div style={{ fontWeight: 900 }}>Latest invoice is PAST_DUE but subscription status isn’t</div>
          <Pill
            label={`${playerPastDueMismatch.length + teamPastDueMismatch.length} accounts`}
            tone={playerPastDueMismatch.length + teamPastDueMismatch.length ? "red" : "green"}
          />
        </div>

        {playerPastDueMismatch.length === 0 && teamPastDueMismatch.length === 0 ? (
          <div style={{ marginTop: 10, opacity: 0.75 }}>All good.</div>
        ) : (
          <div style={{ marginTop: 10, display: "grid", gap: 12 }}>
            {playerPastDueMismatch.length ? (
              <div>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Players</div>
                <TableWrap>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {["Email", "Sub Status", "Invoice Status", "Invoice Date", "Actions"].map((x) => (
                          <th key={x} style={th}>{x}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {playerPastDueMismatch.slice(0, 200).map((p) => (
                        <tr key={p.id}>
                          <td style={td}>{p.email}</td>
                          <td style={td}>{String(p.subStatus || "—")}</td>
                          <td style={td}><Pill label={p.invStatus} tone="red" /></td>
                          <td style={td}>{fmtDateTime(p.invDate)}</td>
                          <td style={td}>
                            <a href={`/admin/players/${encodeURIComponent(p.id)}`} style={actionA}>View</a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
              </div>
            ) : null}

            {teamPastDueMismatch.length ? (
              <div>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>Teams</div>
                <TableWrap>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        {["Team", "Sub Status", "Invoice Status", "Invoice Date", "Actions"].map((x) => (
                          <th key={x} style={th}>{x}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {teamPastDueMismatch.slice(0, 200).map((t) => (
                        <tr key={t.id}>
                          <td style={td}>{t.label}</td>
                          <td style={td}>{String(t.subStatus || "—")}</td>
                          <td style={td}><Pill label={t.invStatus} tone="red" /></td>
                          <td style={td}>{fmtDateTime(t.invDate)}</td>
                          <td style={td}>
                            <a href={`/admin/teams/${encodeURIComponent(t.id)}`} style={actionA}>View</a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
              </div>
            ) : null}
          </div>
        )}
      </section>

      {/* CHECK 7 */}
      <section style={card}>
        <div style={hRow}>
          <div style={{ fontWeight: 900 }}>ACTIVE discount applications whose code is inactive/expired</div>
          <Pill label={`${activeAppsInvalid.length} apps`} tone={activeAppsInvalid.length ? "red" : "green"} />
        </div>

        {activeAppsInvalid.length === 0 ? (
          <div style={{ marginTop: 10, opacity: 0.75 }}>All good.</div>
        ) : (
          <div style={{ marginTop: 10 }}>
            <TableWrap>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Applied At", "Target", "Target ID", "Code", "Code Active", "Code Expires", "Ends At"].map((x) => (
                      <th key={x} style={th}>{x}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeAppsInvalid.slice(0, 250).map((a) => (
                    <tr key={a.id}>
                      <td style={td}>{fmtDateTime(a.appliedAt)}</td>
                      <td style={td}>{String(a.targetType)}</td>
                      <td style={td}>{codeCell(a.targetId)}</td>
                      <td style={td}><span style={{ fontWeight: 900 }}>{a.code}</span></td>
                      <td style={td}>
                        <Pill label={a.codeIsActive ? "TRUE" : "FALSE"} tone={a.codeIsActive ? "green" : "red"} />
                      </td>
                      <td style={td}>{a.codeExpiresAt ? fmtDateTime(a.codeExpiresAt) : "—"}</td>
                      <td style={td}>{a.endsAt ? fmtDateTime(a.endsAt) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          </div>
        )}
      </section>
    </main>
  );
}

/* styles */
const card: React.CSSProperties = {
  marginTop: 14,
  border: "1px solid rgba(0,0,0,0.10)",
  borderRadius: 12,
  padding: 14,
  background: "#fff",
};

const hRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
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

const pill: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(0,0,0,0.12)",
  background: "rgba(202,160,66,0.16)",
  fontWeight: 900,
};

const actionA: React.CSSProperties = {
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
