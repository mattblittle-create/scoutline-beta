// app/dashboard/team/invites/page.tsx
"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";

type InviteStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED";

type InviteRow = {
  id: string;
  invitedEmail: string;
  parentEmail?: string | null;
  status: InviteStatus;

  createdAt?: string | null;
  updatedAt?: string | null;
  acceptedAt?: string | null;
  expiresAt?: string | null;
};

function normText(v: any) {
  return String(v ?? "").trim();
}

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function statusTone(s: InviteStatus) {
  switch (s) {
    case "PENDING":
      return { bg: "#fffbeb", border: "#fde68a", text: "#78350f" };
    case "ACCEPTED":
      return { bg: "#f0fdf4", border: "#bbf7d0", text: "#14532d" };
    case "EXPIRED":
      return { bg: "#f1f5f9", border: "#e2e8f0", text: "#0f172a" };
    case "CANCELLED":
      return { bg: "#fff1f2", border: "#fecaca", text: "#7f1d1d" };
    default:
      return { bg: "#fff", border: "#e5e7eb", text: "#0f172a" };
  }
}

export default function TeamInvitesPage() {
  const router = useRouter();

  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // ----- Send Invite form -----
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [parentEmail, setParentEmail] = React.useState("");

  // ----- Search form -----
  const [qDraft, setQDraft] = React.useState("");
  const [q, setQ] = React.useState("");
  const [statusDraft, setStatusDraft] = React.useState<"ANY" | InviteStatus>("ANY");
  const [status, setStatus] = React.useState<"ANY" | InviteStatus>("ANY");

  const [rows, setRows] = React.useState<InviteRow[]>([]);

async function load() {
  setLoading(true);
  setError(null);

  try {
    const url = "/api/team/invites";

      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to load invites.");
      }

      const invites = (json?.data?.invites || []) as any[];
      const mapped: InviteRow[] = invites.map((r) => ({
        id: String(r.id),
        invitedEmail: String(r.invitedEmail || ""),
        parentEmail: r.parentEmail ?? null,
        status: r.status as InviteStatus,
        createdAt: r.createdAt ?? null,
        updatedAt: r.updatedAt ?? null,
        acceptedAt: r.acceptedAt ?? null,
        expiresAt: r.expiresAt ?? null,
      }));

      setRows(mapped);
    } catch (e: any) {
      setError(e?.message || "Failed to load invites.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ OR search logic:
  // - If ONLY status is set -> status filter
  // - If ONLY email query is set -> email filter
  // - If BOTH are set -> match either email OR status
  const filtered = React.useMemo(() => {
    const qq = q.trim().toLowerCase();
    const hasQ = !!qq;
    const hasStatus = status !== "ANY";

    return rows.filter((r) => {
      const emailHay = `${r.invitedEmail} ${r.parentEmail ?? ""}`.toLowerCase();
      const matchQ = hasQ ? emailHay.includes(qq) : false;
      const matchStatus = hasStatus ? r.status === status : false;

      if (hasQ && hasStatus) return matchQ || matchStatus;
      if (hasQ) return matchQ;
      if (hasStatus) return matchStatus;
      return true;
    });
  }, [rows, q, status]);

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();

    setError(null);

    const toEmail = inviteEmail.trim().toLowerCase();
    const parent = parentEmail.trim().toLowerCase();

    if (!toEmail) return setError("Invite email is required.");
    if (!isEmail(toEmail)) return setError("Invite email must be a valid email address.");
    if (parent && !isEmail(parent)) return setError("Parent email must be a valid email address.");

    setSubmitting(true);
    try {
      const url = "/api/team/invites";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invitedEmail: toEmail,
          parentEmail: parent || null,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to send invite.");

      setInviteEmail("");
      setParentEmail("");
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to send invite.");
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelInvite(id: string) {

    setError(null);

    const ok = window.confirm("Cancel this invite?");
    if (!ok) return;

    try {
      const url = "/api/team/invites";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "CANCEL" }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to cancel invite.");

      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "CANCELLED" } : r)));
    } catch (e: any) {
      setError(e?.message || "Failed to cancel invite.");
    }
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setQ(qDraft);
    setStatus(statusDraft);
  }

  const hasActiveSearch = (q && q.trim().length > 0) || status !== "ANY";

  function clearSearch() {
    setQDraft("");
    setStatusDraft("ANY");
    setQ("");
    setStatus("ANY");
  }

  return (
    <main style={{ display: "grid", gap: 14 }}>
      {/* Page header */}
      <section style={topRow}>
        <div style={{ minWidth: 260, flex: 1 }}>
          <div style={pageTitle}>Invites</div>
          <div style={muted}>Send invites via email to players for profile set up and manage existing invites.</div>
<div style={miniHint}>Loaded from your active Team Admin session.</div>
        </div>
      </section>

      {/* Send Invite */}
      <section style={topBar}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={sectionTitle}>Send Invites</div>
          <div style={miniHint}>Enter the player and parent email to send an invite.</div>
        </div>

        <form onSubmit={sendInvite} style={sendGrid}>
          <div style={filterField}>
            <div style={filterLabel}>Player Email</div>
            <input
              style={input}
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="player@email.com"
              inputMode="email"
              autoComplete="email"
            />
          </div>

          <div style={filterField}>
            <div style={filterLabel}>Parent Email (optional)</div>
            <input
              style={input}
              value={parentEmail}
              onChange={(e) => setParentEmail(e.target.value)}
              placeholder="parent@email.com"
              inputMode="email"
              autoComplete="email"
            />
          </div>

          <div style={sendBtnWrap}>
            <button type="submit" style={btnGold} disabled={submitting || loading}>
              {submitting ? "Sending…" : "Send Invite"}
            </button>
          </div>
        </form>
      </section>

      {/* Search + Results */}
      <section style={topBar}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={sectionTitle}>Search Invites</div>
          <div style={miniHint}>Filter invites by email or status, then click Search Invites.</div>
        </div>

        <form onSubmit={submitSearch} style={filtersRow}>
          <div style={filterField}>
            <div style={filterLabel}>Search</div>
            <input
              style={input}
              value={qDraft}
              onChange={(e) => setQDraft(e.target.value)}
              placeholder="Player or Parent email"
            />
          </div>

          <div style={filterField}>
            <div style={filterLabel}>Status</div>
            <select
              style={input}
              value={statusDraft}
              onChange={(e) => setStatusDraft(e.target.value as any)}
            >
              <option value="ANY">Any</option>
              <option value="PENDING">Pending</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="EXPIRED">Expired</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div style={submitBtnWrap}>
            <button type="submit" style={btnGoldSearch} disabled={loading}>
              Search Invites
            </button>
          </div>
        </form>

        <div style={searchHeaderRow}>
          <div style={{ fontWeight: 900 }}>
            Invites ({loading ? "—" : filtered.length} shown / {loading ? "—" : rows.length} total)
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {hasActiveSearch ? (
              <button type="button" style={btnGhostSolid} onClick={clearSearch} disabled={loading}>
                Clear Search
              </button>
            ) : null}

            <button type="button" style={btnGhost} onClick={() => load()} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh List"}
            </button>
          </div>
        </div>

        {error ? <div style={errorBox}>{error}</div> : null}

{loading ? (
          <div style={{ padding: 10, color: "#475569", fontWeight: 800 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 10, color: "#64748b", fontWeight: 800 }}>No invites match your filters.</div>
        ) : (
          <div style={resultsScrollArea}>
            <div style={{ display: "grid", gap: 10 }}>
              {filtered.map((r) => {
                const tone = statusTone(r.status);
                return (
                  <div key={r.id} style={rowCard}>
                    <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis" }}>{r.invitedEmail}</div>

                        <div style={{ ...statusPill, background: tone.bg, borderColor: tone.border, color: tone.text }}>
                          {r.status}
                        </div>
                      </div>

                      <div style={mutedLine}>
                        Parent: <span style={{ fontWeight: 900 }}>{r.parentEmail ?? "—"}</span>
                      </div>

                      <div style={mutedLine}>
                        Created: {fmtDate(r.createdAt)} • Updated: {fmtDate(r.updatedAt)} • Expires: {fmtDate(r.expiresAt)}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        style={dangerBtn}
                        disabled={r.status !== "PENDING"}
                        title={r.status !== "PENDING" ? "Only pending invites can be cancelled." : "Cancel invite"}
                        onClick={() => cancelInvite(r.id)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
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

const sectionTitle: React.CSSProperties = {
  fontWeight: 900,
  fontSize: 14,
  color: "#0f172a",
};

const muted: React.CSSProperties = {
  marginTop: 6,
  color: "#475569",
  lineHeight: 1.35,
};

const topBar: React.CSSProperties = {
  display: "grid",
  gap: 12,
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  background: "#fff",
  padding: 14,
};

const filtersRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 10,
  alignItems: "end",
};

const sendGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 10,
  alignItems: "end",
};

const filterField: React.CSSProperties = {
  display: "grid",
  gap: 6,
  minWidth: 0,
};

const filterLabel: React.CSSProperties = {
  fontWeight: 900,
  fontSize: 12,
  color: "#0f172a",
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

const sendBtnWrap: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-start",
  alignItems: "end",
};

const submitBtnWrap: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-start",
  alignItems: "end",
};

const searchHeaderRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
  padding: "2px 2px 0",
};

const resultsScrollArea: React.CSSProperties = {
  maxHeight: 520,
  overflowY: "auto",
  paddingRight: 6,
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

const statusPill: React.CSSProperties = {
  padding: "5px 10px",
  borderRadius: 999,
  border: "1px solid #e5e7eb",
  fontWeight: 900,
  fontSize: 12,
  whiteSpace: "nowrap",
};

const mutedLine: React.CSSProperties = {
  color: "#64748b",
  fontWeight: 800,
  fontSize: 12,
};

const miniHint: React.CSSProperties = {
  color: "#64748b",
  fontWeight: 700,
  fontSize: 12,
  lineHeight: 1.35,
};

const errorBox: React.CSSProperties = {
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

const btnGold: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #caa042",
  background: "#caa042",
  color: "#0f172a",
  fontWeight: 900,
  textDecoration: "none",
  cursor: "pointer",
};

const btnGoldSearch: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #caa042",
  background: "#caa042",
  color: "#0f172a",
  fontWeight: 900,
  textDecoration: "none",
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
