// app/login/page.tsx

"use client";

import React, { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

type Role = "player" | "parent" | "coach" | "team";

function roleLabel(r: Role | null) {
  switch (r) {
    case "player":
      return "Player Portal";
    case "parent":
      return "Parent Portal";
    case "coach":
      return "Coach Portal";
    case "team":
      return "Team Admin Portal";
    default:
      return null;
  }
}

function fallbackForRole(r: Role) {
  switch (r) {
    case "coach":
      return "/dashboard/coach";
    case "team":
      return "/dashboard/team";
    case "player":
      return "/dashboard/player/profile";
    case "parent":
      return "/dashboard/parent";
    default:
      return "/dashboard/player/profile";
  }
}

function normalizeInternalPath(v: unknown): string | null {
  const s = String(v || "").trim();
  if (!s) return null;
  if (!s.startsWith("/")) return null;
  if (s.startsWith("//")) return null;
  return s;
}

function pickRedirectFromResponse(json: any): string | null {
  const candidates = [
    json?.redirectTo,
    json?.nextPath,
    json?.next,
    json?.redirect,
    json?.url,
  ];

  for (const value of candidates) {
    const safe = normalizeInternalPath(value);
    if (safe) return safe;
  }

  return null;
}

function LoginPageInner() {
  const router = useRouter();
  const search = useSearchParams();

  const roleFromQuery = useMemo<Role | null>(() => {
    const raw = String(search.get("role") || "")
      .trim()
      .toLowerCase();

    if (
      raw === "player" ||
      raw === "parent" ||
      raw === "coach" ||
      raw === "team"
    ) {
      return raw;
    }

    return null;
  }, [search]);

  const role: Role = roleFromQuery ?? "coach";

  const prefillEmail = useMemo(() => {
    return String(search.get("email") || "").trim().toLowerCase();
  }, [search]);

  const nextPath = useMemo(() => {
    return normalizeInternalPath(search.get("next"));
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

      const serverRedirect = pickRedirectFromResponse(json);

if (nextPath) {
  router.replace(nextPath);
  return;
}

if (serverRedirect) {
  router.replace(serverRedirect);
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
    <div className="sl-shell">
      <style>{`
        .sl-shell {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 16px;
          background: linear-gradient(to bottom, #f8fafc 0%, #ffffff 100%);
        }

        .sl-login {
          width: 100%;
          max-width: 430px;
          padding: 28px;
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          box-shadow: 0 10px 30px rgba(15,23,42,0.08);
          background: #fff;
          color: #0f172a;
        }

        .sl-brand {
          display: flex;
          justify-content: center;
          margin-bottom: 14px;
        }

        .sl-login h1 {
          font-size: 1.75rem;
          margin: 0;
          text-align: center;
          font-weight: 900;
          letter-spacing: -0.02em;
        }

        .sl-subtitle {
          text-align: center;
          color: #64748b;
          margin: 6px 0 0;
          font-weight: 800;
        }

        .sl-intro {
          text-align: center;
          color: #64748b;
          font-size: 0.95rem;
          line-height: 1.4;
          margin: 10px 0 22px;
        }

        .sl-field {
          display: flex;
          flex-direction: column;
          margin-bottom: 16px;
        }

        .sl-field label {
          font-weight: 800;
          margin-bottom: 6px;
          font-size: 0.95rem;
          color: #0f172a;
        }

        .sl-input {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 12px 14px;
          font-size: 1rem;
          outline: none;
          background: #fff;
          color: #0f172a;
        }

        .sl-input:focus {
          border-color: #caa042;
          box-shadow: 0 0 0 3px rgba(202,160,66,0.18);
        }

        .sl-links {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 4px;
          gap: 12px;
        }

        .sl-links a {
          font-size: 0.9rem;
          color: #0ea5e9;
          font-weight: 800;
          text-decoration: none;
        }

        .sl-links a:hover {
          text-decoration: underline;
        }

        .sl-submit {
          margin-top: 18px;
          background: #caa042;
          color: #0f172a;
          border: 1px solid #caa042;
          border-radius: 12px;
          padding: 12px 16px;
          cursor: pointer;
          width: 100%;
          font-size: 1rem;
          font-weight: 900;
          transition: opacity .2s;
        }

        .sl-submit[disabled] {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .sl-error {
          margin-top: 14px;
          padding: 10px 12px;
          border: 1px solid #fecaca;
          background: #fff1f2;
          color: #7f1d1d;
          border-radius: 12px;
          font-weight: 800;
        }

        .sl-next {
          margin-top: 10px;
          font-size: 0.85rem;
          color: #64748b;
          text-align: center;
        }
      `}</style>

      <main className="sl-login">
        <div className="sl-brand">
          <Image
            src="/scoutline-logo-gold.png"
            alt="ScoutLine"
            width={190}
            height={58}
            priority
          />
        </div>

        <h1>Log In</h1>
        {roleFromQuery ? (
          <div className="sl-subtitle">{roleLabel(roleFromQuery)}</div>
        ) : null}

        <div className="sl-intro">
          Access your ScoutLine account to manage your profile, team, recruiting
          tools, and billing.
        </div>

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
          </div>

          <div className="sl-links">
            <Link href="/forgot-password">Forgot Password?</Link>
            <Link href="/pricing">Create Account</Link>
          </div>

          {nextPath ? (
            <div className="sl-next">After login: {nextPath}</div>
          ) : null}

          <button type="submit" className="sl-submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Log In"}
          </button>

          {error ? <div className="sl-error">{error}</div> : null}
        </form>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}