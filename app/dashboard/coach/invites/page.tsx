// app/dashboard/coach/invites/page.tsx
"use client";

import * as React from "react";

type InviteStatus = "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED";

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

type InviteRow = {
  id: string;
  invitedEmail: string;
  status: InviteStatus;

  canEditLists: boolean;

  // ✅ NEW: title string (matches ROLE_PRESETS)
  staffTitle: StaffTitle;

  createdAt?: string | null;
  updatedAt?: string | null;
  acceptedAt?: string | null;
  expiresAt?: string | null;

  createdBy?: { name: string | null; email: string } | null;
  acceptedUser?: { name: string | null; email: string } | null;
};

type ListOk = { ok: true; data: { invites: InviteRow[] } };
type ApiErr = { ok: false; error: string };

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
    case "REVOKED":
      return { bg: "#fff1f2", border: "#fecaca", text: "#7f1d1d" };
    default:
      return { bg: "#fff", border: "#e5e7eb", text: "#0f172a" };
  }
}

function normalizeTitle(v: any): StaffTitle {
  const raw = String(v ?? "").trim();
  const hit = ROLE_PRESETS.find((x) => x === raw);
  return hit || "Assistant Coach";
}

export default function CoachInvitesPage() {
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // ----- Send Invite form -----
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [staffTitle, setStaffTitle] = React.useState<StaffTitle>("Assistant Coach");
  const [canEditLists, setCanEditLists] = React.useState(true);

  // ----- Search form -----
  const [qDraft, setQDraft] = React.useState("");
  const [q, setQ] = React.useState("");
  const [statusDraft, setStatusDraft] = React.useState<"ANY" | InviteStatus>("ANY");
  const [status, setStatus] = React.useState<"ANY" | InviteStatus>("ANY");

  const [rows, setRows] = React.useState<InviteRow[]>([]);
  const [actionBusyId, setActionBusyId] = React.useState<string | null>(null);

  const [lastInviteLink, setLastInviteLink] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/coach/invites", { cache: "no-store" });
      const json: ListOk | ApiErr = await res.json().catch(() => ({ ok: false, error: "Bad response" } as any));

      if (!res.ok || !json.ok) {
        throw new Error((!json.ok && json.error) || "Failed to load invites.");
      }

      const invites = (json.data.invites || []) as any[];

      const mapped: InviteRow[] = invites.map((r) => ({
        id: String(r.id),
        invitedEmail: String(r.invitedEmail || ""),
        status: r.status as InviteStatus,

        canEditLists: !!r.canEditLists,

        staffTitle: normalizeTitle(r.staffTitle),

        createdAt: r.createdAt ?? null,
        updatedAt: r.updatedAt ?? null,
        acceptedAt: r.acceptedAt ?? null,
        expiresAt: r.expiresAt ?? null,

        createdBy: r.createdBy ?? null,
        acceptedUser: r.acceptedUser ?? null,
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
  }, []);

  // OR search logic
  const filtered = React.useMemo(() => {
    const qq = q.trim().toLowerCase();
    const hasQ = !!qq;
    const hasStatus = status !== "ANY";

    return rows.filter((r) => {
      const emailHay = `${r.invitedEmail} ${r.createdBy?.email ?? ""} ${r.acceptedUser?.email ?? ""}`.toLowerCase();
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
    setLastInviteLink(null);

    const toEmail = inviteEmail.trim().toLowerCase();
    if (!toEmail) return setError("Invite email is required.");
    if (!isEmail(toEmail)) return setError("Invite email must be a valid email address.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/coach/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitedEmail: toEmail, canEditLists, staffTitle }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to create invite.");

      const rawToken = String(json?.data?.rawToken || "");
      if (!rawToken) throw new Error("Invite created but no token returned.");

      const link = `${window.location.origin}/coach/invite/accept?token=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(
        toEmail
      )}`;

      setLastInviteLink(link);

      try {
        await navigator.clipboard.writeText(link);
        setToast("Invite link copied!");
        window.setTimeout(() => setToast(null), 1500);
      } catch {}

      setInviteEmail("");
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to send invite.");
    } finally {
      setSubmitting(false);
    }
  }

  async function resendInvite(id: string, invitedEmail: string) {
    setError(null);
    setActionBusyId(id);

    try {
      const res = await fetch(`/api/coach/invites/${encodeURIComponent(id)}/resend`, {
        method: "POST",
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to resend invite.");

      const rawToken = String(json?.data?.rawToken || "");
      const email = String(json?.data?.invitedEmail || invitedEmail || "").trim().toLowerCase();
      if (!rawToken || !email) throw new Error("Resent invite but missing token/email.");

      const link = `${window.location.origin}/coach/invite/accept?token=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(
        email
      )}`;

      setLastInviteLink(link);

      try {
        await navigator.clipboard.writeText(link);
        setToast("New invite link copied!");
        window.setTimeout(() => setToast(null), 1500);
      } catch {}

      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to resend invite.");
    } finally {
      setActionBusyId(null);
    }
  }

  async function revokeInvite(id: string) {
    setError(null);

    const ok = window.confirm("Revoke this invite? The coach will no longer be able to accept it.");
    if (!ok) return;

    setActionBusyId(id);
    try {
      const res = await fetch(`/api/coach/invites/${encodeURIComponent(id)}/revoke`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) throw new Error(json?.error || "Failed to revoke invite.");

      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to revoke invite.");
    } finally {
      setActionBusyId(null);
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
      <section style={topRow}>
        <div style={{ minWidth: 260, flex: 1 }}>
          <div style={pageTitle}>Invites</div>
          <div style={muted}>Invite other coaches in your program to join ScoutLine and collaborate on recruiting lists.</div>
        </div>
      </section>

      <section style={topBar}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={sectionTitle}>Invite a Coach</div>
          <div style={miniHint}>Enter a staff email address to generate an invite link.</div>
        </div>

        <form onSubmit={sendInvite} style={sendGrid}>
          <div style={filterField}>
            <div style={filterLabel}>Coach Email</div>
            <input
              style={input}
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="coach@school.edu"
              inputMode="email"
              autoComplete="email"
            />
          </div>

          <div style={filterField}>
            <div style={filterLabel}>Role</div>
            <select style={input} value={staffTitle} onChange={(e) => setStaffTitle(e.target.value as any)}>
              {ROLE_PRESETS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div style={filterField}>
            <div style={filterLabel}>Permissions</div>
            <label style={checkRow}>
              <input type="checkbox" checked={canEditLists} onChange={(e) => setCanEditLists(e.target.checked)} />
              Allow coach to edit recruiting lists
            </label>
          </div>

          <div style={sendBtnWrap}>
            <button type="submit" style={btnGold} disabled={submitting || loading}>
              {submitting ? "Creating…" : "Create Invite"}
            </button>
          </div>
        </form>

        {toast ? <div style={{ ...miniHint, color: "#047857", fontWeight: 900 }}>{toast}</div> : null}

        {lastInviteLink ? (
          <div style={linkBox}>
            <div style={{ fontWeight: 900 }}>Invite Link</div>
            <div style={{ marginTop: 6, wordBreak: "break-word", color: "#334155" }}>{lastInviteLink}</div>
            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                style={btnGhost}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(lastInviteLink);
                    setToast("Invite link copied!");
                    window.setTimeout(() => setToast(null), 1500);
                  } catch {}
                }}
              >
                Copy Link
              </button>
              <button type="button" style={btnGhostSolid} onClick={() => setLastInviteLink(null)}>
                Dismiss
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <section style={topBar}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={sectionTitle}>Search Invites</div>
          <div style={miniHint}>Filter invites by email or status, then click Search Invites.</div>
        </div>

        <form onSubmit={submitSearch} style={filtersRow}>
          <div style={filterField}>
            <div style={filterLabel}>Search</div>
            <input style={input} value={qDraft} onChange={(e) => setQDraft(e.target.value)} placeholder="Coach email" />
          </div>

          <div style={filterField}>
            <div style={filterLabel}>Status</div>
            <select style={input} value={statusDraft} onChange={(e) => setStatusDraft(e.target.value as any)}>
              <option value="ANY">Any</option>
              <option value="PENDING">Pending</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="EXPIRED">Expired</option>
              <option value="REVOKED">Revoked</option>
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

            <button type="button" style={btnGhost} onClick={load} disabled={loading}>
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

                        <div style={{ ...statusPill, background: tone.bg, borderColor: tone.border, color: tone.text }}>{r.status}</div>

                        <div style={{ ...rolePill }}>{r.staffTitle}</div>

                        <div style={{ ...miniHint, margin: 0 }}>{r.canEditLists ? "Can edit lists" : "View only"}</div>
                      </div>

                      <div style={mutedLine}>
                        Created: {fmtDate(r.createdAt)} • Updated: {fmtDate(r.updatedAt)} • Expires: {fmtDate(r.expiresAt)}
                      </div>

                      {r.acceptedAt ? (
                        <div style={mutedLine}>
                          Accepted: {fmtDate(r.acceptedAt)} {r.acceptedUser?.email ? `• ${r.acceptedUser.email}` : ""}
                        </div>
                      ) : null}
                    </div>

                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        style={btnGhost}
                        disabled={r.status !== "PENDING" || actionBusyId === r.id}
                        title={r.status !== "PENDING" ? "Only pending invites can be resent." : "Resend invite (copies a fresh link)"}
                        onClick={() => resendInvite(r.id, r.invitedEmail)}
                      >
                        {actionBusyId === r.id ? "Working…" : "Resend"}
                      </button>

                      <button
                        type="button"
                        style={dangerBtn}
                        disabled={r.status !== "PENDING" || actionBusyId === r.id}
                        title={r.status !== "PENDING" ? "Only pending invites can be revoked." : "Revoke invite"}
                        onClick={() => revokeInvite(r.id)}
                      >
                        Revoke
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

const rolePill: React.CSSProperties = {
  padding: "5px 10px",
  borderRadius: 999,
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  color: "#0f172a",
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

const linkBox: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  background: "#f8fafc",
  padding: 12,
};

const checkRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  fontSize: 12,
  color: "#0f172a",
};
