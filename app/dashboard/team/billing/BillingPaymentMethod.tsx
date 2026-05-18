// app/dashboard/team/billing/BillingPaymentMethod.tsx

"use client";

import React, { useState } from "react";
import BillingDisclosure from "@/app/components/billing/BillingDisclosure";
import CancelAccountControl from "@/app/components/billing/CancelAccountControl";

const GOLD = "#caa042";
const NAVY = "#0f172a";

export default function BillingPaymentMethod(props: {
  teamId: string;
  summary: { paymentType?: string | null; brand?: string | null; last4?: string | null } | null;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function goToPortal() {
    setMsg(null);
    setBusy(true);
    try {
      const res = await fetch("/api/team/billing/payment-portal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          teamId: props.teamId,
          returnTo: "team-dashboard",
        }),
      });

      const json = await res.json();
      if (!res.ok || !json?.ok || !json?.url) {
        setMsg(json?.error || "Could not open payment portal.");
        return;
      }

      window.location.href = json.url;
    } catch (err: any) {
      setMsg(err?.message || "Request failed");
    } finally {
      setBusy(false);
    }
  }

  const label =
    props.summary?.last4
      ? `${props.summary.paymentType || "payment"} • ${props.summary.brand || ""} • **** ${
          props.summary.last4
        }`.replace(/\s+•\s+•/g, " •")
      : "No billing method on file";

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "#fff" }}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>Billing Method</div>

      <div style={{ color: NAVY, marginBottom: 10 }}>{label}</div>

      {/* Inline actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={goToPortal}
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
            {busy ? "Opening…" : "Add / Update Payment Info"}
          </button>

          {msg ? <span style={{ color: "#b91c1c", fontWeight: 700 }}>{msg}</span> : null}
        </div>

        <CancelAccountControl kind="TEAM" targetId={props.teamId} />
      </div>

      <BillingDisclosure />
    </div>
  );
}
