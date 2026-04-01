// app/dashboard/player/profile/billing/PlayerBillingAdminTools.tsx

"use client";

import React, { useMemo, useState } from "react";

const GOLD = "#caa042";
const NAVY = "#0f172a";
const BLUE = "#0ea5e9";

type Props = {
  playerProfileId: string;
  currentPlan: string; // "REDSHIRT" | "WALK_ON" | "ALL_AMERICAN"
  currentCadence: "monthly" | "annual";
  derivedStatus: "Active" | "PastDue" | "Canceled" | "Trial" | string;
};

const PLAN_OPTIONS = [
  { value: "REDSHIRT", label: "Redshirt — FREE" },
  { value: "WALK_ON", label: "Walk-On — $24.95/mo ($265/yr)" },
  { value: "ALL_AMERICAN", label: "All-American — $49.95/mo ($510/yr)" },
] as const;

const CADENCE_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "annual", label: "Annually" },
] as const;

export default function PlayerBillingAdminTools(props: Props) {
  const [plan, setPlan] = useState(props.currentPlan);
  const [cadence, setCadence] = useState<"monthly" | "annual">(props.currentCadence);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelMsg, setCancelMsg] = useState<string | null>(null);

  const status = useMemo(() => props.derivedStatus, [props.derivedStatus]);

  async function onSave() {
    setMsg(null);
    setBusy(true);
    try {
      const res = await fetch("/api/player/billing/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          playerProfileId: props.playerProfileId,
          planTier: plan,
          billingCadence: cadence,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json?.ok) {
        setMsg(json?.error || "Save failed.");
        return;
      }

      setMsg("Saved!");
      window.location.reload();
    } catch (e: any) {
      setMsg(e?.message || "Request failed");
    } finally {
      setBusy(false);
    }
  }

  async function confirmCancel() {
    setCancelMsg(null);
    setCancelBusy(true);
    try {
      const res = await fetch("/api/player/billing/cancel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ playerProfileId: props.playerProfileId }),
      });

      const json = await res.json();
      if (!res.ok || !json?.ok) {
        setCancelMsg(json?.error || "Cancel failed.");
        return;
      }

      const eff = json?.effectiveAt ? new Date(json.effectiveAt).toLocaleDateString("en-US") : null;

      if (json?.message) {
        setCancelMsg(eff ? `${json.message} (Active until ${eff}.)` : json.message);
      } else {
        setCancelMsg(
          eff
            ? `You have confirmed cancellation. Your account will remain active until ${eff}.`
            : "You have confirmed cancellation. Your account will remain active until the end of your current billing period."
        );
      }

      window.location.reload();
    } catch (e: any) {
      setCancelMsg(e?.message || "Request failed");
    } finally {
      setCancelBusy(false);
      setCancelOpen(false);
    }
  }

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "#fff", position: "relative" }}>
      <div style={{ fontWeight: 900, marginBottom: 10 }}>Billing Admin Tools (Dev)</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <div style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 12 }}>
          <div style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>Plan Tier</div>
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            style={{
              marginTop: 6,
              width: "100%",
              height: 40,
              borderRadius: 10,
              border: "1px solid #d1d5db",
              padding: "0 10px",
              color: NAVY,
              fontWeight: 800,
              background: "#fff",
            }}
          >
            {PLAN_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label} {o.value === props.currentPlan ? " ✓" : ""}
              </option>
            ))}
          </select>
        </div>

        <div style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 12 }}>
          <div style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>Billing Cadence</div>
          <select
            value={cadence}
            onChange={(e) => setCadence(e.target.value as any)}
            style={{
              marginTop: 6,
              width: "100%",
              height: 40,
              borderRadius: 10,
              border: "1px solid #d1d5db",
              padding: "0 10px",
              color: NAVY,
              fontWeight: 800,
              background: "#fff",
            }}
          >
            {CADENCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label} {o.value === props.currentCadence ? " ✓" : ""}
              </option>
            ))}
          </select>
        </div>

        <div style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 12 }}>
          <div style={{ color: "#64748b", fontSize: 12, fontWeight: 800 }}>Status</div>
          <select
            value={String(status)}
            disabled
            style={{
              marginTop: 6,
              width: "100%",
              height: 40,
              borderRadius: 10,
              border: "1px solid #d1d5db",
              padding: "0 10px",
              color: NAVY,
              fontWeight: 800,
              background: "#f8fafc",
              cursor: "not-allowed",
            }}
          >
            <option value={String(status)}>{String(status)}</option>
          </select>
          <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
            Status is derived from billing/invoices (not user-selectable).
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginTop: 12 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            type="button"
            onClick={onSave}
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
            {busy ? "Saving…" : "Save Plan"}
          </button>

          {msg ? <span style={{ color: msg === "Saved!" ? "#15803d" : "#b91c1c", fontWeight: 800 }}>{msg}</span> : null}
        </div>

        <button
          type="button"
          onClick={() => setCancelOpen(true)}
          disabled={busy || cancelBusy}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: `1px solid ${BLUE}`,
            background: BLUE,
            color: NAVY,
            fontWeight: 900,
            cursor: busy || cancelBusy ? "not-allowed" : "pointer",
            opacity: busy || cancelBusy ? 0.7 : 1,
          }}
        >
          Cancel Account
        </button>
      </div>

      {cancelOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 9999,
          }}
        >
          <div style={{ width: "min(720px, 100%)", background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", padding: 16 }}>
            <div style={{ fontWeight: 950, color: NAVY, fontSize: 16 }}>Cancel ScoutLine Account</div>

            <div style={{ marginTop: 10, color: "#334155", lineHeight: 1.5 }}>
              In order to cancel your ScoutLine account, click the <b>Confirm</b> button below. If you do not want to cancel your account,
              click the <b>Never Mind</b> button below. Cancelling your account will stop future billing and your account will remain active until
              the end of your current billing period. At that time, log-in access to ScoutLine will be removed and you will no longer be able to access
              or edit the player profile or send the teaser card to coaches. If you still want to have access without being charged monthly, you can change
              the Plan Tier to <b>Redshirt — FREE</b>. Note that updating the Plan Tier may result in less functionality compared to your current plan.
            </div>

            {cancelMsg ? <div style={{ marginTop: 10, color: "#15803d", fontWeight: 800 }}>{cancelMsg}</div> : null}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
              <button
                type="button"
                onClick={() => setCancelOpen(false)}
                disabled={cancelBusy}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  color: NAVY,
                  fontWeight: 900,
                  cursor: cancelBusy ? "not-allowed" : "pointer",
                }}
              >
                Never Mind
              </button>

              <button
                type="button"
                onClick={confirmCancel}
                disabled={cancelBusy}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `1px solid ${BLUE}`,
                  background: cancelBusy ? `${BLUE}80` : BLUE,
                  color: NAVY,
                  fontWeight: 900,
                  cursor: cancelBusy ? "not-allowed" : "pointer",
                }}
              >
                {cancelBusy ? "Cancelling…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
