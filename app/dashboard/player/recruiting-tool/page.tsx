// app/dashboard/player/recruiting-tool/page.tsx

"use client";

import Link from "next/link";
import React from "react";

export default function PlayerRecruitingToolPage() {
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "8px 0 40px" }}>
      <section
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 20,
          padding: 28,
          background: "#ffffff",
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 24,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "2rem",
                fontWeight: 900,
                color: "#0f172a",
              }}
            >
              Recruiting Tool
            </h1>

            <p
              style={{
                marginTop: 10,
                marginBottom: 0,
                color: "#475569",
                lineHeight: 1.6,
                maxWidth: 700,
              }}
            >
              ScoutLine’s Recruiting Tool will help players better understand
              college fit, recruiting opportunities, skill gaps, division-level
              benchmarks, and where their profile best matches current college
              recruiting needs.
            </p>
          </div>

          <Link
            href="/dashboard/player"
            style={{
              textDecoration: "none",
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              background: "#ffffff",
              color: "#0f172a",
              fontWeight: 800,
            }}
          >
<Link href="/dashboard/player" style={backToDashboardStyle}>
  Back to Dashboard
</Link>
          </Link>
        </div>

        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          }}
        >
          <div
            style={{
              borderRadius: 16,
              padding: 20,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: "#64748b",
                marginBottom: 8,
              }}
            >
              Coming Soon
            </div>

            <div
              style={{
                fontSize: 20,
                fontWeight: 900,
                color: "#0f172a",
                marginBottom: 10,
              }}
            >
              Truth / Fit Analysis
            </div>

            <div
              style={{
                color: "#475569",
                lineHeight: 1.5,
                fontSize: 14,
              }}
            >
              Compare player academics, metrics, stats, and position data
              against college recruiting benchmarks.
            </div>
          </div>

          <div
            style={{
              borderRadius: 16,
              padding: 20,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: "#64748b",
                marginBottom: 8,
              }}
            >
              Coming Soon
            </div>

            <div
              style={{
                fontSize: 20,
                fontWeight: 900,
                color: "#0f172a",
                marginBottom: 10,
              }}
            >
              Opportunity Matching
            </div>

            <div
              style={{
                color: "#475569",
                lineHeight: 1.5,
                fontSize: 14,
              }}
            >
              Identify schools where your current profile best aligns with
              recruiting needs and roster opportunities.
            </div>
          </div>

          <div
            style={{
              borderRadius: 16,
              padding: 20,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: "#64748b",
                marginBottom: 8,
              }}
            >
              Coming Soon
            </div>

            <div
              style={{
                fontSize: 20,
                fontWeight: 900,
                color: "#0f172a",
                marginBottom: 10,
              }}
            >
              Development Priorities
            </div>

            <div
              style={{
                color: "#475569",
                lineHeight: 1.5,
                fontSize: 14,
              }}
            >
              Highlight the next most impactful areas for improvement to boost
              recruiting visibility.
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 28,
            padding: 18,
            borderRadius: 16,
            background: "#e0f2fe",
            border: "1px solid #bae6fd",
            color: "#0c4a6e",
            fontWeight: 700,
            lineHeight: 1.6,
          }}
        >
          ScoutLine is building this tool to help players focus on realistic,
          data-backed recruiting opportunities and maximize development where it
          matters most.
        </div>
      </section>
    </main>
  );
}

const backToDashboardStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  padding: "9px 13px",
  background: "#0ea5e9",
  color: "#ffffff",
  textDecoration: "none",
  fontWeight: 900,
  border: "1px solid #0ea5e9",
};