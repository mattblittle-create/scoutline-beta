// app/admin/coach-join-requests/page.tsx
"use client";

import * as React from "react";

type StaffRole = "HEAD" | "ASSISTANT" | "RECRUITING" | "ADMIN";
type JoinStatus = "PENDING" | "APPROVED" | "DENIED";

type Row = {
  id: string;
  status: JoinStatus;
  requestedRole: StaffRole;
  proofUrl: string | null;
  notes: string | null;
  createdAt: string;

  college: { id: string; name: string } | null;
  requestedByUser: { id: string; email: string; name: string | null } | null;
};

type ListOk = { ok: true; data: { requests: Row[] } };
type ApiErr = { ok: false; error: string };

function fmtDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function roleLabel(r: StaffRole) {
  switch (r) {
    case "HEAD":
      return "Head Coach";
    case "ASSISTANT":
      return "Assistant Coach";
    case "RECRUITING":
      return "Recruiting Staff";
    case "ADMIN":
      return "Program Admin";
    default:
      return r;
  }
}

export default function AdminCoachJoinRequestsPage() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const [denyNotesById, setDenyNotesById] = React.useState<Record<string, string>>({});
  const [toast, setToast] = React.useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/coach-join-requests", { cache: "no-store" });
      const json: ListOk | ApiErr = await res.json().catch(() => ({ ok: false, error: "Bad response" } as any));

      if (!res.ok || !json.ok) throw new Error((!json.ok && json.error) || `Failed (${res.status})`);

      const incoming = Array.isArray(json.data.requests) ? json.data.requests : [];
      setRows(incoming);
    } catch (e: any) {
      setError(e?.message || "Failed to load requests.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  async function approve(id: string) {
    setError(null);
    setBusyId(id);

    try {
      const res = await fetch(`/api/admin/coach-join-requests/${encodeURIComponent(id)}/approve`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) throw new Error(json?.error || `Failed (${res.status})`);

      setToast("Approved!");
      window.setTimeout(() => setToast(null), 1500);
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to approve.");
    } finally {
      setBusyId(null);
    }
  }

  async function deny(id: string) {
    setError(null);
    setBusyId(id);

    try {
      const notes = (denyNotesById[id] || "").trim();

      const res = await fetch(`/api/admin/coach-join-requests/${encodeURIComponent(id)}/deny`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) throw new Error(json?.error || `Failed (${res.status})`);

      setToast("Denied.");
      window.setTimeout(() => setToast(null), 1500);
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to deny.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main style={{ display: "grid", gap: 14 }}>
      <section style={card}>
        <div style={title}>Coach Join Requests</div>
        <div style={muted}>
          Review self-signup requests to join a college program. Approving sets the coach’s collegeId and unlocks program access.
        </div>
      </section>

      <section style={card}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
          <div style={{ fontWeight: 900 }}>Pending Requests ({loading ? "—" : rows.length})</div>

          <button type="button" style={btnGhost} onClick={load} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {toast ? <div style={{ ...muted, color: "#047857", fontWeight: 900 }}>{toast}</div> : null}
        {error ? <div style={errorBox}>{error}</div> : null}

        {loading ? (
          <div style={{ paddingTop: 10, color: "#475569", fontWeight: 800 }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ paddingTop: 10, color: "#64748b", fontWeight: 800 }}>No pending requests.</div>
        ) : (
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            {rows.map((r) => {
              const who = r.requestedByUser?.email || "—";
              const name = r.requestedByUser?.name ? `(${r.requestedByUser.name})` : "";
              const college = r.college?.name || "—";
              const proof = r.proofUrl?.trim() || "";

              return (
                <div key={r.id} style={rowCard}>
                  <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {who} {name}
                      </div>

                      <div style={pill}>
                        {roleLabel(r.requestedRole)}
                      </div>

                      <div style={{ ...pill, background: "#f8fafc" }}>
                        {college}
                      </div>
                    </div>

                    <div style={mutedLine}>Requested: {fmtDate(r.createdAt)}</div>

                    {proof ? (
                      <div style={mutedLine}>
                        Proof:{" "}
                        <a href={proof} target="_blank" rel="noreferrer" style={link}>
                          {proof}
                        </a>
                      </div>
                    ) : (
                      <div style={mutedLine}>Proof: —</div>
                    )}

                    <div style={{ display: "grid", gap: 6, marginTop: 4 }}>
                      <div style={{ fontWeight: 900, fontSize: 12, color: "#0f172a" }}>Deny note (optional)</div>
                      <input
                        style={input}
                        value={denyNotesById[r.id] ?? ""}
                        onChange={(e) => setDenyNotesById((prev) => ({ ...prev, [r.id]: e.target.value }))}
                        placeholder="e.g., Please provide staff directory link confirming your role."
                      />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      style={btnGold}
                      disabled={busyId === r.id}
                      onClick={() => approve(r.id)}
                      title="Approve request (links coach to this college)"
                    >
                      {busyId === r.id ? "Working…" : "Approve"}
                    </button>

                    <button
                      type="button"
                      style={dangerBtn}
                      disabled={busyId === r.id}
                      onClick={() => deny(r.id)}
                      title="Deny request"
                    >
                      Deny
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

/* ---------------- Styles ---------------- */

const card: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  background: "#fff",
  padding: 14,
  boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
};

const title: React.CSSProperties = {
  fontWeight: 900,
  fontSize: 18,
};

const muted: React.CSSProperties = {
  marginTop: 6,
  color: "#475569",
  lineHeight: 1.35,
};

const mutedLine: React.CSSProperties = {
  color: "#64748b",
  fontWeight: 800,
  fontSize: 12,
};

const rowCard: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 12,
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
  background: "#fff",
};

const pill: React.CSSProperties = {
  padding: "5px 10px",
  borderRadius: 999,
  border: "1px solid #e5e7eb",
  fontWeight: 900,
  fontSize: 12,
  whiteSpace: "nowrap",
  background: "rgba(202,160,66,0.16)",
};

const input: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: "10px 12px",
  fontWeight: 400,
  outline: "none",
  background: "#fff",
};

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

const btnGold: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #caa042",
  background: "#caa042",
  color: "#0f172a",
  fontWeight: 900,
  cursor: "pointer",
};

const dangerBtn: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #fecaca",
  background: "#fff1f2",
  color: "#7f1d1d",
  fontWeight: 900,
  cursor: "pointer",
};

const link: React.CSSProperties = {
  color: "#0ea5e9",
  fontWeight: 900,
  textDecoration: "none",
};
