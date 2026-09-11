// app/admin/billing/dunning/PlayerBillingStatusButtons.tsx

"use client";

import React, { useState } from "react";

export default function PlayerBillingStatusButtons({
  playerProfileId,
  currentStatus,
}: {
  playerProfileId: string;
  currentStatus: string;
}) {
  const [busy, setBusy] = useState<"suspend" | "restore" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function post(endpoint: string, action: "suspend" | "restore") {
    setBusy(action);
    setMsg(null);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ playerProfileId }),
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        setMsg(json?.error || `${action} failed.`);
        return;
      }

      setMsg(action === "suspend" ? "Suspended." : "Restored.");
      window.location.reload();
    } catch (error: any) {
      setMsg(error?.message || `${action} failed.`);
    } finally {
      setBusy(null);
    }
  }

  const isSuspended = String(currentStatus || "").toLowerCase() === "suspended";

  return (
    <div style={{ display: "grid", gap: 6 }}>
      {isSuspended ? (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => post("/api/admin/billing/restore-player", "restore")}
          style={restoreButtonStyle}
        >
          {busy === "restore" ? "Restoring..." : "Restore"}
        </button>
      ) : (
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => post("/api/admin/billing/suspend-player", "suspend")}
          style={suspendButtonStyle}
        >
          {busy === "suspend" ? "Suspending..." : "Suspend"}
        </button>
      )}

      {msg ? (
        <div style={{ color: "#64748b", fontSize: 11, fontWeight: 800 }}>
          {msg}
        </div>
      ) : null}
    </div>
  );
}

const suspendButtonStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: "7px 10px",
  border: "1px solid #f97316",
  background: "#fff7ed",
  color: "#9a3412",
  fontWeight: 900,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const restoreButtonStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: "7px 10px",
  border: "1px solid #16a34a",
  background: "#dcfce7",
  color: "#166534",
  fontWeight: 900,
  cursor: "pointer",
  whiteSpace: "nowrap",
};