// app/dashboard/parent/player/[playerProfileId]/billing/ParentBillingActions.tsx

"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = {
  playerProfileId: string;
  cancelRequested: boolean;
  cancelEffectiveAt?: string | null;
};

type BusyAction = "cancel" | null;

export default function ParentBillingActions({
  playerProfileId,
  cancelRequested,
  cancelEffectiveAt,
}: Props) {
  const router = useRouter();

  const [busy, setBusy] = React.useState<BusyAction>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  async function requestCancellation() {
    const confirmed = window.confirm(
      "Submit a cancellation request for this player account?"
    );

    if (!confirmed) return;

    setBusy("cancel");
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(
        `/api/parent/player/${encodeURIComponent(
          playerProfileId
        )}/billing/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Unable to request cancellation.");
      }

      const effectiveAt = json?.effectiveAt
        ? new Date(String(json.effectiveAt)).toLocaleDateString()
        : null;

      setSuccess(
        effectiveAt
          ? `Cancellation requested. Effective date: ${effectiveAt}.`
          : "Cancellation requested successfully."
      );

      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 18,
        background: "#fff",
        padding: 18,
        boxShadow: "0 10px 24px rgba(15,23,42,0.05)",
        display: "grid",
        gap: 14,
      }}
    >
      <div
        style={{
          fontSize: "1.05rem",
          fontWeight: 900,
          color: "#0f172a",
        }}
      >
        Billing Actions
      </div>

      <div
        style={{
          color: "#475569",
          lineHeight: 1.55,
          fontWeight: 600,
        }}
      >
        Manage this player&apos;s billing using the main ScoutLine billing page.
        Payment submission, payment method updates, invoices, and billing status
        stay in one shared flow.
      </div>

      {cancelRequested ? (
        <div
          style={{
            padding: "10px 12px",
            border: "1px solid #fed7aa",
            background: "#fff7ed",
            color: "#9a3412",
            borderRadius: 12,
            fontWeight: 800,
          }}
        >
          Cancellation has already been requested
          {cancelEffectiveAt
            ? ` and is scheduled for ${new Date(
                cancelEffectiveAt
              ).toLocaleDateString()}.`
            : "."}
        </div>
      ) : null}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <Link
          href={`/dashboard/player/profile/billing?playerProfileId=${encodeURIComponent(
            playerProfileId
          )}`}
          style={{
            ...goldBtn,
            textDecoration: "none",
          }}
        >
          Manage Billing
        </Link>

        <button
          type="button"
          onClick={requestCancellation}
          disabled={busy !== null || cancelRequested}
          style={{
            ...dangerBtn,
            opacity: busy !== null || cancelRequested ? 0.6 : 1,
            cursor:
              busy !== null || cancelRequested ? "not-allowed" : "pointer",
          }}
        >
          {busy === "cancel" ? "Submitting…" : "Request Cancellation"}
        </button>
      </div>

      {error ? (
        <div
          style={{
            padding: "10px 12px",
            border: "1px solid #fecaca",
            background: "#fff1f2",
            color: "#7f1d1d",
            borderRadius: 12,
            fontWeight: 800,
          }}
        >
          {error}
        </div>
      ) : null}

      {success ? (
        <div
          style={{
            padding: "10px 12px",
            border: "1px solid #bbf7d0",
            background: "#f0fdf4",
            color: "#166534",
            borderRadius: 12,
            fontWeight: 800,
          }}
        >
          {success}
        </div>
      ) : null}
    </section>
  );
}

const goldBtn: React.CSSProperties = {
  display: "inline-block",
  padding: "11px 15px",
  borderRadius: 12,
  border: "1px solid #caa042",
  background: "#caa042",
  color: "#0f172a",
  fontWeight: 900,
  boxShadow: "0 8px 18px rgba(202,160,66,0.22)",
};

const dangerBtn: React.CSSProperties = {
  display: "inline-block",
  padding: "11px 15px",
  borderRadius: 12,
  border: "1px solid #fecaca",
  background: "#fff1f2",
  color: "#7f1d1d",
  fontWeight: 900,
};