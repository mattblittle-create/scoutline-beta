// app/onboarding/[plan]/page.tsx

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

function normalizePlanSlug(raw: string): string {
  const s = String(raw || "").trim().toLowerCase();
  const base = s.replace(/[_\s]+/g, "-");

  const alias: Record<string, string> = {
    red: "redshirt",
    redshirt: "redshirt",
    walkon: "walk-on",
    "walk-on": "walk-on",
    "walk-on-plan": "walk-on",
    allamerican: "all-american",
    "all-american": "all-american",
    "all-american-plan": "all-american",
    all_american: "all-american" as any,
    team: "team",
    teams: "team",
    "team-plan": "team",
    "teams-plan": "team",
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

function isEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function digitsOnly(v: any) {
  return String(v ?? "").replace(/\D+/g, "");
}

function formatPhoneNumber(v: any) {
  const digits = digitsOnly(v).slice(0, 10);

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function OnboardingPlanPage({ params }: PageProps) {
  const router = useRouter();
  const search = useSearchParams();

  const plan = normalizePlanSlug(params?.plan);
  const kind = classifyPlan(plan);

  const billing = "monthly";
  const billingQs = `?billing=${encodeURIComponent(billing)}`;

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

function PlayerOnboarding({ plan }: { plan: string }) {
  const router = useRouter();
  const search = useSearchParams();

  const prefillEmail = (search.get("email") || search.get("username") || "").trim();
  const billing = "monthly";

  const [form, setForm] = React.useState<PlayerCoreForm>({
    email: prefillEmail,
    phone: "",
    firstName: "",
    lastName: "",
    parentEmail: "",
  });

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [okMsg, setOkMsg] = React.useState<string | null>(null);
  const [needsSetPassword, setNeedsSetPassword] = React.useState(false);

  const planLabel =
    plan === "redshirt"
      ? "Redshirt"
      : plan === "walk-on"
      ? "Walk-On"
      : plan === "all-american"
      ? "All-American"
      : "Player";

  const canSubmit =
    Boolean(form.email.trim()) &&
    Boolean(form.phone.trim()) &&
    Boolean(form.firstName.trim()) &&
    Boolean(form.lastName.trim()) &&
    Boolean(form.parentEmail.trim()) &&
    isEmail(form.email.trim().toLowerCase()) &&
    isEmail(form.parentEmail.trim().toLowerCase()) &&
    digitsOnly(form.phone).length === 10;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setError(null);
    setOkMsg(null);
    setNeedsSetPassword(false);

    const email = form.email.trim().toLowerCase();
    const parentEmail = form.parentEmail.trim().toLowerCase();
    const phone = form.phone.trim();
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();

    if (!email) return setError("Player email is required.");
    if (!isEmail(email)) return setError("Player email is invalid.");
    if (!phone) return setError("Phone is required.");
    if (!firstName) return setError("First name is required.");
    if (!lastName) return setError("Last name is required.");
    if (!parentEmail) return setError("Parent email is required.");
    if (!isEmail(parentEmail)) return setError("Parent email is invalid.");

    setSubmitting(true);

    try {
      const res = await fetch("/api/onboarding/player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          plan,
          email,
          phone,
          firstName,
          lastName,
          parentEmail,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Failed (${res.status})`);
      }

      const needs = Boolean(json?.data?.needsSetPassword);
      const tokenFromApi = String(
        json?.data?.setPasswordToken ||
          json?.data?.setPasswordJwt ||
          json?.data?.token ||
          ""
      ).trim();

      if (needs) {
        const url = tokenFromApi
          ? `${window.location.origin}/set-password?token=${encodeURIComponent(tokenFromApi)}`
          : null;

        setNeedsSetPassword(true);

        const parentSetupUrl =
          `${window.location.origin}/onboarding/parent/password` +
          `?email=${encodeURIComponent(parentEmail)}` +
          `&playerEmail=${encodeURIComponent(email)}` +
          `&playerFirstName=${encodeURIComponent(firstName)}` +
          `&playerLastName=${encodeURIComponent(lastName)}` +
          `&plan=${encodeURIComponent(plan)}` +
          `&billing=${encodeURIComponent("monthly")}`;

        fetch("/api/onboarding/player/parent-invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerEmail: email,
            parentEmail,
            playerFirstName: firstName,
            playerLastName: lastName,
            plan,
            billing: "monthly",
            setupUrl: parentSetupUrl,
          }),
        }).catch((err) => {
          console.error("Parent invite send failed:", err);
        });

      setOkMsg(
        `You’re almost done — set your password using the link we sent to ${email}. Your parent/secondary contact will also receive a setup email.`
      );
        return;
      }

      setOkMsg("Saved! Redirecting…");
      window.setTimeout(() => {
        router.push("/dashboard/player/profile");
      }, 600);
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
        Step 1: Required core info. We’ll email you a secure password setup link after you continue.
      </p>

      {error ? <div className="error">{error}</div> : null}
      {okMsg ? <div className="ok">{okMsg}</div> : null}

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
              onChange={(e) =>
                setForm((f) => ({ ...f, phone: formatPhoneNumber(e.target.value) }))
              }
              placeholder="(555) 555-5555"
              maxLength={14}
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
            <p className="hint">
              We’ll email this address a link to set up a parent password after you continue.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
          <button type="submit" className="primary-btn" disabled={submitting || !canSubmit}>
            {submitting ? "Saving…" : "Save and Continue"}
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
      .input:focus {
        border-color:#caa042;
        box-shadow:0 0 0 3px rgba(202,160,66,0.2);
      }
      .hint {
        margin:6px 0 0;
        font-size:0.9rem;
        color:#64748b;
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
      .primary-btn:hover {
        transform: translateY(-2px);
        box-shadow:0 6px 16px rgba(0,0,0,0.18);
      }
      .primary-btn:disabled {
        opacity:.6;
        cursor:not-allowed;
      }
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
      .sl-link-btn.solid {
        background:#f8fafc;
      }
      .error {
        margin-top: 12px;
        padding: 10px 12px;
        border: 1px solid #fecaca;
        background: #fff1f2;
        color: #7f1d1d;
        border-radius: 10px;
        font-weight: 700;
      }
      .ok {
        margin-top: 12px;
        padding: 10px 12px;
        border: 1px solid #bbf7d0;
        background: #f0fdf4;
        color: #14532d;
        border-radius: 10px;
        font-weight: 700;
      }
      .setpw {
        margin-top: 12px;
        padding: 12px 12px;
        border: 1px solid #e5e7eb;
        background: #f8fafc;
        border-radius: 12px;
      }
    `}</style>
  );
}