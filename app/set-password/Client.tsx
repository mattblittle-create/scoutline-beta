"use client";

import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function SetPasswordClient() {
  const params = useSearchParams();
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOkMsg(null);

    if (!token) {
      setError("Missing token. Please use the link from your email.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to set password.");

      setOkMsg("Password set! You can now sign in.");
      setPassword("");
      setConfirm("");
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px" }}>
      <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800 }}>Set Your Password</h1>
      <p style={{ marginTop: 6, color: "#475569" }}>
        Create a password for your account to finish setup.
      </p>

      {!token && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 12px",
            border: "1px solid #fecaca",
            background: "#fff1f2",
            color: "#7f1d1d",
            borderRadius: 10,
            fontWeight: 700,
          }}
        >
          Missing token. Please use the verification link from your email.
        </div>
      )}

      <form onSubmit={onSubmit} style={{ marginTop: 16 }}>
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontWeight: 800, marginBottom: 6 }}>
              New Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                outline: "none",
              }}
            />
            <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: ".95rem" }}>
              Must be at least 8 characters.
            </p>
          </div>

          <div>
            <label style={{ display: "block", fontWeight: 800, marginBottom: 6 }}>
              Confirm Password
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              minLength={8}
              required
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                outline: "none",
              }}
            />
          </div>
        </div>

        {error && (
          <div
            style={{
              marginTop: 12,
              padding: "10px 12px",
              border: "1px solid #fecaca",
              background: "#fff1f2",
              color: "#7f1d1d",
              borderRadius: 10,
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        )}

        {okMsg && (
          <div
            style={{
              marginTop: 12,
              padding: "10px 12px",
              border: "1px solid #bbf7d0",
              background: "#f0fdf4",
              color: "#14532d",
              borderRadius: 10,
              fontWeight: 700,
            }}
          >
            {okMsg}{" "}
            <Link href="/login" style={{ textDecoration: "underline" }}>
              Go to Login
            </Link>
          </div>
        )}

        <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
          <button
            type="submit"
            disabled={submitting || !token}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: "1px solid #caa042",
              background: "#caa042",
              color: "#0f172a",
              fontWeight: 800,
              cursor: submitting || !token ? "not-allowed" : "pointer",
              opacity: submitting || !token ? 0.7 : 1,
            }}
          >
            {submitting ? "Saving…" : "Save Password"}
          </button>
          <Link
            href="/pricing"
            style={{
              display: "inline-block",
              padding: "10px 14px",
              borderRadius: 10,
              background: "#fff",
              color: "#0f172a",
              textDecoration: "none",
              border: "1px solid #e5e7eb",
              fontWeight: 800,
            }}
          >
            Back to Pricing
          </Link>
        </div>
      </form>
    </main>
  );
}
