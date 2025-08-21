"use client";

import { useState } from "react";

export default function ResendClient({ email }: { email: string }) {
  const [status, setStatus] = useState<"idle" | "ok" | "err" | "loading">("idle");

  const onResend = async () => {
    if (!email) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStatus(res.ok ? "ok" : "err");
    } catch {
      setStatus("err");
    }
  };

  return (
    <div>
      <button
        className="primary-btn"
        onClick={onResend}
        disabled={!email || status === "loading"}
        style={{
          padding: "10px 16px",
          borderRadius: 10,
          border: "1px solid #caa042",
          background: "#caa042",
          color: "#0f172a",
          fontWeight: 800,
          cursor: !email || status === "loading" ? "not-allowed" : "pointer",
          opacity: !email || status === "loading" ? 0.7 : 1,
        }}
      >
        {status === "loading" ? "Resending…" : "Resend verification email"}
      </button>

      {status === "ok" && (
        <div style={{ marginTop: 10, fontWeight: 700, color: "#065f46" }}>
          Verification email sent.
        </div>
      )}
      {status === "err" && (
        <div style={{ marginTop: 10, fontWeight: 700, color: "#7f1d1d" }}>
          Couldn’t send email. Try again.
        </div>
      )}
      {!email && (
        <div style={{ marginTop: 10, fontWeight: 700, color: "#7f1d1d" }}>
          No email provided.
        </div>
      )}
    </div>
  );
}
