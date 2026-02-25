// app/admin/audit-log/AuditLogClient.tsx
"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

type EventRow = {
  id: string;
  createdAt: string | Date;

  adminEmail: string;  // already computed server-side
  actingEmail: string; // already computed server-side

  action: string;
  entityType: string;
  entityId: string | null;

  ip: string | null;
  requestId: string | null;
  userAgent: string | null;

  beforeJson: any;
  afterJson: any;
};

type Filters = {
  q: string;
  action: string;
  entityType: string;
  entityId: string;
  requestId: string;

  last: string; // 24h | 7d | 30d | ""
  from: string; // datetime-local
  to: string;   // datetime-local

  take: number;
};

function safeStr(v: any) {
  return String(v ?? "").trim();
}

function clampTake(v: any, fallback: number) {
  const n = Number(String(v ?? "").trim());
  if (!Number.isFinite(n)) return fallback;
  const i = Math.floor(n);
  return Math.max(10, Math.min(500, i));
}

function fmt(d: any) {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString();
}

function entityHref(entityType: string, entityId: string | null) {
  const et = safeStr(entityType);
  const id = safeStr(entityId);
  if (!id) return null;

  // Map to routes you’ve been building
  if (et === "User") return `/admin/users/${encodeURIComponent(id)}`;
  if (et === "PlayerProfile") return `/admin/players/${encodeURIComponent(id)}`;
  if (et === "Team") return `/admin/teams/${encodeURIComponent(id)}`;

  // “list” pages (until you add detail pages)
  if (et === "DiscountCode") return `/admin/discount-codes`;
  if (et === "FeatureFlag") return `/admin/feature-flags`;
  if (et === "TeamInvite") return `/admin/search?q=${encodeURIComponent(id)}`;
  if (et === "CoachInvite") return `/admin/search?q=${encodeURIComponent(id)}`;
  if (et === "CoachJoinRequest") return `/admin/coach-join-requests`;

  return null;
}

export default function AuditLogClient({
  initialEvents,
  initialFilters,
}: {
  initialEvents: EventRow[];
  initialFilters: Filters;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const rowsOptions = React.useMemo(() => [10, 25, 50, 100, 200, 500] as const, []);
  const [openId, setOpenId] = React.useState<string | null>(null);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(sp?.toString() || "");
    if (!value) next.delete(key);
    else next.set(key, value);
    router.push(`/admin/audit-log?${next.toString()}`);
  }

  function clearAll() {
    router.push("/admin/audit-log");
  }

  // Read current values from URL (fallback to server-provided initialFilters)
  const q = safeStr(sp?.get("q") ?? initialFilters.q);
  const action = safeStr(sp?.get("action") ?? initialFilters.action);
  const entityType = safeStr(sp?.get("entityType") ?? initialFilters.entityType);
  const entityId = safeStr(sp?.get("entityId") ?? initialFilters.entityId);
  const requestId = safeStr(sp?.get("requestId") ?? initialFilters.requestId);

  const last = safeStr(sp?.get("last") ?? initialFilters.last);
  const from = safeStr(sp?.get("from") ?? initialFilters.from);
  const to = safeStr(sp?.get("to") ?? initialFilters.to);

  const take = React.useMemo(() => {
    const raw = safeStr(sp?.get("take"));
    if (!raw) return initialFilters.take || 200;
    return clampTake(raw, initialFilters.take || 200);
  }, [sp, initialFilters.take]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {/* Filters */}
      <section style={card}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Filters</div>

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 10 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={lbl}>Quick search</div>
            <input
              value={q}
              onChange={(e) => setParam("q", e.target.value)}
              placeholder="email, action, entity type, entity id, requestId…"
              style={input}
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={lbl}>Action (exact)</div>
            <input
              value={action}
              onChange={(e) => setParam("action", e.target.value)}
              placeholder='e.g., "START_IMPERSONATION"'
              style={input}
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={lbl}>Entity Type (exact)</div>
            <input
              value={entityType}
              onChange={(e) => setParam("entityType", e.target.value)}
              placeholder='e.g., "User"'
              style={input}
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 10 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={lbl}>Entity ID (exact)</div>
            <input
              value={entityId}
              onChange={(e) => setParam("entityId", e.target.value)}
              placeholder="cuid…"
              style={input}
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={lbl}>Request ID (exact)</div>
            <input
              value={requestId}
              onChange={(e) => setParam("requestId", e.target.value)}
              placeholder="requestId…"
              style={input}
            />
          </div>

          {/* ✅ Rows dropdown */}
          <div style={{ display: "grid", gap: 6 }}>
            <div style={lbl}>Rows</div>
            <select
              value={String(rowsOptions.includes(take as any) ? take : 200)}
              onChange={(e) => setParam("take", e.target.value)}
              style={select}
            >
              {rowsOptions.map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date range */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 10 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={lbl}>Date range</div>
            <select value={last} onChange={(e) => setParam("last", e.target.value)} style={select}>
              <option value="">—</option>
              <option value="24h">Last 24h</option>
              <option value="7d">Last 7d</option>
              <option value="30d">Last 30d</option>
            </select>
            <div style={hint}>Use From/To for custom range (leave “last” blank).</div>
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={lbl}>From</div>
            <input
              value={from}
              onChange={(e) => setParam("from", e.target.value)}
              type="datetime-local"
              style={input}
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={lbl}>To</div>
            <input
              value={to}
              onChange={(e) => setParam("to", e.target.value)}
              type="datetime-local"
              style={input}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button type="button" style={btnGhost} onClick={() => router.refresh()}>
            Refresh
          </button>
          <button type="button" style={btnGhost} onClick={clearAll}>
            Clear
          </button>
        </div>
      </section>

      {/* Table */}
      <section style={card}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Events ({initialEvents.length})</div>

        {initialEvents.length === 0 ? (
          <div style={{ opacity: 0.75, fontWeight: 800 }}>No events found.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["When", "Admin", "Acting As", "Action", "Entity", "IP", "Req", "Actions"].map((h) => (
                    <th key={h} style={th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {initialEvents.map((e) => {
                  const entHref = entityHref(e.entityType, e.entityId);
                  const entLabel = `${e.entityType}${e.entityId ? ` ${e.entityId}` : ""}`;

                  return (
                    <tr key={e.id}>
                      <td style={td}>{fmt(e.createdAt)}</td>
                      <td style={td}>{e.adminEmail || "—"}</td>
                      <td style={td}>{e.actingEmail || "—"}</td>
                      <td style={td}>
                        <code>{e.action}</code>
                      </td>
                      <td style={td}>
                        {entHref ? (
                          <a href={entHref} style={a}>
                            {entLabel}
                          </a>
                        ) : (
                          entLabel
                        )}
                      </td>
                      <td style={td}>{e.ip ?? "—"}</td>
                      <td style={td}>{e.requestId ?? "—"}</td>
                      <td style={td}>
                        <button type="button" style={btnLink} onClick={() => setOpenId(e.id)}>
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* View modal */}
      {openId ? (
        <div style={modalOverlay} onMouseDown={(ev) => ev.target === ev.currentTarget && setOpenId(null)}>
          <div style={modalCard}>
            {(() => {
              const e = initialEvents.find((x) => x.id === openId);
              if (!e) return null;

              return (
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                    <div style={{ fontWeight: 900, fontSize: 14 }}>Audit Event</div>
                    <button type="button" style={btnGhost} onClick={() => setOpenId(null)}>
                      Close
                    </button>
                  </div>

                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={kv}>
                      <b>When:</b> {fmt(e.createdAt)}
                    </div>
                    <div style={kv}>
                      <b>Admin:</b> {e.adminEmail || "—"}
                    </div>
                    <div style={kv}>
                      <b>Acting As:</b> {e.actingEmail || "—"}
                    </div>
                    <div style={kv}>
                      <b>Action:</b> {e.action}
                    </div>
                    <div style={kv}>
                      <b>Entity:</b> {e.entityType} {e.entityId ?? "—"}
                    </div>
                    <div style={kv}>
                      <b>IP:</b> {e.ip ?? "—"}
                    </div>
                    <div style={kv}>
                      <b>Request:</b> {e.requestId ?? "—"}
                    </div>
                    <div style={kv}>
                      <b>User Agent:</b> {e.userAgent ?? "—"}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <div style={{ fontWeight: 900 }}>Before</div>
                      <pre style={pre}>{JSON.stringify(e.beforeJson, null, 2)}</pre>
                    </div>
                    <div style={{ display: "grid", gap: 6 }}>
                      <div style={{ fontWeight: 900 }}>After</div>
                      <pre style={pre}>{JSON.stringify(e.afterJson, null, 2)}</pre>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ---------------- Styles ---------------- */

const card: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,0.10)",
  borderRadius: 12,
  padding: 14,
  background: "#fff",
  boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
};

const lbl: React.CSSProperties = {
  fontWeight: 900,
  fontSize: 12,
  color: "#0f172a",
};

const hint: React.CSSProperties = {
  fontSize: 11,
  color: "#64748b",
  fontWeight: 800,
};

const input: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "10px 12px",
  outline: "none",
  background: "#fff",
  fontSize: 12,
};

const select: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "10px 12px",
  outline: "none",
  background: "#fff",
  fontSize: 12,
  fontWeight: 800,
};

const btnGhost: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 900,
  cursor: "pointer",
};

const btnLink: React.CSSProperties = {
  border: "none",
  background: "transparent",
  padding: 0,
  margin: 0,
  cursor: "pointer",
  color: "#2563eb",
  fontWeight: 900,
  textDecoration: "none",
};

const a: React.CSSProperties = {
  color: "#2563eb",
  textDecoration: "none",
  fontWeight: 900,
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

const modalOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.45)",
  display: "grid",
  placeItems: "center",
  padding: 16,
  zIndex: 50,
};

const modalCard: React.CSSProperties = {
  width: "min(980px, 96vw)",
  borderRadius: 14,
  border: "1px solid rgba(0,0,0,0.15)",
  background: "#fff",
  padding: 14,
  boxShadow: "0 14px 40px rgba(15,23,42,0.20)",
};

const kv: React.CSSProperties = {
  fontSize: 12,
  color: "#0f172a",
  lineHeight: 1.35,
};

const pre: React.CSSProperties = {
  margin: 0,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  fontSize: 11,
  lineHeight: 1.35,
  background: "#f8fafc",
  border: "1px solid rgba(0,0,0,0.08)",
  borderRadius: 10,
  padding: 12,
  maxHeight: 320,
  overflow: "auto",
};
