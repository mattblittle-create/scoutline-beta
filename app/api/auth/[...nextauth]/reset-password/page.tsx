"use client";
import React, { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const j = await res.json();
    if (j.ok) {
      setOk(true);
      setTimeout(() => router.push("/login"), 1200);
    } else {
      setErr(j.error || "Unable to reset password.");
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto" }}>
      <h1>Set a new password</h1>
      {!token && <p style={{ color: "crimson" }}>Missing token.</p>}
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <input
          type="password"
          placeholder="New password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
        />
        <button type="submit" disabled={!token} style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", cursor: "pointer" }}>
          Save new password
        </button>
        {ok && <div style={{ color: "green" }}>Password updated. Redirecting…</div>}
        {err && <div style={{ color: "crimson" }}>{err}</div>}
      </form>
    </div>
  );
}
