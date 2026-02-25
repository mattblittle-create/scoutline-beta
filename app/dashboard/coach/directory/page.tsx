// app/dashboard/coach/directory/page.tsx
"use client";

import React from "react";

const ROLE_PRESETS = [
  "Head Coach",
  "Assistant Coach",
  "Pitching Coach",
  "Hitting Coach",
  "Fielding Coach",
  "Recruiting Coordinator",
  "Recruiting Staff",
  "Program Manager",
  "Program Staff",
  "General Manager",
] as const;

type StaffTitle = (typeof ROLE_PRESETS)[number];

type StaffRow = {
  id: string;
  name: string | null;
  email: string;

  staffTitle: StaffTitle | null;

  slug: string | null;
  workPhone: string | null;
  workPhoneExt: string | null;

  // ✅ NEW: program admin checkbox flag
  isProgramAdmin: boolean;
};

type ListOk = { ok: true; data: { staff: StaffRow[]; currentUserId?: string | null } };
type ApiErr = { ok: false; error: string };

function normalizeTitle(v: any): string {
  const raw = String(v ?? "").trim();
  const hit = ROLE_PRESETS.find((x) => x === raw);
  return hit || (raw || "—");
}

function digitsOnly(v: any) {
  return String(v ?? "").replace(/\D+/g, "");
}

function formatPhoneUS(input: any) {
  const d = digitsOnly(input).slice(0, 10);
  if (!d) return "—";
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function formatPhoneWithExt(phone: any, ext: any) {
  const base = formatPhoneUS(phone);
  const e = digitsOnly(ext).slice(0, 6);
  if (base === "—") return "—";
  return e ? `${base} x${e}` : base;
}

export default function CoachDirectoryPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<StaffRow[]>([]);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  // who am I (to disable self-remove and optionally self-admin toggle rules in UI)
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/coach/staff", { cache: "no-store" });
      const json: ListOk | ApiErr = await res.json().catch(() => ({ ok: false, error: "Bad response" } as any));

      if (!res.ok || !json.ok) throw new Error((!json.ok && json.error) || `Failed (${res.status})`);

      setRows(Array.isArray(json.data.staff) ? json.data.staff : []);
      setCurrentUserId((json as any)?.data?.currentUserId ? String((json as any).data.currentUserId) : null);
    } catch (e: any) {
      setError(e?.message || "Failed to load staff.");
      setRows([]);
      setCurrentUserId(null);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  async function removeStaff(userId: string) {
    const ok = window.confirm("Remove this staff member from your program? They will lose access immediately.");
    if (!ok) return;

    setError(null);
    setBusyId(userId);

    try {
      const res = await fetch(`/api/coach/staff/${encodeURIComponent(userId)}/remove`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) throw new Error(json?.error || `Failed (${res.status})`);

      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to remove staff.");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleAdmin(userId: string, nextVal: boolean) {
    setError(null);
    setBusyId(userId);

    try {
      const res = await fetch(`/api/coach/staff/${encodeURIComponent(userId)}/admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isProgramAdmin: nextVal }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) throw new Error(json?.error || `Failed (${res.status})`);

      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to update admin.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main style={{ display: "grid", gap: 14 }}>
      <section style={topRow}>
        <div style={{ minWidth: 260, flex: 1 }}>
          <div style={pageTitle}>Staff Directory</div>
          <div style={pageMuted}>
            Active staff member(s) linked to your program. Program admin(s) can toggle admin access and remove staff.
          </div>
        </div>
      </section>

      <section style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontWeight: 900 }}>Staff ({loading ? "—" : rows.length})</div>
          <button type="button" style={btnGhost} onClick={load} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {error ? <div style={errorBox}>{error}</div> : null}

        {loading ? (
          <div style={{ paddingTop: 10, color: "#475569", fontWeight: 800 }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ paddingTop: 10, color: "#64748b", fontWeight: 800 }}>No staff found for this program yet.</div>
        ) : (
          <div style={{ marginTop: 12, ...tableScroll }}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Name</th>
                  <th style={th}>Role</th>
                  <th style={th}>Email</th>
                  <th style={th}>Phone</th>
                  <th style={thCenter}>Admin</th>
                  <th style={thRight}>Remove</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const name = s.name || s.email.split("@")[0];
                  const profileHref = s.slug ? `/coach/${s.slug}` : null;

                  const isSelf = !!currentUserId && s.id === currentUserId;
                  const busy = busyId === s.id;

                  return (
                    <tr key={s.id}>
                      <td style={td}>
                        {profileHref ? (
                          <a href={profileHref} target="_blank" rel="noreferrer" style={link}>
                            {name}
                          </a>
                        ) : (
                          <span style={{ fontWeight: 900 }}>{name}</span>
                        )}
                      </td>

                      <td style={td}>{normalizeTitle(s.staffTitle)}</td>
                      <td style={td}>{s.email}</td>
                      <td style={td}>{formatPhoneWithExt(s.workPhone, s.workPhoneExt)}</td>

                      <td style={tdCenter}>
                        <input
                          type="checkbox"
                          checked={!!s.isProgramAdmin}
                          disabled={busy}
                          onChange={(e) => toggleAdmin(s.id, e.target.checked)}
                          title="Program admin: can manage staff and access controls"
                        />
                      </td>

                      <td style={tdRight}>
                        <button
                          type="button"
                          style={dangerBtn}
                          disabled={busy || isSelf}
                          onClick={() => removeStaff(s.id)}
                          title={isSelf ? "You cannot remove yourself." : "Remove staff"}
                        >
                          {busy ? "Working…" : "Remove"}
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
    </main>
  );
}

/* styles */

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

const pageMuted: React.CSSProperties = {
  marginTop: 6,
  color: "#475569",
  lineHeight: 1.35,
};

const card: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  background: "#fff",
  padding: 14,
  boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
};

const title: React.CSSProperties = { fontWeight: 900, fontSize: 18 };

const muted: React.CSSProperties = { marginTop: 6, color: "#475569", lineHeight: 1.35 };

const errorBox: React.CSSProperties = {
  marginTop: 10,
  padding: "10px 12px",
  border: "1px solid #fecaca",
  background: "#fff1f2",
  color: "#7f1d1d",
  borderRadius: 12,
  fontWeight: 900,
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

// ✅ show ~10 rows then scroll
const tableScroll: React.CSSProperties = {
  overflowX: "auto",
  maxHeight: 420,
  overflowY: "auto",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
};

const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
  tableLayout: "fixed",
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  background: "#f8fafc",
  color: "#64748b",
  fontWeight: 900,
  borderBottom: "1px solid #e5e7eb",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  position: "sticky",
  top: 0,
  zIndex: 1,
};

const thRight: React.CSSProperties = { ...th, textAlign: "right" };

const thCenter: React.CSSProperties = { ...th, textAlign: "center", width: 80 };

const td: React.CSSProperties = {
  padding: "10px 12px",
  borderTop: "1px solid #eef2f7",
  color: "#0f172a",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const tdRight: React.CSSProperties = { ...td, textAlign: "right" };

const tdCenter: React.CSSProperties = { ...td, textAlign: "center" };

const link: React.CSSProperties = { color: "#0ea5e9", fontWeight: 900, textDecoration: "none" };

const dangerBtn: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #fecaca",
  background: "#fff1f2",
  color: "#7f1d1d",
  fontWeight: 900,
  cursor: "pointer",
};
