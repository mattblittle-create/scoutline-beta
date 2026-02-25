// app/admin/billing/invoices/MarkPaidButton.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function MarkPaidButton(props: {
  type: "PLAYER" | "TEAM";
  invoiceId: string;
  amountCents?: number;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (busy) return;
    setBusy(true);
    try {
      const payload: any = { type: props.type, invoiceId: props.invoiceId };

      // For PLAYER invoices we can optionally set amountPaidCents
      if (props.type === "PLAYER" && Number.isFinite(Number(props.amountCents))) {
        payload.amountPaidCents = Number(props.amountCents);
      }

      const res = await fetch("/api/admin/billing/invoices/mark-paid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const j = await res.json().catch(() => null);

      if (!res.ok || !j?.ok) {
        alert(j?.error || "Failed to mark paid.");
        return;
      }

      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={props.disabled || busy}
      style={{
        padding: "6px 10px",
        borderRadius: 8,
        border: "1px solid rgba(34,197,94,0.55)",
        background: busy ? "rgba(34,197,94,0.08)" : "#fff",
        fontSize: 11,
        fontWeight: 900,
        color: "#166534",
        whiteSpace: "nowrap",
        cursor: props.disabled || busy ? "not-allowed" : "pointer",
      }}
      title="DEV: mark this invoice PAID"
    >
      {busy ? "Marking…" : "Mark Paid (dev)"}
    </button>
  );
}
