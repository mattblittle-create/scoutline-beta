// app/admin/billing/dunning/SendPaymentUpdateEmailButton.tsx

"use client";

import React, { useState } from "react";

export default function SendPaymentUpdateEmailButton({
  invoiceId,
}: {
  invoiceId: string;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function sendEmail() {
    setBusy(true);
    setMsg(null);

    try {
      const res = await fetch("/api/admin/billing/send-payment-update-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        setMsg(json?.error || "Email failed.");
        return;
      }

      setMsg("Email sent.");
    } catch (error: any) {
      setMsg(error?.message || "Email failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <button
        type="button"
        onClick={sendEmail}
        disabled={busy}
        style={{
          borderRadius: 999,
          padding: "7px 10px",
          border: "1px solid #6366f1",
          background: busy ? "#c7d2fe" : "#eef2ff",
          color: "#3730a3",
          fontWeight: 900,
          cursor: busy ? "not-allowed" : "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {busy ? "Sending..." : "Send Email"}
      </button>

      {msg ? (
        <div style={{ color: "#64748b", fontSize: 11, fontWeight: 800 }}>
          {msg}
        </div>
      ) : null}
    </div>
  );
}