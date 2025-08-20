"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import Link from "next/link";

type Billing = "monthly" | "annual";
type PlanKey = "redshirt" | "walkon" | "allamerican" | "team" | "coach";

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
  },
  {
    key: "team",
    name: "Teams",
    tagline: "Every player, every step",
    ctaHref: "/get-started?plan=team",
    priceMonthly: "$39.95 / player / month",
  },
  // Coach plan intentionally NOT rendered in the grid below
  {
    key: "coach",
    name: "College Coaches & Recruiters",
    tagline: "Build champions together",
    ctaHref: "/get-started?plan=coach",
    priceMonthly: "FREE",
  },
];

const SECTIONS: FeatureSection[] = [
  { title: "Build Your Player Profile", rows: [] },

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
      { label: "Upload Documents (report cards, transcripts, etc.)", key: "docs", availability: { redshirt: false, walkon: true, allamerican: true, team: true } },
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
      { label: "Auto Data Sync with GameChanger, DiamondKast, and more", key: "autostats", availability: { redshirt: false, walkon: false, allamerican: true, team: true } },
      { label: "Manual Metric Data Input", key: "manualmetrics", availability: { redshirt: true, walkon: true, allamerican: true, team: true } },
      { label: "Auto Metric Data Sync with Rapsodo, TrackMan, and more", key: "autometrics", availability: { redshirt: false, walkon: false, allamerican: true, team: true } },
      { label: "Growth Tracking", key: "growth", availability: { redshirt: false, walkon: false, allamerican: true, team: true } },
      { label: "Ranking Amongst Peers", key: "ranking", availability: { redshirt: false, walkon: false, allamerican: true, team: true } },
      { label: "Coach References", key: "coachrefs", availability: { redshirt: false, walkon: true, allamerican: true, team: true } },
      { label: "Athletic Bio", key: "athleticbio", availability: { redshirt: true, walkon: true, allamerican: true, team: true } },
      { label: "Profile Feedback and Optimization", key: "feedback", availability: { redshirt: false, walkon: false, allamerican: true, team: true } },
      { label: "Team-Wide Analytics Dashboard", key: "teamdash", availability: { redshirt: false, walkon: false, allamerican: false, team: true } },
      { label: "Roster Management", key: "roster", availability: { redshirt: false, walkon: false, allamerican: false, team: true } },
      { label: "Bulk Upload Tools", key: "bulk", availability: { redshirt: false, walkon: false, allamerican: false, team: true } },
      { label: 'White Label Dashboards with Team Logo "Powered by ScoutLine"', key: "whitelabel", availability: { redshirt: false, walkon: false, allamerican: false, team: true } },
    ],
  },

  {
    title: "Videos • Social Media • Communication",
    rows: [
      { label: "Video Uploads", key: "videos", availability: { redshirt: "None", walkon: "Up to 3", allamerican: "Unlimited", team: "Unlimited" } },
      { label: "Social Media Connect", key: "social", availability: { redshirt: false, walkon: true, allamerican: true, team: true } },
      { label: "Email with College Coaches and Recruiters", key: "emailcc", availability: { redshirt: false, walkon: true, allamerican: true, team: true } },
      { label: "Direct Message with College Coaches and Recruiters", key: "dmcc", availability: { redshirt: false, walkon: false, allamerican: true, team: true } },
      { label: "Response Assistant — one-click personalized messages and replies with profile link and videos", key: "respassist", availability: { redshirt: false, walkon: false, allamerican: true, team: true } },
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

export default function PricingPage() {
  const [billing, setBilling] = useState<Billing>("monthly");

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

  // Only render these 4 plans in the grid
  const planOrder: PlanKey[] = ["redshirt", "walkon", "allamerican", "team"];
  const planMap = useMemo(() => Object.fromEntries(PLANS.map((p) => [p.key, p])), []);

  return (
    <main style={{ color: "#0f172a" }}>
      {/* BILLING TOGGLE + quick link for coaches */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 16px" }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
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

          {/* Link for College Coaches & Recruiters setup */}
          <Link href="/get-started?plan=coach" className="sl-link-btn" style={{ whiteSpace: "nowrap" }}>
            College Coaches & Recruiters →
          </Link>
        </div>

        {/* Sticky plan headers (FOUR plans) */}
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
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(220px, 1fr) repeat(4, minmax(180px, 1fr))",
              gap: 10,
              alignItems: "stretch",
              padding: "12px 8px",
            }}
          >
            {/* Left spacer for feature names */}
            <div />
            {planOrder.map((key) => {
              const p = planMap[key];
              const isAnnual = billing === "annual";
              return (
                <div
                  key={p.key}
                  className="plan-card"
                  style={{
                    border: p.highlight ? "2px solid #caa042" : "1px solid #e5e7eb",
                    borderRadius: 14,
                    padding: 12,
                    background: p.highlight ? "linear-gradient(0deg, #fff7e6, #fff)" : "#fff",
                    boxShadow: p.highlight ? "0 10px 24px rgba(202,160,66,0.18)" : "0 6px 16px rgba(15,23,42,0.06)",
                    display: "grid",
                    alignContent: "space-between",
                  }}
                >
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>{p.name}</div>
                    <div style={{ color: "#64748b", fontStyle: "italic", fontSize: 12, marginTop: 2 }}>
                      {p.tagline}
                    </div>
                    <div style={{ marginTop: 10, fontWeight: 800, fontSize: 18 }}>
                      {isAnnual && p.priceAnnual ? p.priceAnnual : p.priceMonthly}
                    </div>
                    {isAnnual && p.priceAnnualNote && (
                      <div style={{ color: "#16a34a", fontSize: 12, fontWeight: 700, marginTop: 2 }}>
                        {p.priceAnnualNote}
                      </div>
                    )}
                    {p.noteBelowPrice && (
                      <p style={{ marginTop: 8, color: "#334155", fontSize: 12, lineHeight: 1.5 }}>{p.noteBelowPrice}</p>
                    )}
                  </div>

                  <div style={{ marginTop: 10, display: "flex", justifyContent: "center" }}>
                    <Link href={p.ctaHref} className="sl-link-btn gold">
                      GET STARTED
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Feature matrix (no heavy grid lines; light separators) */}
        <div
          style={{
            overflowX: "auto",
            border: "1px solid #e5e7eb",
            borderTop: "none",
            borderRadius: "0 0 14px 14px",
          }}
        >
          {SECTIONS.map((sec, si) => (
            <section key={sec.title}>
              {/* Section header */}
              <div
                style={{
                  background: "#f8fafc",
                  padding: "10px 12px",
                  borderTop: si === 0 ? "none" : "1px solid #e5e7eb",
                  borderBottom: "1px solid #e5e7eb",
                  fontWeight: 800,
                }}
              >
                {sec.title}
              </div>

              {/* Rows */}
              {sec.rows.map((row, ri) => (
                <div
                  key={row.key}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(220px, 1fr) repeat(4, minmax(180px, 1fr))",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 8px",
                    borderBottom: "1px solid #f1f5f9",
                    background: ri % 2 === 1 ? "#fff" : "#ffffff",
                  }}
                >
                  {/* Feature name (sticky on horizontal scroll) */}
                  <div
                    style={{
                      position: "sticky",
                      left: 0,
                      zIndex: 2,
                      background: "#fff",
                      paddingRight: 8,
                      fontWeight: 700,
                    }}
                    title={row.info || row.label}
                  >
                    {row.label}
                  </div>

                  {/* Plan cells */}
                  {planOrder.map((key) => (
                    <div key={key} style={{ display: "flex", justifyContent: "center" }}>
                      {cellContent(row.availability[key])}
                    </div>
                  ))}
                </div>
              ))}
            </section>
          ))}
        </div>
      </section>

      {/* Local styles for buttons & hovers */}
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
      `}</style>
    </main>
  );
}
