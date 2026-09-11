// app/onboarding/[plan]/password/page.tsx

"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type PageProps = { params: { plan: string } };

function normalizePlanSlug(raw: string): string {
  return String(raw || "").trim().toLowerCase().replace(/\s+/g, "-");
}

function isPlayerPlan(plan: string) {
  return plan === "redshirt" || plan === "walk-on" || plan === "all-american";
}

function planSupportsAnnual(plan: string): boolean {
  return plan === "walk-on" || plan === "all-american";
}

function validatePassword(pw: string): string | null {
  if (pw.length < 10) return "Password must be at least 10 characters.";
  if (!/[A-Z]/.test(pw)) return "Password must include at least one capital letter.";
  if (!/[0-9]/.test(pw)) return "Password must include at least one number.";
  if (!/[^A-Za-z0-9]/.test(pw)) return "Password must include at least one symbol.";
  return null;
}

function normalizeBilling(raw: string | null): "monthly" | "annual" | null {
  const b = String(raw || "").trim().toLowerCase();
  if (b === "monthly") return "monthly";
  if (b === "annual") return "annual";
  return null;
}

export default function OnboardingPasswordPage({ params }: PageProps) {
  const router = useRouter();
  const search = useSearchParams();

  const plan = normalizePlanSlug(params?.plan);
  const email = (search.get("email") || "").trim().toLowerCase();

  // ✅ carry billing forward
  const billingParam = normalizeBilling(search.get("billing"));
  const billingToUse =
    billingParam === "annual" && !planSupportsAnnual(plan) ? "monthly" : billingParam;
  const billingQs = billingToUse ? `&billing=${encodeURIComponent(billingToUse)}` : "";

  const [password, setPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // ✅ hard redirect legacy routes away from this page
  React.useEffect(() => {
    if (plan === "team" || plan === "teams") router.replace(`/onboarding/teams?billing=${encodeURIComponent(billingToUse || "monthly")}`);
    if (plan === "coach" || plan === "coaches") router.replace(`/onboarding/coach`);
  }, [plan, router, billingToUse]);

  const known = isPlayerPlan(plan);

  React.useEffect(() => {
    setError(null);
  }, [plan, email, billingParam]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (!known) return setError("Unknown onboarding plan.");
    if (!email) return setError("Missing email. Please start from Pricing.");

    const pwErr = validatePassword(password);
    if (pwErr) return setError(pwErr);

    setSubmitting(true);
    try {
      const res = await fetch("/api/onboarding/player/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, plan }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to set password.");

      router.push(`/onboarding/${encodeURIComponent(plan)}/payment?email=${encodeURIComponent(email)}${billingQs}`);
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!known) {
    return (
      <main style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px" }}>
        <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800 }}>Unknown onboarding plan</h1>
        <p style={{ marginTop: 8, color: "#475569" }}>
          Head back to{" "}
          <Link href="/pricing" style={{ textDecoration: "underline" }}>
            Pricing
          </Link>
          .
        </p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "24px 16px", color: "#0f172a" }}>
      <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800 }}>Set up your password</h1>
      <p style={{ marginTop: 6, color: "#475569" }}>
        Email (username): <strong>{email || "—"}</strong>
      </p>

      <form onSubmit={onSubmit} style={{ marginTop: 16 }}>
        <div style={{ display: "grid", gap: 10, maxWidth: 520 }}>
          <label style={{ fontWeight: 800 }}>Password</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password"
            required
          />
          <div style={{ color: "#64748b", fontSize: 13, lineHeight: 1.35 }}>
            Requirements: 10+ characters, 1 capital letter, 1 number, 1 symbol.
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <button className="primary-btn" type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Next Step"}
          </button>
          <Link href="/pricing" className="sl-link-btn">
            Back to Pricing
          </Link>
        </div>
      </form>

      <style>{`
        .input {
          width:100%;
          padding:10px 12px;
          border:1px solid #e5e7eb;
          border-radius:10px;
          outline:none;
          background:#fff;
        }
        .input:focus {
          border-color:#caa042;
          box-shadow:0 0 0 3px rgba(202,160,66,0.2);
        }
        .primary-btn {
          padding:10px 16px;
          border-radius:10px;
          border:1px solid #caa042;
          background:#caa042;
          color:#0f172a;
          font-weight:800;
          cursor:pointer;
          transition:transform .15s ease, box-shadow .15s ease;
        }
        .primary-btn:hover { transform: translateY(-2px); box-shadow:0 6px 16px rgba(0,0,0,0.18); }
        .primary-btn:disabled { opacity:.6; cursor:not-allowed; }
        .sl-link-btn {
          display:inline-block;
          padding:10px 14px;
          border-radius:10px;
          background:#fff;
          color:#0f172a;
          text-decoration:none;
          border:1px solid #e5e7eb;
          font-weight:800;
        }
        .sl-link-btn:hover { text-decoration: underline; text-underline-offset: 3px; }
        .error {
          margin-top: 10px;
          padding: 10px 12px;
          border: 1px solid #fecaca;
          background: #fff1f2;
          color: #7f1d1d;
          border-radius: 10px;
          font-weight: 700;
          max-width: 520px;
        }
      `}</style>
    </main>
  );
}
