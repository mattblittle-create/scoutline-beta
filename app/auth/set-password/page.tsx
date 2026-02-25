"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

function isStrongEnough(pw: string) {
  return String(pw || "").length >= 8;
}

type SetPasswordResponse =
  | { ok: true; data?: { redirectTo?: string; accountType?: string; email?: string } }
  | { ok: false; error?: string };

export default function SetPasswordPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const token = String(sp.get("token") || "").trim();

  const [pw1, setPw1] = React.useState("");
  const [pw2, setPw2] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [ok, setOk] = React.useState<string | null>(null);

  const canSubmit = !!token && isStrongEnough(pw1) && pw1 === pw2 && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);

    if (!token) return setErr("Missing token.");
    if (!isStrongEnough(pw1)) return setErr("Password must be at least 8 characters.");
    if (pw1 !== pw2) return setErr("Passwords do not match.");

    try {
      setBusy(true);

      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ token, password: pw1 }),
      });

      const json = (await res.json().catch(() => ({}))) as SetPasswordResponse;

      if (!res.ok || !json?.ok) {
        throw new Error((json as any)?.error || `Failed (${res.status})`);
      }

      const redirectTo = (json as any)?.data?.redirectTo || "/login";
      const accountType = String((json as any)?.data?.accountType || "").toUpperCase();

      setOk(
        accountType
          ? `Password set! Redirecting you to ${accountType.toLowerCase()} login…`
          : "Password set! Redirecting to login…"
      );

      window.setTimeout(() => {
        router.push(redirectTo);
      }, 700);
    } catch (e: any) {
      setErr(e?.message || "Failed to set password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={wrap}>
      <div style={card}>
        <div style={title}>Set Password</div>
        <div style={sub}>Create a password for your ScoutLine account.</div>

        {!token ? (
          <div style={errorBox}>Missing token. Please use the password setup link again.</div>
        ) : null}

        {err ? <div style={errorBox}>{err}</div> : null}
        {ok ? <div style={okBox}>{ok}</div> : null}

        <form onSubmit={submit} style={{ marginTop: 14, display: "grid", gap: 12 }}>
          <label style={label}>
            New Password (min 8 characters)
            <input
              type="password"
              value={pw1}
              onChange={(e) => setPw1(e.target.value)}
              style={input}
              autoComplete="new-password"
            />
          </label>

          <label style={label}>
            Confirm Password
            <input
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              style={input}
              autoComplete="new-password"
            />
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                ...btn,
                opacity: canSubmit ? 1 : 0.6,
                cursor: canSubmit ? "pointer" : "not-allowed",
              }}
            >
              {busy ? "Saving…" : "Set Password"}
            </button>
          </div>

          <div style={finePrint}>
            This link expires and can only be used once. If it’s expired, request a new one from onboarding.
          </div>
        </form>
      </div>
    </main>
  );
}

const wrap: React.CSSProperties = {
  maxWidth: 520,
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
};

const title: React.CSSProperties = { fontWeight: 900, fontSize: 18 };
const sub: React.CSSProperties = { marginTop: 6, color: "#64748b", lineHeight: 1.35 };

const label: React.CSSProperties = {
  display: "grid",
  gap: 6,
  fontWeight: 900,
  fontSize: 12,
  color: "#64748b",
};

const input: React.CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 14,
  outline: "none",
  background: "#fff",
  color: "#0f172a",
};

const btn: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #0ea5e9",
  background: "#0ea5e9",
  color: "#fff",
  fontWeight: 900,
};

const errorBox: React.CSSProperties = {
  marginTop: 12,
  padding: "10px 12px",
  border: "1px solid #fecaca",
  background: "#fff1f2",
  color: "#7f1d1d",
  borderRadius: 12,
  fontWeight: 900,
};

const okBox: React.CSSProperties = {
  marginTop: 12,
  padding: "10px 12px",
  border: "1px solid #bbf7d0",
  background: "#f0fdf4",
  color: "#14532d",
  borderRadius: 12,
  fontWeight: 900,
};

const finePrint: React.CSSProperties = {
  marginTop: 6,
  fontSize: 11,
  color: "#94a3b8",
  lineHeight: 1.35,
};
