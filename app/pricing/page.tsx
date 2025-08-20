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
  mostPopular?: boolean;
};

type FeatureCell = boolean | string;
type FeatureRow = {
  label: string;
  key: string;
  info?: string;
  availability: Partial<Record<PlanKey, FeatureCell>>;
};
type FeatureSection = { title: string; rows: FeatureRow[] };

// -------------------------------------------------------------
// Plans
// -------------------------------------------------------------
const PLANS: Plan[] = [
  {
    key: "redshirt",
    name: "Redshirt",
    tagline: "Just starting the process",
    ctaHref: "/get-started?plan=redshirt",
    priceMonthly: "FREE with ads",
  },
  {
    key: "walkon",
    name: "Walk-On",
    tagline: "Ready to compete",
    ctaHref: "/get-started?plan=walk-on",
    priceMonthly: "$24.95 / month",
    priceAnnual: "$265 / year",
    priceAnnualNote: "12% off",
  },
  {
    key: "allamerican",
    name: "All-American",
    tagline: "Time to get seen",
    ctaHref: "/get-started?plan=all-american",
    priceMonthly: "$49.95 / month",
    priceAnnual: "$510 / year",
    priceAnnualNote: "15% off",
    highlight: true,
    mostPopular: true,
  },
  {
    key: "team",
    name: "Teams",
    tagline: "Every player, every step",
    ctaHref: "/get-started?plan=team",
    priceMonthly: "$39.95 / player / month",
  },
];

// -------------------------------------------------------------
// Feature Matrix (4 plans only) — full rows
// -------------------------------------------------------------
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
      { label: "Athletic Bio", key: "athleticbio", availability: { redshirt: true, walkon: true, allamerican: true, team: true } },
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
    title: "Videos Social Media Communication",
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

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------
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

// -------------------------------------------------------------
// Component
// -------------------------------------------------------------
export default function PricingPage() {
  const [billing, setBilling] = useState<Billing>("monthly");
  const [open, setOpen] = useState<Record<string, boolean>>({
    "General Info": true,
    "Academics": true,
    "Athletics": true,
    "Videos Social Media Communication": true,
  });

  const toggle = (title: string) => setOpen((o) => ({ ...o, [title]: !o[title] }));

  // sticky shadow when scrolled
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

  // plans mapped
  const planOrder: PlanKey[] = ["redshirt", "walkon", "allamerican", "team"];
  const planMap = useMemo(() => Object.fromEntries(PLANS.map((p) => [p.key, p])), []);

  return (
    <main style={{ color: "#0f172a" }}>
      {/* Toggle + Coaches link */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 16px 12px" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div
            role="group"
            aria-label="Billing period"
            style={{
              display: "inline-flex",
              border: "1px solid #e5e7eb",
              borderRadius: 999,
              overflow: "hidden",
              background: "#fff",
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
              Annual
            </button>
          </div>

          <Link href="/get-started?plan=coach" className="sl-link-btn" style={{ whiteSpace: "nowrap" }}>
            College Coaches & Recruiters →
          </Link>
        </div>
      </section>

      {/* Sticky plan cards aligned with table columns */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px 18px" }}>
        <div
          ref={headerRef}
          style={{
            position: "sticky",
            top: 0,
            zIndex: 30,
            background: "#fff",
            borderBottom: "1px solid #e5e7eb",
            boxShadow: stuck ? "0 4px 16px rgba(15,23,42,0.08)" : "none",
          }}
        >
          <div
            className="plan-header-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(240px, 1fr) repeat(4, minmax(180px, 1fr))",
              gap: 10,
              alignItems: "stretch",
              padding: "12px 8px",
            }}
          >
            {/* spacer to align over feature labels */}
            <div />
            {planOrder.map((key) => {
              const p = planMap[key];
              const isAnnual = billing === "annual";
              return (
                <div
                  key={p.key}
                  className={`plan-card ${p.highlight ? "highlight" : ""}`}
                  style={{
                    border: p.highlight ? "2px solid #caa042" : "1px solid #e5e7eb",
                    borderRadius: 14,
                    padding: 12,
                    background: p.highlight ? "linear-gradient(0deg, #fff7e6, #fff)" : "#fff",
                    boxShadow: p.highlight ? "0 10px 24px rgba(202,160,66,0.18)" : "0 6px 16px rgba(15,23,42,0.06)",
                    display: "grid",
                    alignContent: "space-between",
                    textAlign: "center",
                  }}
                >
                  {p.mostPopular && (
                    <div
                      style={{
                        background: "#caa042",
                        color: "#0f172a",
                        fontWeight: 800,
                        padding: "4px 10px",
                        borderRadius: 6,
                        marginBottom: 8,
                        display: "inline-block",
                        fontSize: 12,
                      }}
                    >
                      Most Popular
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{p.name}</div>
                    <div style={{ color: "#64748b", fontStyle: "italic", fontSize: 12, marginTop: 2 }}>{p.tagline}</div>
                    <div style={{ marginTop: 10, fontWeight: 800, fontSize: 18 }}>
                      {isAnnual && p.priceAnnual ? p.priceAnnual : p.priceMonthly}
                    </div>
                    {isAnnual && p.priceAnnualNote && (
                      <div style={{ color: "#16a34a", fontSize: 12, fontWeight: 700, marginTop: 2 }}>{p.priceAnnualNote}</div>
                    )}
                  </div>
                  <div style={{ marginTop: 10, display: "flex", justifyContent: "center" }}>
                    <Link href={p.ctaHref} className="sl-link-btn gold">
                      Get Started
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Feature sections as dropdown accordions (aligned to same grid) */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px 28px" }}>
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          {SECTIONS.map((sec, si) => (
            <section key={sec.title}>
              {/* Section header (arrow to the LEFT + hover lift/underline) */}
              <button
                type="button"
                onClick={() => toggle(sec.title)}
                aria-expanded={open[sec.title]}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "#f8fafc",
                  padding: "12px",
                  border: "none",
                  borderTop: si === 0 ? "none" : "1px solid #e5e7eb",
                  borderBottom: "1px solid #e5e7eb",
                  cursor: "pointer",
                  fontWeight: 900,
                  fontSize: 16,
                  textAlign: "left",
                }}
                className="sec-toggle"
              >
                <span
                  aria-hidden
                  style={{
                    fontSize: 16,
                    transform: open[sec.title] ? "rotate(90deg)" : "rotate(0deg)",
                    transition: "transform .2s ease",
                  }}
                >
                  ▶
                </span>
                <span>{sec.title}</span>
              </button>

              {/* Rows */}
              {open[sec.title] && (
                <div>
                  {sec.rows.map((row, ri) => (
                    <div
                      key={row.key}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(240px, 1fr) repeat(4, minmax(180px, 1fr))",
                        alignItems: "center",
                        gap: 10,
                        padding: "12px 8px",
                        borderBottom: "1px solid #f1f5f9",
                        background: ri % 2 === 1 ? "#fff" : "#ffffff",
                      }}
                    >
                      {/* left sticky label (sticks on horizontal scroll) */}
                      <div
                        style={{
                          position: "sticky",
                          left: 0,
                          zIndex: 1,
                          background: "#fff",
                          paddingRight: 8,
                          fontWeight: 700,
                        }}
                        title={row.info || row.label}
                      >
                        {row.label}
                      </div>

                      {/* plan cells */}
                      {planOrder.map((key) => (
                        <div key={key} style={{ display: "flex", justifyContent: "center" }}>
                          {cellContent(row.availability[key])}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </section>

      {/* Local styles */}
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
          transition: transform .2s ease, box-shadow .2s ease, background-color .2s ease, text-decoration-color .2s ease, border-color .2s ease;
        }
        .sl-link-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.18);
          background: #f3f4f6;
          text-decoration: underline;
          text-underline-offset: 3px;
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

        /* hover lift + underline for section headers */
        .sec-toggle:hover {
          transform: translateY(-1px);
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .sec-toggle {
          transition: transform .2s ease, text-decoration-color .2s ease;
        }

        /* plan cards hover */
        .plan-card {
          transition: transform .2s ease, box-shadow .2s ease;
        }
        .plan-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 24px rgba(15,23,42,0.12);
        }
      `}</style>
    </main>
  );
}
