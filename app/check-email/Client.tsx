"use client";

import { useState } from "react";

export default function Resend({ email }: { email: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");

  const onResend = async () => {
    if (!email) return;
    try {
      setStatus("loading");
      const res = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("bad status");
      setStatus("ok");
    } catch {
      setStatus("err");
    }
  };

  return (
    <button
      type="button"
      onClick={onResend}
      className="primary-btn"
      disabled={!email || status === "loading"}
      aria-live="polite"
    >
      {status === "loading" ? "Resending…" : status === "ok" ? "Sent!" : "Resend Email"}
      <style>{`
        .primary-btn {
          padding:10px 16px;
          border-radius:10px;
          border:1px solid #caa042;
          background:#caa042;
          color:#0f172a;
          font-weight:800;
          cursor:pointer;
          transition:transform .15s ease, box-shadow .15s ease, background-color .15s ease;
        }
        .primary-btn:hover { transform: translateY(-2px); box-shadow:0 6px 16px rgba(0,0,0,0.18); }
        .primary-btn:disabled { opacity:.6; cursor:not-allowed; }
      `}</style>
    </button>
  );
}
