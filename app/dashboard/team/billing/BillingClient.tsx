// app/dashboard/team/billing/BillingClient.tsx
"use client";

import React, { useEffect, useState } from "react";

function formatUSD(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

type Snapshot = {
  orgName: string;
  planName: string;
  cadence: "Monthly" | "Annual";
  seatLabel: string;
  seatsUsed: number;
  basePriceCents: number;
  discount: null | {
    code: string;
    label: string;
    amountOffCents: number;
    activeUntilLabel?: string;
  };
  totalCents: number;
};

export default function BillingClient(props: {
  teamId: string;
  orgName: string;
  seatsUsed: number;
  planTier: string; // "Teams"
  cadence: "Monthly" | "Annual";
  sponsored?: boolean; // Step 2: still purely UI toggle
}) {
  const { teamId, orgName, seatsUsed, planTier, cadence, sponsored } = props;

  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const cadenceLabel = cadence === "Monthly" ? "Per Month" : "Per Year";

  async function loadSnapshot() {
    const qs = new URLSearchParams({
      teamId,
      planTier,
      cadence,
      orgName,
      seatsUsed: String(seatsUsed),
    });
    const res = await fetch(`/api/billing/team/snapshot?${qs.toString()}`, { cache: "no-store" });
    const json = await res.json();
    if (res.ok && json?.ok) setSnap(json.snapshot);
  }

  useEffect(() => {
    loadSnapshot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, planTier, cadence, orgName, seatsUsed]);

  const hasDiscount = !!snap?.discount;

  async function applyCode(e: React.FormEvent) {
    e.preventDefault();
    if (sponsored) return;

    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setMsg({ type: "err", text: "Enter a discount code." });
      return;
    }

    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/billing/discount/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: trimmed,
          targetType: "TEAM",
          targetId: teamId,
          planTier,
          cadence,
          metadata: { source: "team-billing-ui" },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        setMsg({ type: "err", text: json?.error || "Unable to apply code." });
        setBusy(false);
        return;
      }

      setMsg({ type: "ok", text: `Applied ${json.application.code}.` });
      setCode("");
      await loadSnapshot();
    } catch {
      setMsg({ type: "err", text: "Server error applying code." });
    } finally {
      setBusy(false);
    }
  }

  if (!snap) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-sm text-slate-600">Loading billing…</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-slate-500">Organization</div>
          <div className="text-lg font-semibold text-slate-900">{snap.orgName}</div>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
          {snap.planName} Plan
        </span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs text-slate-500">Billing cadence</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">
            {snap.cadence === "Monthly" ? "Monthly" : "Annual"}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs text-slate-500">{snap.seatLabel}</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">{snap.seatsUsed} active</div>
          <div className="mt-1 text-xs text-slate-500">Seats are counted from your roster.</div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs text-slate-500">Current total</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">
            {formatUSD(snap.totalCents)}{" "}
            <span className="text-xs font-normal text-slate-500">{cadenceLabel}</span>
          </div>
          {hasDiscount ? (
            <div className="mt-1 text-xs text-slate-600">
              Discount applied: <span className="font-semibold">{snap.discount!.code}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Price breakdown */}
      <div className="mt-6 rounded-2xl border border-slate-200 p-5">
        <div className="mb-3 text-sm font-semibold text-slate-900">Price breakdown</div>

        <div className="flex items-center justify-between py-2 text-sm">
          <div className="text-slate-700">
            Base price <span className="text-slate-500">({snap.cadence})</span>
          </div>
          <div className="font-medium text-slate-900">{formatUSD(snap.basePriceCents)}</div>
        </div>

        {hasDiscount ? (
          <div className="flex items-center justify-between py-2 text-sm">
            <div className="text-slate-700">
              Discount <span className="text-slate-500">({snap.discount!.label})</span>
            </div>
            <div className="font-medium text-slate-900">-{formatUSD(snap.discount!.amountOffCents)}</div>
          </div>
        ) : null}

        <div className="my-2 h-px w-full bg-slate-200" />

        <div className="flex items-center justify-between py-2 text-sm">
          <div className="text-slate-900 font-semibold">Total</div>
          <div className="text-slate-900 font-semibold">
            {formatUSD(snap.totalCents)}{" "}
            <span className="text-xs font-normal text-slate-500">{cadenceLabel}</span>
          </div>
        </div>

        {hasDiscount && snap.discount?.activeUntilLabel ? (
          <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
            Discount active until <span className="font-semibold">{snap.discount.activeUntilLabel}</span>
          </div>
        ) : null}
      </div>

      {/* Promo code */}
      <div className="mt-6 rounded-2xl border border-slate-200 p-5">
        <div className="mb-2 text-sm font-semibold text-slate-900">Discount code</div>

        {sponsored ? (
          <div className="text-sm text-slate-600">
            Discount codes are not needed while your organization is sponsored.
          </div>
        ) : (
          <form onSubmit={applyCode} className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm outline-none focus:border-slate-900"
              placeholder="Enter code (e.g., HALFOFF3)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="off"
              disabled={busy}
            />
            <button
              type="submit"
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              disabled={busy}
            >
              {busy ? "Applying…" : "Apply"}
            </button>
          </form>
        )}

        {msg ? (
          <div
            className={`mt-3 rounded-xl border px-3 py-2 text-sm ${
              msg.type === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-rose-200 bg-rose-50 text-rose-900"
            }`}
          >
            {msg.text}
          </div>
        ) : null}

        {!sponsored ? (
          <div className="mt-2 text-xs text-slate-500">
            One active code at a time. Applying a new code replaces the old one.
          </div>
        ) : null}
      </div>

    </div>
  );
}
