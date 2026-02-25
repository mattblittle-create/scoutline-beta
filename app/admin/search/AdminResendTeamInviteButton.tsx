// app/admin/search/AdminResendTeamInviteButton.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

export default function AdminResendTeamInviteButton({
  inviteId,
  invitedEmail,
}: {
  inviteId: string;
  invitedEmail: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  async function run() {
    setErr(null);
    setMsg(null);

    const ok = window.confirm(`Resend invite to:\n${invitedEmail}\n\nThis will extend the expiry and log an audit event.`);
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/admin/team-invites/${encodeURIComponent(inviteId)}/resend`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) throw new Error(json?.error || `Failed (${res.status})`);

      setMsg("Resent (queued).");
      window.setTimeout(() => setMsg(null), 1200);
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "Failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <button type="button" onClick={run} disabled={busy} style={btnMini}>
        {busy ? "Working…" : "Resend invite"}
      </button>
      {msg ? <div style={{ fontSize: 11, color: "#047857", fontWeight: 900 }}>{msg}</div> : null}
      {err ? <div style={{ fontSize: 11, color: "#7f1d1d", fontWeight: 900 }}>{err}</div> : null}
    </div>
  );
}

const btnMini: React.CSSProperties = {
  padding: "7px 10px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 900,
  cursor: "pointer",
  fontSize: 11,
  whiteSpace: "nowrap",
};
