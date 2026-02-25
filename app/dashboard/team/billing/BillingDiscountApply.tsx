"use client";

import React, { useMemo, useState } from "react";

export default function BillingDiscountApply(props: {
  teamId: string;
  planTier: string;
  cadence: string;
  current?: { type: string; value: number } | null;
}) {
  const [type, setType] = useState("PERCENT");
  const [value, setValue] = useState<number>(10);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const currentLabel = useMemo(() => {
    if (!props.current) return "None";
    return `${props.current.type} ${props.current.value}`;
  }, [props.current]);

  async function apply() {
    setMsg(null);
    setBusy(true);
    try {
      const res = await fetch("/api/team/billing/discount/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          teamId: props.teamId,
          type,
          value,
          cadence: props.cadence,
          planTier: props.planTier,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) return setMsg(json?.error || "Apply failed");
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
      const res = await fetch("/api/team/billing/discount/remove", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ teamId: props.teamId }),
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
      <div style={{ fontWeight: 900, marginBottom: 10 }}>Discount (Team)</div>

      <div style={{ color: "#64748b", fontWeight: 700, marginBottom: 10 }}>
        Current: <span style={{ color: "#0f172a" }}>{currentLabel}</span>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>Type</span>
          <select value={type} onChange={(e) => setType(e.target.value)} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db", minWidth: 180 }}>
            <option value="PERCENT">PERCENT</option>
            <option value="FIXED">FIXED</option>
            <option value="FREE_TRIAL">FREE_TRIAL</option>
            <option value="OVERRIDE_PRICE">OVERRIDE_PRICE</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>Value</span>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db", width: 160 }}
          />
        </label>

        <button
          onClick={apply}
          disabled={busy}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #0f172a",
            background: busy ? "#0f172a80" : "#0f172a",
            color: "#fff",
            fontWeight: 900,
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          {busy ? "Applying…" : "Apply Discount"}
        </button>

        <button
          onClick={remove}
          disabled={busy}
          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db", background: "#fff", color: "#0f172a", fontWeight: 900 }}
        >
          Remove
        </button>

        {msg ? <span style={{ color: "#b91c1c", fontWeight: 700 }}>{msg}</span> : null}
      </div>
    </div>
  );
}
