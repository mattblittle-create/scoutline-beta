"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type PageProps = { params: { plan: string } };

type Billing = "monthly" | "annual";
type PaymentMethod = "card" | "ach";

function normalizePlanSlug(raw: string): string {
  const p = String(raw || "").trim().toLowerCase().replace(/\s+/g, "-");
  // accept both allamerican + all-american, walkon + walk-on
  if (p === "walkon") return "walk-on";
  if (p === "allamerican") return "all-american";
  if (p === "teams") return "team";
  return p;
}

function isTeamPlan(plan: string) {
  return plan === "team";
}
function isPlayerPlan(plan: string) {
  return plan === "redshirt" || plan === "walk-on" || plan === "all-american";
}
function planSupportsAnnual(plan: string): boolean {
  // as of now: annual for Walk-On and All-American only
  return plan === "walk-on" || plan === "all-american";
}

function normalizeBilling(raw: string | null): Billing | null {
  const b = String(raw || "").trim().toLowerCase();
  if (b === "monthly") return "monthly";
  if (b === "annual") return "annual";
  return null;
}

function formatPlanLabel(plan: string): string {
  if (plan === "redshirt") return "Redshirt";
  if (plan === "walk-on") return "Walk-On";
  if (plan === "all-american") return "All-American";
  if (plan === "team") return "Teams";
  if (plan === "coach") return "Coach";
  return "Plan";
}

// UI-only price map (display + confirmation). Gateway wiring comes later.
const DISPLAY_PRICING: Record<
  string,
  { monthlyLabel?: string; annualLabel?: string; supportsAnnual?: boolean }
> = {
  redshirt: { monthlyLabel: "FREE with ads", supportsAnnual: false },
  "walk-on": { monthlyLabel: "$24.95 / month", annualLabel: "$265 / year", supportsAnnual: true },
  "all-american": { monthlyLabel: "$49.95 / month", annualLabel: "$510 / year", supportsAnnual: true },
  team: { monthlyLabel: "$39.95 / player / month", supportsAnnual: false },
  coach: { monthlyLabel: "FREE", supportsAnnual: false },
};

export default function OnboardingPaymentPage({ params }: PageProps) {
  const router = useRouter();
  const search = useSearchParams();

  const plan = normalizePlanSlug(params?.plan);
  const email = (search.get("email") || "").trim().toLowerCase();

  const known = isTeamPlan(plan) || isPlayerPlan(plan) || plan === "coach";

  // ✅ preselect billing from URL (?billing=monthly|annual) but only if plan supports it
  const billingParam = normalizeBilling(search.get("billing"));
  const initialBilling: Billing =
    billingParam === "annual" && planSupportsAnnual(plan) ? "annual" : "monthly";

  const [billingTerm, setBillingTerm] = React.useState<Billing>(initialBilling);
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>("card");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Keep state sane if plan changes (or annual is not allowed)
  React.useEffect(() => {
    if (!planSupportsAnnual(plan) && billingTerm === "annual") {
      setBillingTerm("monthly");
    }
  }, [plan, billingTerm]);

  async function onContinue(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (!known) return setError("Unknown onboarding plan.");
    if (!email) return setError("Missing email. Please start from Pricing.");
    if (billingTerm === "annual" && !planSupportsAnnual(plan)) {
      return setError("Annual billing is not available for this plan.");
    }

    setSubmitting(true);
    try {
      // stub: save selection only (no gateway payload yet)
      const endpoint = isTeamPlan(plan)
        ? "/api/onboarding/player/team/payment"
        : "/api/onboarding/player/payment";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          plan,
          billingTerm,
          paymentMethod,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Failed to save payment step.");
      }

      // ✅ route to the correct dashboard
      if (isTeamPlan(plan)) {
        router.push("/dashboard/team");
      } else if (plan === "coach") {
        router.push("/dashboard/coach/profile");
      } else {
        router.push("/dashboard/player/profile");
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!known) {
    return (
      <main style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px" }}>
        <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800 }}>
          Unknown onboarding plan
        </h1>
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

  const disableAnnual = !planSupportsAnnual(plan);
  const showFeeNote = paymentMethod === "card";

  const planLabel = formatPlanLabel(plan);
  const planPrice = DISPLAY_PRICING[plan] || {};
  const priceLine =
    billingTerm === "annual"
      ? planPrice.annualLabel || planPrice.monthlyLabel || "—"
      : planPrice.monthlyLabel || "—";

  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "24px 16px", color: "#0f172a" }}>
      <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800 }}>Payment</h1>

      <div className="summary">
        <div>
          <div className="summary-label">Plan</div>
          <div className="summary-value">{planLabel}</div>
        </div>
        <div>
          <div className="summary-label">Selected price</div>
          <div className="summary-value">{priceLine}</div>
        </div>
        <div>
          <div className="summary-label">Email</div>
          <div className="summary-value">{email || "—"}</div>
        </div>
      </div>

      <form onSubmit={onContinue} style={{ marginTop: 16 }}>
        <section className="card">
          <h2 className="h2">Billing</h2>
          <div className="row">
            <label className="pill">
              <input
                type="radio"
                checked={billingTerm === "monthly"}
                onChange={() => setBillingTerm("monthly")}
              />
              <span>Monthly</span>
            </label>

            <label className={`pill ${disableAnnual ? "disabled" : ""}`}>
              <input
                type="radio"
                checked={billingTerm === "annual"}
                onChange={() => setBillingTerm("annual")}
                disabled={disableAnnual}
              />
              <span>Annual</span>
            </label>
          </div>

          {disableAnnual && (
            <div className="note" style={{ marginTop: 10 }}>
              Annual billing is available for <strong>Walk-On</strong> and{" "}
              <strong>All-American</strong> only.
            </div>
          )}
        </section>

        <section className="card">
          <h2 className="h2">Payment Method</h2>
          <div className="row">
            <label className="pill">
              <input
                type="radio"
                checked={paymentMethod === "card"}
                onChange={() => setPaymentMethod("card")}
              />
              <span>Credit / Debit</span>
            </label>
            <label className="pill">
              <input
                type="radio"
                checked={paymentMethod === "ach"}
                onChange={() => setPaymentMethod("ach")}
              />
              <span>eCheck / ACH</span>
            </label>
          </div>

          {showFeeNote && (
            <div className="note">
              Credit/Debit payments will include an additional <strong>3%</strong> processing fee.
              eCheck/ACH has <strong>no added fee</strong>.
            </div>
          )}
        </section>

        <section className="card">
          <h2 className="h2">Gateway (coming next)</h2>
          <p style={{ marginTop: 6, color: "#64748b" }}>
            We’ll wire Valor Pay / NMI here next. For now, this step just saves your selections so
            we can test the full onboarding flow.
          </p>
        </section>

        {error && <div className="error">{error}</div>}

        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <button className="primary-btn" type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Continue"}
          </button>
          <Link href="/pricing" className="sl-link-btn">
            Back to Pricing
          </Link>
        </div>
      </form>

      <style>{`
        .summary{
          margin-top: 10px;
          display:grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          padding: 12px 14px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          background: #fff;
        }
        @media (max-width: 720px){
          .summary{ grid-template-columns: 1fr; }
        }
        .summary-label{
          font-size: 12px;
          color: #64748b;
          font-weight: 800;
          letter-spacing: .02em;
          text-transform: uppercase;
        }
        .summary-value{
          margin-top: 2px;
          font-weight: 900;
        }

        .card {
          margin-top: 14px;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 14px;
        }
        .h2 { margin: 0; font-size: 16px; font-weight: 900; }
        .row { display:flex; flex-wrap:wrap; gap:10px; margin-top:10px; }

        .pill {
          display:flex;
          align-items:center;
          gap:8px;
          padding:8px 10px;
          border-radius:999px;
          border:1px solid #e5e7eb;
          background:#fff;
          font-weight:800;
          cursor:pointer;
        }
        .pill.disabled { opacity: 0.55; cursor: not-allowed; }

        .note {
          margin-top: 10px;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid #fde68a;
          background: #fffbeb;
          color: #78350f;
          font-weight: 700;
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
        }
      `}</style>
    </main>
  );
}
