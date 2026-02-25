// app/admin/players/[profileId]/AdminPublicControls.tsx

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

type Visibility = "PUBLIC" | "PRIVATE" | "TEAM_ONLY" | "VERIFIED_ONLY";

export default function AdminPublicControls({
  profileId,
  publicEnabled,
  publicVisibility,
}: {
  profileId: string;
  publicEnabled: boolean;
  publicVisibility: Visibility;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function toggleEnabled() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/player-profiles/${encodeURIComponent(profileId)}/toggle-public-enabled`,
        { method: "POST" }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) throw new Error(json?.error || `Failed (${res.status})`);
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "Failed.");
    } finally {
      setBusy(false);
    }
  }

  async function setVisibility(v: Visibility) {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/player-profiles/${encodeURIComponent(profileId)}/set-visibility`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visibility: v }),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) throw new Error(json?.error || `Failed (${res.status})`);
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "Failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={card}>
      <div style={{ fontWeight: 900, fontSize: 14 }}>Public Controls</div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
        <button type="button" style={publicEnabled ? btnGold : btnGhost} onClick={toggleEnabled} disabled={busy}>
          {busy ? "Working…" : publicEnabled ? "Public Enabled ✅" : "Public Disabled"}
        </button>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ fontWeight: 900, fontSize: 12, color: "#475569" }}>Visibility:</div>
          <select
            value={publicVisibility}
            onChange={(e) => setVisibility(e.target.value as Visibility)}
            disabled={busy}
            style={select}
          >
            <option value="PUBLIC">PUBLIC</option>
            <option value="PRIVATE">PRIVATE</option>
            <option value="TEAM_ONLY">TEAM_ONLY</option>
            <option value="VERIFIED_ONLY">VERIFIED_ONLY</option>
          </select>
        </div>
      </div>

      {err ? <div style={errorBox}>{err}</div> : null}
      <div style={{ marginTop: 8, fontSize: 11, color: "#64748b", fontWeight: 800 }}>
        Changes are logged in Admin Audit Log.
      </div>
    </section>
  );
}

const card: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,0.10)",
  borderRadius: 12,
  padding: 14,
  background: "#fff",
};

const btnGhost: React.CSSProperties = {
  padding: "9px 12px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 900,
  cursor: "pointer",
};

const btnGold: React.CSSProperties = {
  padding: "9px 12px",
  borderRadius: 10,
  border: "1px solid #caa042",
  background: "#caa042",
  color: "#0f172a",
  fontWeight: 900,
  cursor: "pointer",
};

const select: React.CSSProperties = {
  padding: "9px 10px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  fontWeight: 900,
  cursor: "pointer",
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
