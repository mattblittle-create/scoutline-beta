// app/forgot-password/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to process request.");
      }

      setSuccess(
        "If an account exists for that email, a password reset email has been sent."
      );
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={shell}>
      <section style={card}>
        <h1 style={title}>Forgot Password</h1>
        <p style={muted}>
          Enter your email and we’ll send you a secure password reset link.
        </p>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 14, marginTop: 18 }}>
          <div style={field}>
            <label style={label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={input}
              placeholder="Email address"
              required
            />
          </div>

          {error ? <div style={errorBox}>{error}</div> : null}
          {success ? <div style={successBox}>{success}</div> : null}

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button type="submit" disabled={submitting} style={goldBtn}>
              {submitting ? "Sending…" : "Send Reset Email"}
            </button>

            <Link href="/login" style={ghostBtn}>
              Back to Login
            </Link>
          </div>
        </form>
      </section>
    </main>
  );
}

const shell: React.CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: "24px 16px",
  background: "linear-gradient(to bottom, #f8fafc 0%, #ffffff 100%)",
};

const card: React.CSSProperties = {
  width: "100%",
  maxWidth: 520,
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  background: "#fff",
  padding: 24,
  boxShadow: "0 12px 30px rgba(15,23,42,0.06)",
};

const title: React.CSSProperties = {
  margin: 0,
  fontSize: "1.75rem",
  fontWeight: 900,
  letterSpacing: "-0.02em",
  color: "#0f172a",
};

const muted: React.CSSProperties = {
  marginTop: 10,
  color: "#475569",
  lineHeight: 1.5,
  fontWeight: 600,
};

const field: React.CSSProperties = {
  display: "grid",
  gap: 6,
};

const label: React.CSSProperties = {
  fontWeight: 900,
  color: "#0f172a",
};

const input: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: "10px 12px",
  background: "#fff",
  outline: "none",
};

const errorBox: React.CSSProperties = {
  padding: "10px 12px",
  border: "1px solid #fecaca",
  background: "#fff1f2",
  color: "#7f1d1d",
  borderRadius: 12,
  fontWeight: 800,
};

const successBox: React.CSSProperties = {
  padding: "10px 12px",
  border: "1px solid #bbf7d0",
  background: "#f0fdf4",
  color: "#166534",
  borderRadius: 12,
  fontWeight: 800,
};

const goldBtn: React.CSSProperties = {
  display: "inline-block",
  padding: "11px 15px",
  borderRadius: 12,
  border: "1px solid #caa042",
  background: "#caa042",
  color: "#0f172a",
  fontWeight: 900,
};

const ghostBtn: React.CSSProperties = {
  display: "inline-block",
  padding: "11px 15px",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 900,
  textDecoration: "none",
};