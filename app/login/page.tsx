// app/login/page.tsx

"use client";

import React, { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type Role = "player" | "parent" | "coach" | "team";

function roleLabel(r: Role) {
  switch (r) {
    case "player":
      return "Player";
    case "parent":
      return "Parent";
    case "coach":
      return "Coach";
    case "team":
      return "Team Admin";
    default:
      return "Coach";
  }
}

function fallbackForRole(r: Role) {
  switch (r) {
    case "coach":
      return "/dashboard/coach";
    case "team":
      return "/dashboard/team";
    case "player":
      return "/dashboard/player";
    case "parent":
      return "/dashboard/player";
    default:
      return "/dashboard/coach";
  }
}

function LoginPageInner() {
  const router = useRouter();
  const search = useSearchParams();

  const role = useMemo<Role>(() => {
    const raw = String(search.get("role") || "").trim().toLowerCase();
    if (raw === "player" || raw === "parent" || raw === "coach" || raw === "team") return raw;
    return "coach";
  }, [search]);

  const prefillEmail = useMemo(() => {
    return String(search.get("email") || "").trim().toLowerCase();
  }, [search]);

  const nextPath = useMemo(() => {
    return String(search.get("next") || "").trim();
  }, [search]);

  const [email, setEmail] = useState(prefillEmail);
  const [password, setPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const eNorm = email.trim().toLowerCase();
    if (!eNorm) return setError("Email is required.");
    if (!password) return setError("Password is required.");

    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        credentials: "include",
        body: JSON.stringify({ email: eNorm, password }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Invalid credentials.");
      }

      if (nextPath) {
        router.replace(nextPath);
        return;
      }

      router.replace(fallbackForRole(role));
    } catch (err: any) {
      setError(err?.message || "Login failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="sl-login">
      <style>{`
        .sl-login { max-width:420px; margin:80px auto; padding:24px; border:1px solid #e5e7eb; border-radius:12px; box-shadow: 0 4px 12px rgba(15,23,42,0.06); background:#fff; color:#0f172a; }
        .sl-login h1 { font-size:1.6rem; margin:0 0 16px; text-align:center; font-weight:900; letter-spacing:-0.02em; }
        .sl-subtitle { text-align:center; color:#64748b; margin:-6px 0 18px; font-weight:800; }
        .sl-field { display:flex; flex-direction:column; margin-bottom:16px; }
        .sl-field label { font-weight:800; margin-bottom:6px; font-size:0.95rem; color:#0f172a; }
        .sl-input { border:1px solid #e5e7eb; border-radius:10px; padding:10px 12px; font-size:1rem; outline:none; }
        .sl-input:focus { border-color:#caa042; box-shadow: 0 0 0 3px rgba(202,160,66,0.18); }
        .sl-help { font-size:0.85rem; color:#64748b; margin-top:6px; }
        .sl-links { display:flex; justify-content:space-between; margin-top:12px; }
        .sl-links a { font-size:0.9rem; color:#0ea5e9; font-weight:800; text-decoration:none; }
        .sl-links a:hover { text-decoration:underline; }
        .sl-submit { margin-top:18px; background:#caa042; color:#0f172a; border:1px solid #caa042; border-radius:10px; padding:10px 16px; cursor:pointer; width:100%; font-size:1rem; font-weight:900; transition:opacity .2s; }
        .sl-submit[disabled] { opacity:0.65; cursor:not-allowed; }
        .sl-error { margin-top:12px; padding:10px 12px; border:1px solid #fecaca; background:#fff1f2; color:#7f1d1d; border-radius:10px; font-weight:800; }
        .sl-next { margin-top:10px; font-size:0.85rem; color:#64748b; }
      `}</style>

      <h1>Log In</h1>
      <div className="sl-subtitle">{roleLabel(role)} Portal</div>

      <form onSubmit={onSubmit}>
        <div className="sl-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            className="sl-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email Address"
            autoComplete="email"
          />
        </div>

        <div className="sl-field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            className="sl-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <div className="sl-help">Minimum 8 characters.</div>
        </div>

        <div className="sl-links">
          <Link href="/forgot-password">Forgot Password?</Link>
        </div>

        {nextPath ? <div className="sl-next">After login: {nextPath}</div> : null}

        <button type="submit" className="sl-submit" disabled={submitting}>
          {submitting ? "Signing in…" : "Log In"}
        </button>

        {error ? <div className="sl-error">{error}</div> : null}
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}