"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

type PageProps = { params: { plan: string } };

type PlayerCoreForm = {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  parentEmail: string;
};

const US_STATES = [
  { abbr: "AL" },
  { abbr: "AK" },
  { abbr: "AZ" },
  { abbr: "AR" },
  { abbr: "CA" },
  { abbr: "CO" },
  { abbr: "CT" },
  { abbr: "DE" },
  { abbr: "FL" },
  { abbr: "GA" },
  { abbr: "HI" },
  { abbr: "ID" },
  { abbr: "IL" },
  { abbr: "IN" },
  { abbr: "IA" },
  { abbr: "KS" },
  { abbr: "KY" },
  { abbr: "LA" },
  { abbr: "ME" },
  { abbr: "MD" },
  { abbr: "MA" },
  { abbr: "MI" },
  { abbr: "MN" },
  { abbr: "MS" },
  { abbr: "MO" },
  { abbr: "MT" },
  { abbr: "NE" },
  { abbr: "NV" },
  { abbr: "NH" },
  { abbr: "NJ" },
  { abbr: "NM" },
  { abbr: "NY" },
  { abbr: "NC" },
  { abbr: "ND" },
  { abbr: "OH" },
  { abbr: "OK" },
  { abbr: "OR" },
  { abbr: "PA" },
  { abbr: "RI" },
  { abbr: "SC" },
  { abbr: "SD" },
  { abbr: "TN" },
  { abbr: "TX" },
  { abbr: "UT" },
  { abbr: "VT" },
  { abbr: "VA" },
  { abbr: "WA" },
  { abbr: "WV" },
  { abbr: "WI" },
  { abbr: "WY" },
];

function normalizePlanSlug(raw: string): string {
  const s = String(raw || "").trim().toLowerCase();
  const base = s.replace(/[_\s]+/g, "-");

  const alias: Record<string, string> = {
    // player plans
    red: "redshirt",
    redshirt: "redshirt",

    walkon: "walk-on",
    "walk-on": "walk-on",
    "walk-on-plan": "walk-on",

    allamerican: "all-american",
    "all-american": "all-american",
    "all-american-plan": "all-american",
    all_american: "all-american" as any,

    // teams (legacy)
    team: "team",
    teams: "team",
    "team-plan": "team",
    "teams-plan": "team",

    // coach (legacy)
    coach: "coach",
    coaches: "coach",
  };

  return alias[base] || base;
}

function classifyPlan(planSlug: string): "PLAYER" | "TEAM" | "COACH" | "UNKNOWN" {
  if (planSlug === "coach") return "COACH";
  if (planSlug === "team") return "TEAM";
  if (planSlug === "redshirt" || planSlug === "walk-on" || planSlug === "all-american") return "PLAYER";
  return "UNKNOWN";
}

export default function OnboardingPlanPage({ params }: PageProps) {
  const router = useRouter();
  const search = useSearchParams();

  const plan = normalizePlanSlug(params?.plan);
  const kind = classifyPlan(plan);

  // Preserve billing query when we redirect legacy routes
  const billing = (search.get("billing") || "").trim().toLowerCase();
  const billingQs = billing ? `?billing=${encodeURIComponent(billing)}` : "";

  // ✅ Redirect legacy routes to new dedicated pages
  React.useEffect(() => {
    if (kind === "COACH") router.replace(`/onboarding/coach${billingQs}`);
    if (kind === "TEAM") router.replace(`/onboarding/teams${billingQs}`);
  }, [kind, router, billingQs]);

  if (kind === "COACH" || kind === "TEAM") {
    return (
      <main style={{ maxWidth: 820, margin: "0 auto", padding: "24px 16px", color: "#0f172a" }}>
        <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 900 }}>Redirecting…</h1>
        <p style={{ marginTop: 8, color: "#475569" }}>Taking you to the correct onboarding page.</p>
        <div style={{ marginTop: 12 }}>
          <Link href="/pricing" className="sl-link-btn">
            Back to Pricing
          </Link>
        </div>
        <StyleBlock />
      </main>
    );
  }

  if (kind === "PLAYER") return <PlayerOnboarding plan={plan} />;

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px" }}>
      <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800 }}>Unknown onboarding plan</h1>
      <p style={{ marginTop: 8, color: "#475569" }}>
        Head back to{" "}
        <Link href="/pricing" className="sl-link">
          Pricing
        </Link>
        .
      </p>
      <style>{`.sl-link{ text-decoration:underline; }`}</style>
    </main>
  );
}

/* =========================
   PLAYER ONBOARDING
========================= */

function PlayerOnboarding({ plan }: { plan: string }) {
  const router = useRouter();
  const search = useSearchParams();

  // accept either ?email= or ?username=
  const prefillEmail = (search.get("email") || search.get("username") || "").trim();

  // carry billing forward (monthly | annual)
  const billing = (search.get("billing") || "").trim().toLowerCase();
  const billingQs = billing ? `&billing=${encodeURIComponent(billing)}` : "";

  const [form, setForm] = React.useState<PlayerCoreForm>({
    email: prefillEmail,
    phone: "",
    firstName: "",
    lastName: "",
    parentEmail: "",
  });

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const planLabel =
    plan === "redshirt"
      ? "Redshirt"
      : plan === "walk-on"
      ? "Walk-On"
      : plan === "all-american"
      ? "All-American"
      : "Player";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    if (!form.email.trim()) return setError("Player email is required.");
    if (!form.phone.trim()) return setError("Phone is required.");
    if (!form.firstName.trim()) return setError("First name is required.");
    if (!form.lastName.trim()) return setError("Last name is required.");
    if (!form.parentEmail.trim()) return setError("Parent email is required.");

    setSubmitting(true);
    try {
      const email = form.email.trim().toLowerCase();
      const parentEmail = form.parentEmail.trim().toLowerCase();

      const res = await fetch("/api/onboarding/player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          email,
          phone: form.phone.trim(),
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          parentEmail,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || "Failed to save onboarding info.");

      fetch("/api/onboarding/player/parent-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerEmail: email, parentEmail }),
      }).catch(() => {});

      router.push(`/onboarding/${encodeURIComponent(plan)}/password?email=${encodeURIComponent(email)}${billingQs}`);
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: 820, margin: "0 auto", padding: "24px 16px", color: "#0f172a" }}>
      <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800 }}>{planLabel} — Player Onboarding</h1>
      <p style={{ marginTop: 6, color: "#475569" }}>
        Step 1: Required core info. Next you’ll set your password, then input payment.
      </p>

      <form onSubmit={onSubmit} style={{ marginTop: 16 }}>
        <div className="grid">
          <div className="field">
            <label className="label">
              Player Email<span className="req">*</span>
            </label>
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="player@email.com"
              required
            />
          </div>

          <div className="field">
            <label className="label">
              Phone<span className="req">*</span>
            </label>
            <input
              className="input"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="(555) 555-5555"
              required
            />
          </div>

          <div className="field">
            <label className="label">
              First Name<span className="req">*</span>
            </label>
            <input
              className="input"
              type="text"
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              placeholder="First name"
              required
            />
          </div>

          <div className="field">
            <label className="label">
              Last Name<span className="req">*</span>
            </label>
            <input
              className="input"
              type="text"
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              placeholder="Last name"
              required
            />
          </div>

          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label className="label">
              Parent / Secondary Email<span className="req">*</span>
            </label>
            <input
              className="input"
              type="email"
              value={form.parentEmail}
              onChange={(e) => setForm((f) => ({ ...f, parentEmail: e.target.value }))}
              placeholder="parent@email.com"
              required
            />
            <p className="hint">We’ll email this address a link to set up a parent password after you continue.</p>
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          <button type="submit" className="primary-btn" disabled={submitting}>
            {submitting ? "Saving…" : "Next Step"}
          </button>
          <Link href="/pricing" className="sl-link-btn">
            Back to Pricing
          </Link>
        </div>
      </form>

      <StyleBlock />
    </main>
  );
}

/* =========================
   Shared styles
========================= */

function StyleBlock() {
  return (
    <style>{`
      .grid { display:grid; grid-template-columns: 1fr 1fr; gap:14px; }
      @media (max-width: 720px) { .grid { grid-template-columns: 1fr; } }
      .label { display:block; font-weight:800; margin-bottom:6px; }
      .req { color:#b91c1c; margin-left:4px; }
      .input {
        width:100%;
        padding:10px 12px;
        border:1px solid #e5e7eb;
        border-radius:10px;
        outline:none;
        background:#fff;
      }
      .input:focus { border-color:#caa042; box-shadow:0 0 0 3px rgba(202,160,66,0.2); }
      .hint { margin:6px 0 0; font-size:0.9rem; color:#64748b; }

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
        transition:transform .2s ease, box-shadow .2s ease, background-color .2s ease, text-decoration-color .2s ease;
      }
      .sl-link-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0,0,0,0.18);
        background: #f3f4f6;
        text-decoration: underline;
        text-underline-offset: 3px;
      }

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
  );
}
