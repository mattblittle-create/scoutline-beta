// app/dashboard/player/profile/billing/PlayerBillingPaymentMethod.tsx

"use client";

import React, { useState } from "react";
import BillingDisclosure from "@/app/components/billing/BillingDisclosure";
import CancelAccountControl from "@/app/components/billing/CancelAccountControl";

const GOLD = "#caa042";
const NAVY = "#0f172a";

export default function PlayerBillingPaymentMethod(props: {
  playerProfileId: string;
  summary: { paymentType: string | null; brand: string | null; last4: string | null } | null;
}) {
  const [busy, setBusy] = useState(false);

  const label =
    props.summary?.last4
      ? `${props.summary.paymentType || "card"} • ${props.summary.brand || ""} • **** ${props.summary.last4}`.replace(
          /\s+/g,
          " "
        )
      : "No payment method on file";

  async function onGoToValor() {
    setBusy(true);
    try {
      window.open("https://example.com/valor-hosted-payment-method", "_blank", "noopener,noreferrer");
    } finally {
      setBusy(false);
    }
  }

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
            type="button"
            onClick={onGoToValor}
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
        </div>

        <CancelAccountControl kind="PLAYER" targetId={props.playerProfileId} />
      </div>

      <BillingDisclosure />
    </div>
  );
}
