// app/components/billing/CancelAccountControl.tsx
"use client";

import React, { useState } from "react";

const NAVY = "#0f172a";
const BLUE = "#0ea5e9";

type Props = {
  kind: "PLAYER" | "TEAM";
  targetId: string;

  // Optional overrides for label + styles
  buttonText?: string;
  buttonStyle?: React.CSSProperties;

  // Optional: if you want to hide this button when already canceled
  disabled?: boolean;
};

export default function CancelAccountControl(props: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const endpoint =
    props.kind === "TEAM" ? "/api/team/billing/cancel" : "/api/player/billing/cancel";

  const payload =
    props.kind === "TEAM" ? { teamId: props.targetId } : { playerProfileId: props.targetId };

  const title =
    props.kind === "TEAM" ? "Cancel ScoutLine Teams Account" : "Cancel ScoutLine Account";

  const bodyText =
    props.kind === "TEAM"
      ? `In order to cancel your ScoutLine Teams account, click the Confirm button below. If you do not want to cancel your account, click the Never Mind button below. Cancelling your account will stop future renewals. Your Teams account will remain active through the end of the current paid billing period. ScoutLine does not issue prorated refunds for partial billing periods. At that time, log-in access to ScoutLine will be removed and you will no longer be able to access or edit the player profile(s) or send teaser card(s) to coaches. If you need to remove player(s) from the roster in order to update monthly billing per player, do this from your Team Roster section.`
      : `In order to cancel your ScoutLine account, click the Confirm button below. If you do not want to cancel your account, click the Never Mind button below. Cancelling your account will stop future renewals. Your account will remain active through the end of the current paid billing period. ScoutLine does not issue prorated refunds for partial billing periods. At that time, log-in access to ScoutLine will be removed and you will no longer be able to access or edit the player profile or send the teaser card to coaches. If you still want to have access to your player profile without being charged monthly, you can change the Plan Tier to Redshirt — FREE. Note that updating the Plan Tier may result in less functionality on the profile compared to your current plan.`;

  async function confirm() {
    setMsg(null);
    setBusy(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json?.ok) {
        setMsg(json?.error || "Cancel failed.");
        return;
      }

      const eff = json?.effectiveAt ? new Date(json.effectiveAt).toLocaleDateString("en-US") : null;

      if (json?.message) {
        setMsg(eff ? `${json.message} (Active until ${eff}.)` : String(json.message));
      } else {
        setMsg(
          eff
            ? `You have confirmed cancellation. Your account will remain active until ${eff}.`
            : "You have confirmed cancellation. Your account will remain active until the end of your current billing period."
        );
      }

      // Refresh so the scheduled cancellation banner/status updates
      window.location.reload();
    } catch (e: any) {
      setMsg(e?.message || "Request failed");
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={props.disabled || busy}
        style={{
          padding: "10px 12px",
          borderRadius: 10,
          border: `1px solid ${BLUE}`,
          background: BLUE,
          color: NAVY,
          fontWeight: 900,
          cursor: props.disabled || busy ? "not-allowed" : "pointer",
          opacity: props.disabled || busy ? 0.7 : 1,
          ...props.buttonStyle,
        }}
      >
        {props.buttonText || "Cancel Account"}
      </button>

      {open ? (
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
          <div
            style={{
              width: "min(720px, 100%)",
              background: "#fff",
              borderRadius: 14,
              border: "1px solid #e5e7eb",
              padding: 16,
            }}
          >
            <div style={{ fontWeight: 950, color: NAVY, fontSize: 16 }}>{title}</div>

            <div style={{ marginTop: 10, color: "#334155", lineHeight: 1.5 }}>{bodyText}</div>

            {msg ? <div style={{ marginTop: 10, color: "#15803d", fontWeight: 800 }}>{msg}</div> : null}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  color: NAVY,
                  fontWeight: 900,
                  cursor: busy ? "not-allowed" : "pointer",
                }}
              >
                Never Mind
              </button>

              <button
                type="button"
                onClick={confirm}
                disabled={busy}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `1px solid ${BLUE}`,
                  background: busy ? `${BLUE}80` : BLUE,
                  color: NAVY,
                  fontWeight: 900,
                  cursor: busy ? "not-allowed" : "pointer",
                }}
              >
                {busy ? "Cancelling…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
