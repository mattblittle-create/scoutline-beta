"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type PlanKey = "redshirt" | "walkon" | "allamerican" | "team" | "coach";

type PlanDef = {
  key: PlanKey;
  name: string;
  tagline: string;
  priceMonthly: string;
  priceAnnual?: string;
  requiresPayment: boolean;
  ctaNote?: string;
};

const PLANS: Record<PlanKey, PlanDef> = {
  redshirt: {
    key: "redshirt",
    name: "Redshirt",
    tagline: "Just practicing",
    priceMonthly: "FREE with ads",
    requiresPayment: false,
  },
  walkon: {
    key: "walkon",
    name: "Walk-On",
    tagline: "Ready to compete",
    priceMonthly: "$24.95 / month",
    priceAnnual: "$265 / year (12% off)",
    requiresPayment: true,
  },
  allamerican: {
    key: "allamerican",
    name: "All-American",
    tagline: "Time to get seen",
    priceMonthly: "$49.95 / month",
    priceAnnual: "$510 / year (15% off)",
    requiresPayment: true,
  },
  team: {
    key: "team",
    name: "Teams",
    tagline: "Compete together",
    priceMonthly: "$39.95 / player / month",
    requiresPayment: true,
  },
  coach: {
    key: "coach",
    name: "College Coaches and Recruiters",
    tagline: "Build champions together",
    priceMonthly: "FREE",
    requiresPayment: false,
    ctaNote:
      "With ScoutLine, you can discover player profiles, connect directly, watch highlights, follow social links, filter by stats, track performance with analytics dashboards and metric growth charts, build custom watchlists, and share prospects with your coaching staff.",
  },
};

function isPlayerPlan(plan: PlanKey) {
  return plan === "redshirt" || plan === "walkon" || plan === "allamerican";
}

export default function OnboardingPlanPage() {
  const { plan } = useParams<{ plan: PlanKey }>();
  const router = useRouter();

  const planDef = useMemo(() => PLANS[plan] ?? null, [plan]);

  // Steps: 0 = Plan summary, 1 = Payment (if needed), 2 = Profile setup
  const [step, setStep] = useState<number>(0);
  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => Math.max(0, s - 1));

  if (!planDef) {
    return (
      <main style={{ maxWidth: 900, margin: "40px auto", padding: "0 16px" }}>
        <h1 style={{ fontWeight: 900, marginBottom: 6 }}>Plan not found</h1>
        <p>Please choose a plan on the pricing page.</p>
        <p>
          <Link href="/pricing" className="sl-link-btn gold">
            Back to Pricing
          </Link>
        </p>
        <LocalStyles />
      </main>
    );
  }

  // Hide payment step if the plan is free
  const visibleStep = !planDef.requiresPayment && step === 1 ? 2 : step;

  return (
    <main style={{ maxWidth: 1000, margin: "28px auto", padding: "0 16px", color: "#0f172a" }}>
      {/* Back + Title */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <Link href="/pricing" className="sl-link-btn" style={{ padding: "6px 10px" }}>
          ← Back
        </Link>
        <h1 style={{ margin: 0, fontWeight: 900 }}>
          Get Started — <span style={{ color: "#caa042" }}>{planDef.name}</span>
        </h1>
      </div>

      {/* Stepper */}
      <div style={{ display: "flex", gap: 10, marginTop: 16, marginBottom: 18, flexWrap: "wrap" }}>
        {["Plan", "Payment", "Profile"].map((label, i) => {
          const isHidden = i === 1 && !planDef.requiresPayment;
          if (isHidden) return null;
          const isActive = visibleStep === i;
          return (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                opacity: isActive ? 1 : 0.6,
                fontWeight: isActive ? 800 : 600,
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  border: "2px solid #caa042",
                  background: isActive ? "#caa042" : "#fff",
                }}
              />
              <span>{label}</span>
            </div>
          );
        })}
      </div>

      {/* Step 0: Plan Summary */}
      {visibleStep === 0 && (
        <section style={card}>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Confirm Your Plan</h2>
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{planDef.name}</div>
            <div style={{ color: "#64748b" }}>{planDef.tagline}</div>
            <div style={{ fontWeight: 800 }}>{planDef.priceMonthly}</div>
            {planDef.priceAnnual && <div style={{ color: "#64748b" }}>{planDef.priceAnnual}</div>}
            {planDef.ctaNote && <p style={{ marginTop: 6 }}>{planDef.ctaNote}</p>}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button className="sl-link-btn" onClick={() => router.push("/pricing")}>
              Change Plan
            </button>
            <button className="sl-link-btn gold" onClick={next}>
              Continue
            </button>
          </div>
        </section>
      )}

      {/* Step 1: Payment (only for paid plans) */}
      {visibleStep === 1 && planDef.requiresPayment && (
        <section style={card}>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Payment</h2>
          <p style={{ marginTop: 0, color: "#334155" }}>
            You’re selecting <strong>{planDef.name}</strong>. We’ll connect this to your chosen billing term
            when checkout is integrated.
          </p>

          {/* Placeholder payment inputs (replace with Stripe elements later) */}
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            <label style={labelStyle}>
              <span>Cardholder Name</span>
              <input type="text" placeholder="Full name" style={inputStyle} />
            </label>
            <label style={labelStyle}>
              <span>Card Number</span>
              <input type="text" placeholder="•••• •••• •••• ••••" style={inputStyle} />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label style={labelStyle}>
                <span>Expiry</span>
                <input type="text" placeholder="MM/YY" style={inputStyle} />
              </label>
              <label style={labelStyle}>
                <span>CVC</span>
                <input type="text" placeholder="CVC" style={inputStyle} />
              </label>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button className="sl-link-btn" onClick={back}>
              Back
            </button>
            <button className="sl-link-btn gold" onClick={next}>
              Proceed to Profile Setup
            </button>
          </div>
        </section>
      )}

      {/* Step 2: Profile Setup */}
      {visibleStep === 2 && (
        <section style={card}>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Profile Setup</h2>

          {isPlayerPlan(planDef.key) && <PlayerForm />}
          {planDef.key === "team" && <TeamAdminForm />}
          {planDef.key === "coach" && <CoachForm />}

          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            {planDef.requiresPayment ? (
              <button className="sl-link-btn" onClick={back}>
                Back
              </button>
            ) : (
              <button className="sl-link-btn" onClick={() => router.push("/pricing")}>
                Back to Pricing
              </button>
            )}
            <button
              className="sl-link-btn gold"
              onClick={() => {
                // Hook up to real saves/redirects later
                alert("Profile created! Redirecting to your dashboard…");
              }}
            >
              Save & Continue
            </button>
          </div>
        </section>
      )}

      <LocalStyles />
    </main>
  );
}

/* ——— Sub-Forms ——— */

function PlayerForm() {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <p style={{ marginTop: 0, color: "#334155" }}>Create your player profile. You can add more later.</p>

      <div style={grid2}>
        <label style={labelStyle}>
          <span>First Name</span>
          <input style={inputStyle} type="text" placeholder="First name" />
        </label>
        <label style={labelStyle}>
          <span>Last Name</span>
          <input style={inputStyle} type="text" placeholder="Last name" />
        </label>
      </div>

      <div style={grid2}>
        <label style={labelStyle}>
          <span>Email</span>
          <input style={inputStyle} type="email" placeholder="Email address" />
        </label>
        <label style={labelStyle}>
          <span>Phone</span>
          <input style={inputStyle} type="tel" placeholder="(555) 555-5555" />
        </label>
      </div>

      <div style={grid2}>
        <label style={labelStyle}>
          <span>Graduation Year</span>
          <input style={inputStyle} type="number" placeholder="2027" />
        </label>
        <label style={labelStyle}>
          <span>Primary Position</span>
          <input style={inputStyle} type="text" placeholder="SS / RHP" />
        </label>
      </div>

      <label style={labelStyle}>
        <span>Player Bio</span>
        <textarea style={textAreaStyle} placeholder="Short intro, strengths, goals…" />
      </label>
    </div>
  );
}

function TeamAdminForm() {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <p style={{ marginTop: 0, color: "#334155" }}>Set up your team admin account and team details.</p>

      <div style={grid2}>
        <label style={labelStyle}>
          <span>Team Name</span>
          <input style={inputStyle} type="text" placeholder="City Gold 17U" />
        </label>
        <label style={labelStyle}>
          <span>Organization</span>
          <input style={inputStyle} type="text" placeholder="City Gold Baseball" />
        </label>
      </div>

      <div style={grid2}>
        <label style={labelStyle}>
          <span>Admin Name</span>
          <input style={inputStyle} type="text" placeholder="Full name" />
        </label>
        <label style={labelStyle}>
          <span>Admin Email</span>
          <input style={inputStyle} type="email" placeholder="you@example.com" />
        </label>
      </div>

      <label style={labelStyle}>
        <span>Roster Import (optional)</span>
        <input style={inputStyle} type="file" />
      </label>
    </div>
  );
}

function CoachForm() {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <p style={{ marginTop: 0, color: "#334155" }}>
        Create your coach/recruiter profile to start searching and saving players.
      </p>

      <div style={grid2}>
        <label style={labelStyle}>
          <span>Name</span>
          <input style={inputStyle} type="text" placeholder="Full name" />
        </label>
        <label style={labelStyle}>
          <span>Role</span>
          <input style={inputStyle} type="text" placeholder="Head Coach / Recruiting Coordinator" />
        </label>
      </div>

      <div style={grid2}>
        <label style={labelStyle}>
          <span>College / Program</span>
          <input style={inputStyle} type="text" placeholder="University / Program" />
        </label>
        <label style={labelStyle}>
          <span>Work Email</span>
          <input style={inputStyle} type="email" placeholder="name@university.edu" />
        </label>
      </div>

      <label style={labelStyle}>
        <span>Conference (optional)</span>
        <input style={inputStyle} type="text" placeholder="Conference name" />
      </label>
    </div>
  );
}

/* ——— Shared styles ——— */
const card: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 16,
  background: "#fff",
  boxShadow: "0 6px 16px rgba(15,23,42,0.06)",
  marginTop: 8,
};

const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 };

const labelStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  padding: "10px 12px",
  outline: "none",
};

const textAreaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 90,
  resize: "vertical",
};

function LocalStyles() {
  return (
    <style>{`
      .sl-link-btn {
        display: inline-block;
        padding: 10px 14px;
        border-radius: 10px;
        background: rgba(255,255,255,0.96);
        color: #0f172a;
        text-decoration: none;
        border: 1px solid #e5e7eb;
        font-weight: 800;
        transition: transform .2s ease, box-shadow .2s ease, background-color .2s ease, border-color .2s ease;
        cursor: pointer;
      }
      .sl-link-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0,0,0,0.18);
        background: #f3f4f6;
      }
      .sl-link-btn.gold {
        background: #caa042;
        color: #0f172a;
        border-color: #caa042;
      }
      .sl-link-btn.gold:hover {
        background: #d7b25e;
        border-color: #d7b25e;
      }
      button.sl-link-btn { font: inherit; }
      input, textarea { font: inherit; }

      @media (max-width: 640px) {
        /* stack two-column fields on mobile */
        div[style*="grid-template-columns: 1fr 1fr"] {
          grid-template-columns: 1fr !important;
        }
      }
    `}</style>
  );
}
