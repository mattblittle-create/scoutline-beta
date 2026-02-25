// app/dashboard/team/billing/DevTeamSelector.tsx

"use client";

import React, { useState } from "react";

const GOLD = "#caa042";
const NAVY = "#0f172a";

export default function DevTeamSelector() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSave() {
    setMsg(null);
    const e = email.trim().toLowerCase();
    if (!e) return setMsg("Enter an email.");

    setBusy(true);
    try {
      const res = await fetch("/api/team/dev/ensure", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: e }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok || !json?.teamId) {
        setMsg(json?.error || "Could not create/load team.");
        return;
      }

      document.cookie = `scoutline_dev_teamId=${encodeURIComponent(json.teamId)}; path=/; max-age=${60 * 60 * 24 * 30}`;
      window.location.reload();
    } catch (err: any) {
      setMsg(err?.message || "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12, background: "#fff", marginBottom: 12 }}>
      <div style={{ fontWeight: 800, marginBottom: 6 }}>Dev Team Loader</div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Team admin email (dev)"
          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db", minWidth: 280 }}
        />
        <button
          onClick={onSave}
          disabled={busy}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: `1px solid ${GOLD}`,
            background: busy ? `${GOLD}80` : GOLD,
            color: NAVY,
            fontWeight: 900,
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          {busy ? "Saving…" : "Create / Load Team"}
        </button>
        {msg ? <span style={{ color: "#b91c1c", fontWeight: 700 }}>{msg}</span> : null}
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
        Stores a dev teamId cookie so Profile/Roster/Invites/Billing can run live.
      </div>
    </div>
  );
}
