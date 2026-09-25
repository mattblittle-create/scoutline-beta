// app/set-password/page.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function validatePassword(pw: string): string | null {
  if (pw.length < 10) return "Password must be at least 10 characters.";
  if (!/[A-Z]/.test(pw)) return "Password must include at least one capital letter.";
  if (!/[0-9]/.test(pw)) return "Password must include at least one number.";
  if (!/[^A-Za-z0-9]/.test(pw)) return "Password must include at least one symbol.";
  return null;
}

function SetPasswordPageInner() {
  const router = useRouter();
  const search = useSearchParams();

  const token = String(search.get("token") || "").trim();
  const next = String(search.get("next") || "").trim();

  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [checking, setChecking] = React.useState(true);
  const [valid, setValid] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    let active = true;

    async function run() {
      if (!token) {
        setError("Missing setup token.");
        setChecking(false);
        setValid(false);
        return;
      }

      try {
        const res = await fetch(
          `/api/auth/validate-token?purpose=SET_PASSWORD&token=${encodeURIComponent(token)}`,
          { cache: "no-store" }
        );

        const json = await res.json().catch(() => ({}));

        if (!active) return;

        if (!res.ok || !json?.valid) {
          setValid(false);
          setError("This setup link is invalid or has expired.");
        } else {
          setValid(true);
          setEmail(String(json.email || ""));
          setError(null);
        }
      } catch (err: any) {
        if (!active) return;
        setValid(false);
        setError(err?.message || "Failed to validate setup link.");
      } finally {
        if (active) setChecking(false);
      }
    }

    run();
    return () => {
      active = false;
    };
  }, [token]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setError(null);
    setSuccess(null);

    const pwErr = validatePassword(password);
    if (pwErr) return setError(pwErr);

    if (password !== confirmPassword) {
      return setError("Passwords do not match.");
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, next }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to set password.");
      }

      setSuccess("Password set successfully. Redirecting...");
      window.setTimeout(() => {
        router.replace(String(json.redirectTo || "/dashboard/player"));
      }, 900);
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={shell}>
      <section style={card}>
        <h1 style={title}>Set Your Password</h1>

        {checking ? (
          <p style={muted}>Checking your setup link…</p>
        ) : !valid ? (
          <>
            <div style={errorBox}>{error || "Invalid setup link."}</div>
            <div style={{ marginTop: 14 }}>
              <Link href="/login" style={ghostBtn}>
                Back to Login
              </Link>
            </div>
          </>
        ) : (
          <>
            <p style={muted}>
              Set a password for <strong>{email || "your account"}</strong>.
            </p>

            <form onSubmit={onSubmit} style={{ display: "grid", gap: 14, marginTop: 18 }}>
              <div style={field}>
                <label style={label}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={input}
                  placeholder="Create a password"
                  required
                />
              </div>

              <div style={field}>
                <label style={label}>Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={input}
                  placeholder="Re-enter password"
                  required
                />
              </div>

              <div style={helper}>
                Requirements: 10+ characters, 1 capital letter, 1 number, 1 symbol.
              </div>

              {error ? <div style={errorBox}>{error}</div> : null}
              {success ? <div style={successBox}>{success}</div> : null}

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button type="submit" disabled={submitting} style={goldBtn}>
                  {submitting ? "Saving…" : "Set Password"}
                </button>

                <Link href="/login" style={ghostBtn}>
                  Back to Login
                </Link>
              </div>
            </form>
          </>
        )}
      </section>
    </main>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<main style={shell}><section style={card}><p style={muted}>Loading…</p></section></main>}>
      <SetPasswordPageInner />
    </Suspense>
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

const helper: React.CSSProperties = {
  color: "#64748b",
  fontSize: 13,
  lineHeight: 1.4,
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