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
  {
    key: "coach",
    name: "College Coaches & Recruiters",
    tagline: "Build champions together",
    ctaHref: "/get-started?plan=coach",
    priceMonthly: "FREE",
    noteBelowPrice:
      "Access to player profiles, stats & metrics, contact info, videos and social media, and communication tools based on Player Plan. Coaches can filter and save players to watch lists, share and export lists across approved Coach Connections, and see full analytics dashboards on each player.",
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
  // ... (rest of SECTIONS unchanged)
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

  const planOrder: PlanKey[] = ["redshirt", "walkon", "allamerican", "team", "coach"];
  const planMap = useMemo(() => Object.fromEntries(PLANS.map((p) => [p.key, p])), []);

  return (
    <main style={{ color: "#0f172a" }}>
      {/* BILLING TOGGLE + TABLE */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 16px" }}>
        {/* Toggle */}
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

          <Link href="#coaches" className="sl-link-btn" style={{ whiteSpace: "nowrap" }}>
            College Coaches & Recruiters →
          </Link>
        </div>

        {/* Sticky plan headers */}
        {/* ... rest of component unchanged ... */}
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
