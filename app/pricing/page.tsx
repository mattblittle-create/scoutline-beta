// app/pricing/page.tsx

"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import Link from "next/link";

type Billing = "monthly" | "annual";
type PlanKey = "redshirt" | "walkon" | "allamerican" | "team";

type Plan = {
  key: PlanKey;
  name: string;
  tagline: string;
  ctaHref: string;
  priceMonthly: string;
  priceAnnual?: string;
  priceAnnualNote?: string;
  highlight?: boolean;
  noteBelowPrice?: string;
};

type FeatureCell = boolean | string;
type FeatureRow = {
  label: string;
  key: string;
  info?: string;
  availability: Partial<Record<PlanKey, FeatureCell>>;
};
type FeatureSection = { title: string; rows: FeatureRow[] };

const PLANS: Plan[] = [
  {
    key: "redshirt",
    name: "Redshirt",
    tagline: "Just practicing",
    ctaHref: "/onboarding/redshirt",
    priceMonthly: "FREE with ads",
  },
  {
    key: "walkon",
    name: "Walk-On",
    tagline: "Ready to compete",
    ctaHref: "/onboarding/walk-on",
    priceMonthly: "$24.95 / month",
    priceAnnual: "$265 / year",
    priceAnnualNote: "12% off",
  },
  {
    key: "allamerican",
    name: "All-American",
    tagline: "Time to get seen",
    ctaHref: "/onboarding/all-american",
    priceMonthly: "$49.95 / month",
    priceAnnual: "$510 / year",
    priceAnnualNote: "15% off",
    highlight: true,
  },
  {
    key: "team",
    name: "Teams",
    tagline: "Compete together",
    ctaHref: "/onboarding/teams",
    priceMonthly: "$39.95 / player / month",
  },
];

// Feature sections with dropdowns
const SECTIONS: FeatureSection[] = [
  {
    title: "General Info",
    rows: [
      { label: "Photo", key: "photo", availability: { redshirt: true, walkon: true, allamerican: true, team: true } },
      { label: "Name", key: "name", availability: { redshirt: true, walkon: true, allamerican: true, team: true } },
      { label: "Height", key: "height", availability: { redshirt: true, walkon: true, allamerican: true, team: true } },
      { label: "Weight", key: "weight", availability: { redshirt: true, walkon: true, allamerican: true, team: true } },
      { label: "Phone", key: "phone", availability: { redshirt: true, walkon: true, allamerican: true, team: true } },
      { label: "Email", key: "email", availability: { redshirt: true, walkon: true, allamerican: true, team: true } },
      { label: "Player Bio", key: "playerbio", availability: { redshirt: true, walkon: true, allamerican: true, team: true } },
      { label: "Secondary/Parent User", key: "secondaryuser", availability: { redshirt: true, walkon: true, allamerican: true, team: true } },
      { label: "Commitment Status", key: "commitstatus", availability: { redshirt: true, walkon: true, allamerican: true, team: true } },
    ],
  },
  {
    title: "Academics",
    rows: [
      { label: "School", key: "school", availability: { redshirt: true, walkon: true, allamerican: true, team: true } },
      { label: "Graduation Year", key: "gradyear", availability: { redshirt: true, walkon: true, allamerican: true, team: true } },
      { label: "GPA", key: "gpa", availability: { redshirt: true, walkon: true, allamerican: true, team: true } },
      { label: "SAT/ACT Scores", key: "tests", availability: { redshirt: true, walkon: true, allamerican: true, team: true } },
      {
        label: "Upload Documents (report cards, transcripts, etc.)",
        key: "docs",
        availability: { redshirt: false, walkon: true, allamerican: true, team: true },
      },
    ],
  },
  {
    title: "Athletics",
    rows: [
      { label: "Bats/Throws", key: "batsthrows", availability: { redshirt: true, walkon: true, allamerican: true, team: true } },
      { label: "Position(s)", key: "positions", availability: { redshirt: true, walkon: true, allamerican: true, team: true } },
      { label: "Team(s)", key: "teams", availability: { redshirt: true, walkon: true, allamerican: true, team: true } },
      { label: "Team Schedule(s)", key: "teamschedules", availability: { redshirt: false, walkon: true, allamerican: true, team: true } },
      { label: "Manual Stat Data Input", key: "manualstats", availability: { redshirt: true, walkon: true, allamerican: true, team: true } },
      {
        label: "Auto Data Sync with GameChanger, DiamondKast, and more",
        key: "autostats",
        availability: { redshirt: false, walkon: false, allamerican: true, team: true },
      },
      { label: "Manual Metric Data Input", key: "manualmetrics", availability: { redshirt: true, walkon: true, allamerican: true, team: true } },
      {
        label: "Auto Metric Data Sync with Rapsodo, TrackMan, and more",
        key: "autometrics",
        availability: { redshirt: false, walkon: false, allamerican: true, team: true },
      },
      { label: "Growth Tracking", key: "growth", availability: { redshirt: false, walkon: false, allamerican: true, team: true } },
      { label: "Ranking Amongst Peers", key: "ranking", availability: { redshirt: false, walkon: false, allamerican: true, team: true } },
      { label: "Coach References", key: "coachrefs", availability: { redshirt: false, walkon: true, allamerican: true, team: true } },
      { label: "Athlete Bio", key: "athletebio", availability: { redshirt: true, walkon: true, allamerican: true, team: true } },
      { label: "Profile Feedback and Optimization", key: "feedback", availability: { redshirt: false, walkon: false, allamerican: true, team: true } },
      { label: "Team-Wide Analytics Dashboard", key: "teamdash", availability: { redshirt: false, walkon: false, allamerican: false, team: true } },
      { label: "Roster Management", key: "roster", availability: { redshirt: false, walkon: false, allamerican: false, team: true } },
      { label: "Bulk Upload Tools", key: "bulk", availability: { redshirt: false, walkon: false, allamerican: false, team: true } },
      {
        label: 'White Label Dashboards with Team Logo "Powered by ScoutLine"',
        key: "whitelabel",
        availability: { redshirt: false, walkon: false, allamerican: false, team: true },
      },
    ],
  },
  {
    title: "Videos + Social Media + Communication",
    rows: [
      { label: "Video Uploads", key: "videos", availability: { redshirt: "None", walkon: "Up to 3", allamerican: "Unlimited", team: "Unlimited" } },
      { label: "Social Media Connect", key: "social", availability: { redshirt: false, walkon: true, allamerican: true, team: true } },
      { label: "Email with College Coaches and Recruiters", key: "emailcc", availability: { redshirt: false, walkon: true, allamerican: true, team: true } },
      { label: "Direct Message with College Coaches and Recruiters", key: "dmcc", availability: { redshirt: false, walkon: false, allamerican: true, team: true } },
      {
        label: "Response Assistant — one-click personalized messages and replies with profile link and videos",
        key: "respassist",
        availability: { redshirt: false, walkon: false, allamerican: true, team: true },
      },
    ],
  },
];

const CheckIcon = () => (
  <svg aria-hidden focusable="false" width="18" height="18" viewBox="0 0 24 24">
    <path
      d="M20.285 6.707a1 1 0 0 0-1.414-1.414L10 14.164 5.121 9.285a1 1 0 1 0-1.414 1.414l5.999 6a1 1 0 0 0 1.414 0l9.165-9.165Z"
      fill="#caa042"
    />
  </svg>
);

function cellContent(val: FeatureCell | undefined) {
  if (val === true) return <CheckIcon />;
  if (val === false || val == null) return <span aria-hidden>—</span>;
  return <span style={{ fontWeight: 700 }}>{val}</span>;
}

function planToOnboardingHref(planKey: PlanKey, billing: Billing): string {
  const canonicalPlan =
    planKey === "walkon"
      ? "walk-on"
      : planKey === "allamerican"
      ? "all-american"
      : planKey === "team"
      ? "team"
      : "redshirt";

  if (canonicalPlan === "team") {
    return `/onboarding/teams`;
  }

  const supportsAnnual =
    canonicalPlan === "walk-on" || canonicalPlan === "all-american";
  const billingToPass: Billing =
    billing === "annual" && supportsAnnual ? "annual" : "monthly";

  return `/onboarding/${encodeURIComponent(
    canonicalPlan
  )}?billing=${encodeURIComponent(billingToPass)}`;
}

export default function PricingPage() {
  const [billing, setBilling] = useState<Billing>("monthly");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const headerRef = useRef<HTMLDivElement | null>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      if (!headerRef.current) return;
      const top = headerRef.current.getBoundingClientRect().top;
      setStuck(top <= 0);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const planOrder: PlanKey[] = ["redshirt", "walkon", "allamerican", "team"];
  const planMap = useMemo(
    () => Object.fromEntries(PLANS.map((p) => [p.key, p])) as Record<PlanKey, Plan>,
    []
  );

  const toggleSection = (title: string) => {
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <main style={{ color: "#0f172a" }}>
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "8px 8px 24px" }}>
        <h2
          style={{
            textAlign: "center",
            margin: "0 0 6px",
            fontSize: "3rem",
            fontWeight: 800,
            letterSpacing: "-0.03em",
          }}
        >
          Compare ScoutLine Plan Features and Pricing
        </h2>

        <div
          style={{
            textAlign: "center",
            fontSize: "1.1rem",
            fontWeight: 700,
            color: "#334155",
            marginBottom: 4,
          }}
        >
          Built to help players get seen, teams stay organized, and coaches recruit faster.
        </div>

        <div
          style={{
            textAlign: "center",
            fontSize: "0.95rem",
            color: "#64748b",
            marginBottom: 16,
          }}
        >
          Choose the right plan for your recruiting journey.
        </div>

        {/* Toggle + coach CTA */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 18,
            alignItems: "flex-start",
            marginBottom: 18,
            flexWrap: "wrap",
          }}
        >
          <div
            role="group"
            aria-label="Billing period"
            style={{
              display: "inline-flex",
              border: "1px solid #e5e7eb",
              borderRadius: 999,
              overflow: "hidden",
              background: "#fff",
              boxShadow: "0 2px 8px rgba(15,23,42,0.06)",
            }}
          >
            <button
              aria-pressed={billing === "monthly"}
              onClick={() => setBilling("monthly")}
              className="sl-pill"
              style={{
                padding: "8px 14px",
                border: "none",
                cursor: "pointer",
                background: billing === "monthly" ? "#0f172a" : "transparent",
                color: billing === "monthly" ? "#fff" : "#0f172a",
                fontWeight: 700,
              }}
            >
              Monthly
            </button>

            <button
              aria-pressed={billing === "annual"}
              onClick={() => setBilling("annual")}
              className="sl-pill"
              style={{
                padding: "8px 14px",
                border: "none",
                cursor: "pointer",
                background: billing === "annual" ? "#0f172a" : "transparent",
                color: billing === "annual" ? "#fff" : "#0f172a",
                fontWeight: 700,
              }}
            >
              Annually
            </button>
          </div>

          <div style={{ display: "grid", gap: 6, justifyItems: "center" }}>
            <Link
              href="/onboarding/coach"
              style={{
                whiteSpace: "nowrap",
                background: "#0ea5e9",
                color: "#ffffff",
                border: "1px solid #0ea5e9",
                padding: "10px 18px",
                borderRadius: 999,
                fontWeight: 800,
                textDecoration: "none",
                boxShadow: "0 4px 10px rgba(14,165,233,0.25)",
                transition: "transform .15s ease, box-shadow .15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow =
                  "0 6px 14px rgba(14,165,233,0.35)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow =
                  "0 4px 10px rgba(14,165,233,0.25)";
              }}
            >
              College Coaches and Recruiters — Create Your Free Account
            </Link>

            <div
              style={{
                fontSize: "0.82rem",
                fontWeight: 700,
                color: "#0284c7",
                textAlign: "center",
                lineHeight: 1.25,
              }}
            >
              College coaches and recruiters always use ScoutLine free.
            </div>
          </div>
        </div>

        {/* Sticky plan cards */}
        <div
          ref={headerRef}
          style={{
            position: "sticky",
            top: 0,
            zIndex: 30,
            background: "rgba(255,255,255,0.96)",
            backdropFilter: "blur(8px)",
            borderBottom: "1px solid #e5e7eb",
            boxShadow: stuck ? "0 8px 20px rgba(15,23,42,0.08)" : "none",
            padding: "12px 6px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "minmax(220px, 1fr) repeat(4, minmax(180px, 1fr))",
              gap: 12,
              alignItems: "stretch",
            }}
          >
            <div />

            {planOrder.map((key) => {
              const plan = planMap[key];
              const priceText =
                billing === "monthly" || !plan.priceAnnual
                  ? plan.priceMonthly
                  : plan.priceAnnual;

              return (
                <div
                  key={plan.key}
                  className={`plan-card ${plan.highlight ? "highlight" : ""}`}
                  style={{
                    border: plan.highlight
                      ? "2px solid #caa042"
                      : "1px solid #e5e7eb",
                    borderRadius: 16,
                    padding: 18,
                    background: plan.highlight
                      ? "linear-gradient(180deg, #fffaf0 0%, #ffffff 100%)"
                      : "linear-gradient(180deg, #ffffff 0%, #fcfcfd 100%)",
                    position: "relative",
                    boxShadow: plan.highlight
                      ? "0 12px 30px rgba(202,160,66,0.18)"
                      : "0 8px 20px rgba(15,23,42,0.06)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    minHeight: 220,
                    textAlign: "center",
                    transition: "transform .18s ease, box-shadow .18s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow = plan.highlight
                      ? "0 16px 34px rgba(202,160,66,0.22)"
                      : "0 12px 26px rgba(15,23,42,0.10)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.boxShadow = plan.highlight
                      ? "0 12px 30px rgba(202,160,66,0.18)"
                      : "0 8px 20px rgba(15,23,42,0.06)";
                  }}
                >
                  {plan.highlight && (
                    <div
                      className="most-popular"
                      style={{
                        position: "absolute",
                        top: -12,
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "#caa042",
                        color: "#0f172a",
                        padding: "4px 12px",
                        borderRadius: 999,
                        fontSize: "0.75rem",
                        fontWeight: 900,
                        letterSpacing: "0.01em",
                        boxShadow: "0 6px 14px rgba(202,160,66,0.28)",
                      }}
                    >
                      Most Popular
                    </div>
                  )}

                  <div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "1.25rem",
                        fontWeight: 900,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {plan.name}
                    </h3>

                    <p
                      style={{
                        margin: "6px 0 0",
                        color: "#64748b",
                        fontStyle: "italic",
                      }}
                    >
                      {plan.tagline}
                    </p>
                  </div>

                  <div style={{ flex: 1 }} />

                  <div>
                    <div
                      className="price"
                      style={{
                        fontSize: "1.12rem",
                        fontWeight: 900,
                        margin: "10px 0 12px",
                        lineHeight: 1.25,
                      }}
                    >
                      {priceText}
                      {billing === "annual" && plan.priceAnnualNote && (
                        <span
                          className="annual-note"
                          style={{
                            display: "block",
                            fontSize: "0.8rem",
                            color: "#6b7280",
                            marginTop: 4,
                            fontWeight: 700,
                          }}
                        >
                          {plan.priceAnnualNote}
                        </span>
                      )}
                    </div>

                    <Link
                      href={planToOnboardingHref(plan.key, billing)}
                      className="sl-link-btn gold"
                      style={{
                        display: "inline-block",
                        minWidth: 132,
                      }}
                    >
                      Get Started
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Feature sections */}
        <div style={{ marginTop: 18 }}>
          {SECTIONS.map((section) => (
            <div key={section.title} style={{ marginBottom: 24 }}>
              <button
                type="button"
                onClick={() => toggleSection(section.title)}
                aria-expanded={!!openSections[section.title]}
                style={{
                  width: "100%",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: "1.1rem",
                  fontWeight: 800,
                  padding: "10px 4px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  borderBottom: "2px solid transparent",
                  transition:
                    "transform .2s ease, box-shadow .2s ease, border-color .2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow =
                    "0 6px 16px rgba(15,23,42,0.12)";
                  e.currentTarget.style.borderBottom = "2px solid #caa042";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.borderBottom = "2px solid transparent";
                }}
              >
                <span
                  aria-hidden
                  style={{
                    display: "inline-block",
                    transform: openSections[section.title]
                      ? "rotate(90deg)"
                      : "rotate(0deg)",
                    transition: "transform .2s ease",
                    fontSize: 16,
                    color: "#0f172a",
                  }}
                >
                  ▶
                </span>
                <span>{section.title}</span>
              </button>

              {openSections[section.title] && (
                <div
                  style={{
                    overflowX: "auto",
                    border: "1px solid #e5e7eb",
                    borderRadius: 14,
                    marginTop: 10,
                    boxShadow: "0 6px 16px rgba(15,23,42,0.04)",
                  }}
                >
                  {section.rows.map((row, idx) => (
                    <div
                      key={row.key}
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "minmax(220px, 1fr) repeat(4, minmax(180px, 1fr))",
                        gap: 10,
                        alignItems: "center",
                        padding: "12px 8px",
                        borderTop: idx === 0 ? "none" : "1px solid #f1f5f9",
                        background: idx % 2 === 0 ? "#fff" : "#fcfcfd",
                      }}
                    >
                      <div
                        style={{
                          position: "sticky",
                          left: 0,
                          zIndex: 2,
                          background: idx % 2 === 0 ? "#fff" : "#fcfcfd",
                          paddingRight: 8,
                          fontWeight: 700,
                        }}
                        title={row.info || row.label}
                      >
                        {row.label}
                      </div>

                      {planOrder.map((key) => (
                        <div
                          key={key}
                          style={{ display: "flex", justifyContent: "center" }}
                        >
                          {cellContent(row.availability[key])}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

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
          transition:
            transform .2s ease,
            box-shadow .2s ease,
            background-color .2s ease,
            text-decoration-color .2s ease,
            border-color .2s ease;
        }

        .sl-link-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.18);
          background: #e5e7eb;
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .sl-link-btn.gold {
          background: #caa042;
          color: #0f172a;
          border-color: #caa042;
          box-shadow: 0 4px 10px rgba(202,160,66,0.22);
        }

        .sl-link-btn.gold:hover {
          background: #d7b25e;
          border-color: #d7b25e;
          box-shadow: 0 8px 18px rgba(202,160,66,0.30);
        }
      `}</style>
    </main>
  );
}