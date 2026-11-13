// app/dashboard/team/invites/page.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

type InviteStatus =
  | "PENDING"
  | "ACCEPTED"
  | "DECLINED"
  | "EXPIRED"
  | "CANCELLED";
type StatusFilter = "ANY" | InviteStatus;

type InviteRow = {
  id: string;
  invitedEmail: string;
  parentEmail?: string | null;
  status: InviteStatus;
  createdAt?: string | null;
  updatedAt?: string | null;
  acceptedAt?: string | null;
  expiresAt?: string | null;
  acceptedUserId?: string | null;
  playerProfileId?: string | null;
};

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function getDisplayStatus(invite: InviteRow): InviteStatus {
  if (invite.status !== "PENDING") return invite.status;

  if (!invite.expiresAt) return invite.status;

  const expires = new Date(invite.expiresAt);

  if (Number.isNaN(expires.getTime())) return invite.status;

  return expires.getTime() < Date.now() ? "EXPIRED" : invite.status;
}

function statusTone(s: InviteStatus) {
  switch (s) {
    case "PENDING":
      return { bg: "#fffbeb", border: "#fde68a", text: "#e36117" };
    case "ACCEPTED":
      return { bg: "#f0fdf4", border: "#bbf7d0", text: "#14532d" };
    case "DECLINED":
      return { bg: "#fff1f2", border: "#fecaca", text: "#9f1239" };
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
  const [busyInviteId, setBusyInviteId] = React.useState("");
const [error, setError] = React.useState<string | null>(null);

const [joinLink, setJoinLink] = React.useState<string>("");
const [joinLinkBusy, setJoinLinkBusy] = React.useState(false);
const [joinLinkMsg, setJoinLinkMsg] = React.useState<string | null>(null);

const [inviteEmail, setInviteEmail] = React.useState("");
const [parentEmail, setParentEmail] = React.useState("");

  const [qDraft, setQDraft] = React.useState("");
  const [q, setQ] = React.useState("");
  const [statusDraft, setStatusDraft] = React.useState<StatusFilter>("ANY");
  const [status, setStatus] = React.useState<StatusFilter>("ANY");

  const [rows, setRows] = React.useState<InviteRow[]>([]);

  const [editingInvite, setEditingInvite] = React.useState<InviteRow | null>(
    null
  );
  const [editInvitedEmail, setEditInvitedEmail] = React.useState("");
  const [editParentEmail, setEditParentEmail] = React.useState("");

async function loadJoinLink() {
  setJoinLinkBusy(true);
  setJoinLinkMsg(null);

  try {
    const res = await fetch("/api/team/join-link", {
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok || !json?.ok) {
      throw new Error(json?.error || "Failed to load team join link.");
    }

    setJoinLink(json?.data?.joinUrl || "");
  } catch (err: any) {
    setJoinLinkMsg(err?.message || "Failed to load team join link.");
  } finally {
    setJoinLinkBusy(false);
  }
}

async function regenerateJoinLink() {
  if (!confirm("Regenerate this team join link? The old link will stop working.")) {
    return;
  }

  setJoinLinkBusy(true);
  setJoinLinkMsg(null);

  try {
    const res = await fetch("/api/team/join-link", {
      method: "POST",
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok || !json?.ok) {
      throw new Error(json?.error || "Failed to regenerate team join link.");
    }

    setJoinLink(json?.data?.joinUrl || "");
    setJoinLinkMsg("Team join link regenerated.");
  } catch (err: any) {
    setJoinLinkMsg(err?.message || "Failed to regenerate team join link.");
  } finally {
    setJoinLinkBusy(false);
  }
}

const joinQrUrl = joinLink
  ? `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(joinLink)}`
  : "";

const joinShareText = joinLink
  ? `Join our team on ScoutLine: ${joinLink}`
  : "";

async function copyJoinLink() {
  if (!joinLink) return;

  try {
    await navigator.clipboard.writeText(joinLink);
    setJoinLinkMsg("Team join link copied.");
  } catch {
    setJoinLinkMsg("Could not copy automatically. Highlight and copy the link manually.");
  }
}

async function copyJoinShareText() {
  if (!joinShareText) return;

  try {
    await navigator.clipboard.writeText(joinShareText);
    setJoinLinkMsg("Team message copied.");
  } catch {
    setJoinLinkMsg("Could not copy automatically. Highlight and copy manually.");
  }
}

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/team/invites", { cache: "no-store" });
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
        playerProfileId: r.playerProfileId ?? null,
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
  loadJoinLink();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  const stats = React.useMemo(() => {
    const total = rows.length;
    const pending = rows.filter((r) => getDisplayStatus(r) === "PENDING").length;
    const accepted = rows.filter((r) => getDisplayStatus(r) === "ACCEPTED").length;
    const declined = rows.filter((r) => getDisplayStatus(r) === "DECLINED").length;
    const expired = rows.filter((r) => getDisplayStatus(r) === "EXPIRED").length;
    const cancelled = rows.filter((r) => getDisplayStatus(r) === "CANCELLED").length;

    return {
      total,
      sent: total,
      pending,
      accepted,
      declined,
      expired,
      cancelled,
    };
  }, [rows]);

  const filtered = React.useMemo(() => {
    const qq = q.trim().toLowerCase();
    const hasQ = !!qq;
    const hasStatus = status !== "ANY";

    return rows.filter((r) => {
      const emailHay = `${r.invitedEmail} ${r.parentEmail ?? ""}`.toLowerCase();
      const matchQ = hasQ ? emailHay.includes(qq) : false;
      const displayStatus = getDisplayStatus(r);
      const matchStatus = hasStatus ? displayStatus === status : false;

      if (hasQ && hasStatus) return matchQ && matchStatus;
      if (hasQ) return matchQ;
      if (hasStatus) return matchStatus;
      return true;
    });
  }, [rows, q, status]);

  const hasActiveSearch = (q && q.trim().length > 0) || status !== "ANY";

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();

    setError(null);

    const toEmail = inviteEmail.trim().toLowerCase();
    const parent = parentEmail.trim().toLowerCase();

    if (!toEmail) return setError("Invite email is required.");
    if (!isEmail(toEmail)) {
      return setError("Invite email must be a valid email address.");
    }
    if (parent && !isEmail(parent)) {
      return setError("Parent email must be a valid email address.");
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/team/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invitedEmail: toEmail,
          parentEmail: parent || null,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to send invite.");
      }

      setInviteEmail("");
      setParentEmail("");
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to send invite.");
    } finally {
      setSubmitting(false);
    }
  }

  async function resendInvite(id: string) {
  setError(null);
  setBusyInviteId(id);

  try {
    const res = await fetch("/api/team/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "RESEND" }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok || !json?.ok) {
      throw new Error(json?.error || "Failed to resend invite.");
    }

    await load();
  } catch (e: any) {
    setError(e?.message || "Failed to resend invite.");
  } finally {
    setBusyInviteId("");
  }
}

  async function cancelInvite(id: string) {
    setError(null);

    const ok = window.confirm("Cancel this invite?");
    if (!ok) return;

    setBusyInviteId(id);

    try {
      const res = await fetch("/api/team/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "CANCEL" }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to cancel invite.");
      }

      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to cancel invite.");
    } finally {
      setBusyInviteId("");
    }
  }

  function openUpdateInvite(invite: InviteRow) {
    setEditingInvite(invite);
    setEditInvitedEmail(invite.invitedEmail || "");
    setEditParentEmail(invite.parentEmail || "");
    setError(null);
  }

  async function submitInviteUpdate(e: React.FormEvent) {
    e.preventDefault();

    if (!editingInvite) return;

    const invitedEmail = editInvitedEmail.trim().toLowerCase();
    const parent = editParentEmail.trim().toLowerCase();

    if (!invitedEmail) return setError("Invite email is required.");
    if (!isEmail(invitedEmail)) {
      return setError("Invite email must be a valid email address.");
    }
    if (parent && !isEmail(parent)) {
      return setError("Parent email must be a valid email address.");
    }

    setBusyInviteId(editingInvite.id);
    setError(null);

    try {
      const res = await fetch("/api/team/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingInvite.id,
          action: "UPDATE",
          invitedEmail,
          parentEmail: parent || null,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to update invite.");
      }

      setEditingInvite(null);
      setEditInvitedEmail("");
      setEditParentEmail("");
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to update invite.");
    } finally {
      setBusyInviteId("");
    }
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    setQ(qDraft);
    setStatus(statusDraft);
  }

  function clearSearch() {
    setQDraft("");
    setStatusDraft("ANY");
    setQ("");
    setStatus("ANY");
  }

  function applyStatusFilter(nextStatus: StatusFilter) {
    setStatus(nextStatus);
    setStatusDraft(nextStatus);
  }

  return (
    <main style={{ display: "grid", gap: 14 }}>
      <section style={topRow}>
        <div style={{ minWidth: 260, flex: 1 }}>
          <div style={pageTitle}>Invites</div>
          <div style={muted}>
            Send invites to players in your organization for profile set up and manage
            existing invites.
          </div>
          <div style={miniHint}>Loaded from your active Team Admin session.</div>
        </div>
      </section>

<section style={topBar}>
  <div style={{ display: "grid", gap: 6 }}>
    <div style={sectionTitle}>Team Join Link / QR Code</div>
    <div style={miniHint}>
      Use this reusable link or the printed QR code for mass group invites.
    </div>
  </div>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "minmax(0, 1fr) 180px",
      gap: 16,
      alignItems: "start",
    }}
  >
    <div style={{ display: "grid", gap: 10 }}>
      <input
        style={input}
        value={joinLinkBusy ? "Loading team join link..." : joinLink}
        readOnly
        placeholder="Team join link will appear here"
        onFocus={(e) => e.currentTarget.select()}
      />

      <textarea
        style={{
          ...input,
          minHeight: 74,
          resize: "vertical",
          lineHeight: 1.45,
        }}
        value={joinShareText}
        readOnly
        placeholder="Team share message will appear here"
        onFocus={(e) => e.currentTarget.select()}
      />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          style={btnGold}
          onClick={copyJoinLink}
          disabled={!joinLink || joinLinkBusy}
        >
          Copy Link
        </button>

        <button
          type="button"
          style={btnGhost}
          onClick={copyJoinShareText}
          disabled={!joinShareText || joinLinkBusy}
        >
          Copy Message
        </button>

        <a
          href={joinLink || "#"}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            ...btnGhost,
            opacity: joinLink ? 1 : 0.6,
            pointerEvents: joinLink ? "auto" : "none",
            textDecoration: "none",
          }}
        >
          Open Invite Page
        </a>

        <a
          href={joinQrUrl || "#"}
          download="scoutline-team-join-qr.png"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            ...btnGhost,
            opacity: joinQrUrl ? 1 : 0.6,
            pointerEvents: joinQrUrl ? "auto" : "none",
            textDecoration: "none",
          }}
        >
          Download QR Code
        </a>

        <button
          type="button"
          style={btnGhost}
          onClick={regenerateJoinLink}
          disabled={joinLinkBusy}
        >
          Regenerate Link
        </button>
      </div>

      {joinLinkMsg ? (
        <div
          style={
            joinLinkMsg.includes("Failed") || joinLinkMsg.includes("Could not")
              ? errorBox
              : miniHint
          }
        >
          {joinLinkMsg}
        </div>
      ) : null}
    </div>

    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        background: "#ffffff",
        padding: 12,
        display: "grid",
        gap: 8,
        justifyItems: "center",
      }}
    >
      {joinQrUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={joinQrUrl}
          alt="Team join QR code"
          style={{
            width: 150,
            height: 150,
            objectFit: "contain",
          }}
        />
      ) : (
        <div style={miniHint}>QR loading…</div>
      )}

      <div
        style={{
          fontSize: 11,
          fontWeight: 900,
          color: "#64748b",
          textAlign: "center",
          lineHeight: 1.35,
        }}
      >
        Scan to join team
      </div>
    </div>
  </div>
</section>

      <section style={topBar}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={sectionTitle}>Send Invites</div>
          <div style={miniHint}>
            Enter the player and parent email to send an invite.
          </div>
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

      {editingInvite ? (
        <section style={editBox}>
          <div style={{ display: "grid", gap: 4 }}>
            <div style={sectionTitle}>Update Pending Invite</div>
            <div style={miniHint}>
              Updating an invite refreshes the invite link and resends the setup
              email.
            </div>
          </div>

          <form onSubmit={submitInviteUpdate} style={sendGrid}>
            <div style={filterField}>
              <div style={filterLabel}>Player Email</div>
              <input
                style={input}
                value={editInvitedEmail}
                onChange={(e) => setEditInvitedEmail(e.target.value)}
                placeholder="player@email.com"
                inputMode="email"
                autoComplete="email"
              />
            </div>

            <div style={filterField}>
              <div style={filterLabel}>Parent Email (optional)</div>
              <input
                style={input}
                value={editParentEmail}
                onChange={(e) => setEditParentEmail(e.target.value)}
                placeholder="parent@email.com"
                inputMode="email"
                autoComplete="email"
              />
            </div>

            <div style={sendBtnWrap}>
              <button
                type="submit"
                style={btnGold}
                disabled={busyInviteId === editingInvite.id}
              >
                {busyInviteId === editingInvite.id
                  ? "Updating…"
                  : "Update Invite"}
              </button>

              <button
                type="button"
                style={btnGhost}
                onClick={() => setEditingInvite(null)}
                disabled={busyInviteId === editingInvite.id}
              >
                Cancel Update
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section style={topBar}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={sectionTitle}>Search Invites</div>
          <div style={miniHint}>
            Filter invites by email or click a status stat below.
          </div>
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
              <option value="ANY">Any — {stats.total} total</option>
              <option value="PENDING">Pending — {stats.pending}</option>
              <option value="ACCEPTED">Accepted — {stats.accepted}</option>
              <option value="DECLINED">Declined — {stats.declined}</option>
              <option value="EXPIRED">Expired — {stats.expired}</option>
              <option value="CANCELLED">Cancelled — {stats.cancelled}</option>
            </select>
          </div>

          <div style={submitBtnWrap}>
            <button type="submit" style={btnGoldSearch} disabled={loading}>
              Search Invites
            </button>
          </div>
        </form>

        <div style={statsRow}>
          <button
            type="button"
            style={status === "ANY" ? statPillActive : statPill}
            onClick={() => applyStatusFilter("ANY")}
          >
            {stats.total} total
          </button>

          <button
            type="button"
            style={statPill}
            onClick={() => applyStatusFilter("ANY")}
            title="Total invites sent"
          >
            {stats.sent} sent
          </button>

          <button
            type="button"
            style={status === "ACCEPTED" ? statPillActive : statPill}
            onClick={() => applyStatusFilter("ACCEPTED")}
          >
            {stats.accepted} accepted
          </button>

          <button
            type="button"
            style={status === "DECLINED" ? statPillActive : statPill}
            onClick={() => applyStatusFilter("DECLINED")}
          >
            {stats.declined} declined
          </button>

          <button
            type="button"
            style={status === "EXPIRED" ? statPillActive : statPill}
            onClick={() => applyStatusFilter("EXPIRED")}
          >
            {stats.expired} expired
          </button>

          <button
            type="button"
            style={status === "CANCELLED" ? statPillActive : statPill}
            onClick={() => applyStatusFilter("CANCELLED")}
          >
            {stats.cancelled} cancelled
          </button>

          <button
            type="button"
            style={status === "PENDING" ? statPillActive : statPill}
            onClick={() => applyStatusFilter("PENDING")}
          >
            {stats.pending} pending
          </button>
        </div>

        <div style={searchHeaderRow}>
          <div style={{ fontWeight: 900 }}>Invites ({stats.total} total)</div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {hasActiveSearch ? (
              <button
                type="button"
                style={btnGhostSolid}
                onClick={clearSearch}
                disabled={loading}
              >
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
          <div style={{ padding: 10, color: "#475569", fontWeight: 800 }}>
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 10, color: "#64748b", fontWeight: 800 }}>
            No invites match your filters.
          </div>
        ) : (
          <div style={resultsScrollArea}>
            <div style={{ display: "grid", gap: 10 }}>
              {filtered.map((r) => {
                const displayStatus = getDisplayStatus(r);
                const tone = statusTone(displayStatus);
const isPending = displayStatus === "PENDING";
const isExpired = displayStatus === "EXPIRED";
const canManage =
  displayStatus === "PENDING" ||
  displayStatus === "EXPIRED" ||
  displayStatus === "CANCELLED";
const busy = busyInviteId === r.id;

                return (
                  <div key={r.id} style={rowCard}>
                    <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 900,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {r.invitedEmail}
                        </div>

                        <div
                          style={{
                            ...statusPill,
                            background: tone.bg,
                            borderColor: tone.border,
                            color: tone.text,
                          }}
                        >
                          {displayStatus}
                        </div>
                      </div>

                      <div style={mutedLine}>
                        Parent:{" "}
                        <span style={{ fontWeight: 900 }}>
                          {r.parentEmail ?? "—"}
                        </span>
                      </div>

                      <div style={mutedLine}>
                        Sent: {fmtDate(r.createdAt)} • Updated:{" "}
                        {fmtDate(r.updatedAt)} • Expires:{" "}
                        {fmtDate(r.expiresAt)}
                      </div>
                    </div>

{canManage ? (
  <div style={rowActions}>
    <button
      type="button"
      style={btnGhostSolid}
      disabled={busy}
      onClick={() => openUpdateInvite(r)}
    >
      Edit
    </button>

    <button
      type="button"
      style={btnGhost}
      disabled={busy}
      onClick={() => resendInvite(r.id)}
    >
      {busy ? "Working…" : isExpired ? "Renew" : "Resend"}
    </button>

    <button
      type="button"
      style={dangerBtn}
      disabled={busy}
      onClick={() => cancelInvite(r.id)}
    >
      {isExpired ? "Remove" : "Cancel"}
    </button>
  </div>
) : displayStatus === "ACCEPTED" && r.playerProfileId ? (
  <div style={rowActions}>
    <button
      type="button"
      style={btnGhostSolid}
      onClick={() =>
        router.push(
          `/dashboard/team/roster/player/${encodeURIComponent(
            String(r.playerProfileId || "")
          )}/edit`
        )
      }
    >
      View Player
    </button>
  </div>
) : null}
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

const editBox: React.CSSProperties = {
  display: "grid",
  gap: 12,
  border: "1px solid #fde68a",
  borderRadius: 14,
  background: "#fffbeb",
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
  gap: 10,
  flexWrap: "wrap",
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

const statsRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  alignItems: "center",
};

const statPill: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  color: "#0f172a",
  borderRadius: 999,
  padding: "7px 11px",
  fontWeight: 900,
  fontSize: 12,
  cursor: "pointer",
};

const statPillActive: React.CSSProperties = {
  ...statPill,
  border: "1px solid #caa042",
  background: "#fffbeb",
  color: "#78350f",
};

const resultsScrollArea: React.CSSProperties = {
  maxHeight: 720,
  overflowY: "auto",
  paddingRight: 6,
};

const rowActions: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap",
  justifyContent: "flex-end",
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
  ...btnGold,
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