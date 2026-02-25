// app/dashboard/team/billing/BillingDiscountCodeRedeem.tsx

"use client";

import React, { useMemo, useState } from "react";

const GOLD = "#caa042";
const NAVY = "#0f172a";

export default function BillingDiscountCodeRedeem(props: {
  targetType: "TEAM" | "PLAYER";
  targetId: string;
  planTier: string;
  cadence: string;
  current?: { code: string; type: string; value: number; endsAt?: string | null } | null;
}) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const currentLabel = useMemo(() => {
    if (!props.current) return "None";
    const ends = props.current.endsAt ? ` • ends ${new Date(props.current.endsAt).toLocaleDateString()}` : "";
    return `${props.current.code} (${props.current.type} ${props.current.value})${ends}`;
  }, [props.current]);

  async function redeem() {
    setMsg(null);
    const c = code.trim().toUpperCase();
    if (!c) return setMsg("Enter a code.");

    setBusy(true);
    try {
      const res = await fetch("/api/discount/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code: c,
          targetType: props.targetType,
          targetId: props.targetId,
          planTier: props.planTier,
          cadence: props.cadence,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) return setMsg(json?.error || "Redeem failed");
      window.location.reload();
    } catch (err: any) {
      setMsg(err?.message || "Request failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setMsg(null);
    setBusy(true);
    try {
      const res = await fetch("/api/discount/remove", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetType: props.targetType, targetId: props.targetId }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) return setMsg(json?.error || "Remove failed");
      window.location.reload();
    } catch (err: any) {
      setMsg(err?.message || "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "#fff" }}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>Discount Code</div>

      <div style={{ color: "#64748b", fontWeight: 700, marginBottom: 10 }}>
        Current: <span style={{ color: NAVY }}>{currentLabel}</span>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
                <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>Redeem code</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Enter code (e.g., BATT26)"
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db", width: 260 }}
            disabled={busy}
          />
        </label>

        <button
          onClick={redeem}
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
          {busy ? "Applying…" : "Apply Code"}
        </button>

        <button
          onClick={remove}
          disabled={busy || !props.current?.code}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #d1d5db",
            background: "#fff",
            color: NAVY,
            fontWeight: 900,
            cursor: busy || !props.current?.code ? "not-allowed" : "pointer",
            opacity: busy || !props.current?.code ? 0.6 : 1,
          }}
        >
          Remove
        </button>

        {msg ? <span style={{ color: "#b91c1c", fontWeight: 700 }}>{msg}</span> : null}
      </div>

      <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>
        Codes are created by ScoutLine Admin. This page only redeems an existing code.
      </div>
    </div>
  );
}
