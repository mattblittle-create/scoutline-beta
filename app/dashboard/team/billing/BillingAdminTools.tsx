// app/dashboard/team/billing/BillingAdminTools.tsx

"use client";

import React, { useMemo, useState } from "react";

const GOLD = "#caa042";
const NAVY = "#0f172a";
const BLUE = "#0ea5e9";

export default function BillingAdminTools(props: {
  teamId: string;
  planTier: string;       // "TEAM"
  billingCadence: string; // "Monthly" (Teams only)
  billingStatus: string;  // Active | Trial | PastDue | Canceled
}) {
  const [planTier, setPlanTier] = useState(props.planTier);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelMsg, setCancelMsg] = useState<string | null>(null);

  const cadenceOptions = useMemo(() => ["Monthly"], []);
  const statusOptions = useMemo(() => ["Active", "Trial", "PastDue", "Canceled"], []);

  async function save() {
    setMsg(null);
    setBusy(true);
    try {
      const res = await fetch("/api/team/billing/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          teamId: props.teamId,
          planTier,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json?.ok) {
        setMsg(json?.error || "Save failed");
        return;
      }

      window.location.reload();
    } catch (err: any) {
      setMsg(err?.message || "Request failed");
    } finally {
      setBusy(false);
    }
  }

  async function confirmCancel() {
    setCancelMsg(null);
    setCancelBusy(true);
    try {
      const res = await fetch("/api/team/billing/cancel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ teamId: props.teamId }),
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
      ? `You have confirmed cancellation. Your Teams account will remain active until ${eff}.`
      : "You have confirmed cancellation. Your Teams account will remain active until the end of your current billing period."
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
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>Plan Tier</span>
          <select
            value={planTier}
            onChange={(e) => setPlanTier(e.target.value)}
            style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db" }}
          >
            <option value="TEAM">TEAM</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>Billing Cadence</span>
          <select
            value={props.billingCadence || "Monthly"}
            disabled
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #d1d5db",
              background: "#f8fafc",
              color: NAVY,
              fontWeight: 400,
              cursor: "not-allowed",
            }}
          >
            {cadenceOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>Status</span>
          <select
            value={props.billingStatus}
            disabled
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #d1d5db",
              background: "#f8fafc",
              color: NAVY,
              fontWeight: 400,
              cursor: "not-allowed",
            }}
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Bottom actions: Save left, Cancel right */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginTop: 12 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={save}
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

          {msg ? <span style={{ color: "#b91c1c", fontWeight: 700 }}>{msg}</span> : null}
        </div>
      </div>

      <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>
        Status is system-controlled. Teams cadence is Monthly only.
      </div>

      {/* Modal */}
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
            <div style={{ fontWeight: 950, color: NAVY, fontSize: 16 }}>Cancel ScoutLine Teams Account</div>

            <div style={{ marginTop: 10, color: "#334155", lineHeight: 1.5 }}>
              In order to cancel your ScoutLine Teams account, click the <b>Confirm</b> button below. If you do not want
              to cancel your account, click the <b>Never Mind</b> button below. Cancelling your account will stop future
              billing and your Teams account will remain active until the end of your current billing period. At that
              time, log-in access to ScoutLine will be removed and you will no longer be able to access or edit the
              player profile(s) or send teaser card(s) to coaches. If you need to remove player(s) from the roster in
              order to update monthly billing per player, do this from your Team Roster section.
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
