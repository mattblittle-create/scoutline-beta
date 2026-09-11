// app/coach/invite/accept/page.tsx

"use client";

import React, { useEffect, useState } from "react";

export default function CoachInviteAcceptPage() {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState<string>("Accepting invite…");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const url = new URL(window.location.href);
        const token = String(url.searchParams.get("token") || "").trim();
        const email = String(url.searchParams.get("email") || "").trim().toLowerCase();

        if (!token || !email) {
          setStatus("error");
          setMessage("Missing token or email.");
          return;
        }

        // Call API accept (GET)
        const res = await fetch(
          `/api/coach/invites/accept?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`,
          { method: "GET", cache: "no-store", headers: { "Cache-Control": "no-store" } }
        );

        const json = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (!res.ok || !json?.ok) {
          setStatus("error");
          setMessage(json?.error || `Invite could not be accepted (${res.status}).`);
          return;
        }

        setStatus("ok");
        setMessage("Invite accepted! Redirecting you to login…");

        // Redirect to login with prefilled email and next step
const nextAfterLogin = `/onboarding/coach?email=${encodeURIComponent(email)}`;

const needsSetPassword = !!json?.data?.needsSetPassword;
const setPasswordToken = String(json?.data?.setPasswordToken || "");

window.setTimeout(() => {
  if (needsSetPassword && setPasswordToken) {
    // After setting password, send them to login, then onboarding
const loginNext = `/onboarding/coach?email=${encodeURIComponent(email)}`;
const loginUrl = `/login?email=${encodeURIComponent(email)}&next=${encodeURIComponent(loginNext)}`;

    window.location.href =
      `/set-password?token=${encodeURIComponent(setPasswordToken)}&next=${encodeURIComponent(loginUrl)}`;
    return;
  }

  // Existing users (already have a password)
  window.location.href = `/login?email=${encodeURIComponent(email)}&next=${encodeURIComponent(nextAfterLogin)}`;
}, 600);
      } catch (e: any) {
        if (cancelled) return;
        setStatus("error");
        setMessage(e?.message || "Something went wrong accepting the invite.");
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main style={wrap}>
      <div style={card}>
        <div style={title}>Coach Invite</div>
        <div style={sub}>{message}</div>

        {status === "error" ? (
          <div style={hint}>
            If you believe this is a mistake, ask your program admin to resend a new invite link.
          </div>
        ) : null}
      </div>
    </main>
  );
}

const wrap: React.CSSProperties = {
  maxWidth: 720,
  margin: "0 auto",
  padding: "24px 16px",
  color: "#0f172a",
};

const card: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  background: "#fff",
  padding: 16,
  boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
  display: "grid",
  gap: 8,
};

const title: React.CSSProperties = { fontWeight: 900, fontSize: 16 };

const sub: React.CSSProperties = { color: "#475569", lineHeight: 1.35 };

const hint: React.CSSProperties = {
  marginTop: 8,
  fontSize: 12,
  color: "#64748b",
};
