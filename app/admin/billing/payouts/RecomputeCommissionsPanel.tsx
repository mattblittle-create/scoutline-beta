// app/admin/billing/payouts/RecomputeCommissionsPanel.tsx

"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type RecomputeResponse =
  | {
      ok: true;
      dryRun: boolean;
      eligibilityDelayDays: number;
      stats: Record<string, number>;
      touched: Array<{ referralId: string; commissionEventId?: string; action: string; note?: string }>;
      note?: string;
    }
  | {
      ok: false;
      error: string;
    };

export default function RecomputeCommissionsPanel() {
  const router = useRouter();

  const [dryRun, setDryRun] = useState(true);
  const [refundWindowDays, setRefundWindowDays] = useState<number>(30);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [last, setLast] = useState<RecomputeResponse | null>(null);

  const statsLine = useMemo(() => {
    if (!last || !("ok" in last) || !last.ok) return "";
    const s = last.stats || {};
    return `Seen ${s.referralsSeen ?? 0} • Created ${s.created ?? 0} • Updated ${s.updated ?? 0} • Errors ${s.errors ?? 0}`;
  }, [last]);

  async function run() {
    setBusy(true);
    setMsg("");
    setLast(null);

    try {
      const res = await fetch("/api/admin/billing/commissions/recompute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // ✅ force cookies/session to be sent
        credentials: "include",
        cache: "no-store",
        body: JSON.stringify({
          dryRun,
          refundWindowDays,
        }),
      });

      const data = (await res.json().catch(() => null)) as RecomputeResponse | null;

      if (!res.ok) {
        const err = (data && "ok" in data && data.ok === false && data.error) ? data.error : `HTTP ${res.status}`;
        setLast(data ?? { ok: false, error: err });
        setMsg(`Recompute failed (${res.status}) • ${err}`);
        return;
      }

      if (!data) {
        setLast({ ok: false, error: "Empty response" });
        setMsg("Recompute failed • empty response");
        return;
      }

      setLast(data);
      if ("ok" in data && data.ok) {
        setMsg(
          `Recompute OK • ${data.dryRun ? "Dry run" : "Applied"} • Eligibility delay: ${data.eligibilityDelayDays} days`
        );

        // If we actually applied changes, refresh the server page tables.
        if (!data.dryRun) {
          router.refresh();
        }
      } else {
        setMsg(`Recompute failed • ${(data as any)?.error || "Unknown error"}`);
      }
    } catch (e: any) {
      setLast({ ok: false, error: e?.message || "Unknown error" });
      setMsg(`Recompute failed • ${e?.message || "Unknown error"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <label style={label}>
          <input
            type="checkbox"
            checked={dryRun}
            onChange={(e) => setDryRun(e.target.checked)}
            style={{ marginRight: 8 }}
          />
          Dry run
        </label>

        <label style={label}>
          Refund window (days):
          <input
            type="number"
            value={refundWindowDays}
            min={0}
            step={1}
            onChange={(e) => setRefundWindowDays(Number(e.target.value || 0))}
            style={input}
          />
        </label>

        <button onClick={run} disabled={busy} style={btn}>
          {busy ? "Running…" : "Recompute"}
        </button>

        {msg ? <span style={{ opacity: 0.85 }}>{msg}</span> : null}
      </div>

      {statsLine ? <div style={{ opacity: 0.8 }}>{statsLine}</div> : null}

      {last && "ok" in last && last.ok ? (
        <details style={details}>
          <summary style={{ cursor: "pointer", fontWeight: 900 }}>Details</summary>
          <pre style={pre}>{JSON.stringify(last, null, 2)}</pre>
        </details>
      ) : last && "ok" in last && !last.ok ? (
        <div style={{ color: "#b91c1c", fontWeight: 800 }}>Error: {last.error}</div>
      ) : null}
    </div>
  );
}

const label: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontWeight: 800,
};

const input: React.CSSProperties = {
  marginLeft: 8,
  width: 90,
  padding: "6px 8px",
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.15)",
  fontSize: 11,
};

const btn: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.15)",
  background: "#0f172a",
  color: "#fff",
  fontWeight: 900,
  fontSize: 11,
  cursor: "pointer",
};

const details: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,0.10)",
  borderRadius: 12,
  padding: 10,
  background: "rgba(2,6,23,0.02)",
};

const pre: React.CSSProperties = {
  margin: 0,
  marginTop: 10,
  padding: 10,
  borderRadius: 10,
  background: "#0b1020",
  color: "#e5e7eb",
  overflowX: "auto",
  fontSize: 11,
};