// app/admin/billing/dunning/RetryInvoiceButton.tsx

"use client";

import React, { useState } from "react";

export default function RetryInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function retryInvoice() {
    setBusy(true);
    setMsg(null);

    try {
      const res = await fetch("/api/admin/billing/retry-invoice", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        setMsg(json?.error || "Retry failed.");
        return;
      }

      setMsg(json?.skipped ? "Retry skipped — charges disabled." : "Retry successful.");
      window.location.reload();
    } catch (error: any) {
      setMsg(error?.message || "Retry failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <button
        type="button"
        onClick={retryInvoice}
        disabled={busy}
        style={{
          borderRadius: 999,
          padding: "7px 10px",
          border: "1px solid #0ea5e9",
          background: busy ? "#bae6fd" : "#0ea5e9",
          color: "#fff",
          fontWeight: 900,
          cursor: busy ? "not-allowed" : "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {busy ? "Retrying..." : "Retry Now"}
      </button>

      {msg ? (
        <div style={{ color: "#64748b", fontSize: 11, fontWeight: 800 }}>
          {msg}
        </div>
      ) : null}
    </div>
  );
}