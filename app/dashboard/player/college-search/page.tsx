// app/dashboard/player/college-search/paget.tsx

"use client";

import Link from "next/link";
import React from "react";

export default function PlayerCollegeSearchPage() {
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
              College Search
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
              ScoutLine’s College Search database will help players explore
              schools based on academics, baseball fit, campus experience, cost,
              and recruiting opportunities.
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
            ← Back to Dashboard
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
              Advanced Filters
            </div>

            <div
              style={{
                color: "#475569",
                lineHeight: 1.5,
                fontSize: 14,
              }}
            >
              Search by region, division, conference, tuition, majors, student
              life, admissions profile, and baseball program fit.
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
              School Profiles
            </div>

            <div
              style={{
                color: "#475569",
                lineHeight: 1.5,
                fontSize: 14,
              }}
            >
              Explore detailed college snapshots including academics, campus
              environment, roster needs, and recruiting insights.
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
              Saved Targets
            </div>

            <div
              style={{
                color: "#475569",
                lineHeight: 1.5,
                fontSize: 14,
              }}
            >
              Build and manage a personalized target school list for your
              recruiting journey.
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 28,
            padding: 18,
            borderRadius: 16,
            background: "#ecfeff",
            border: "1px solid #a5f3fc",
            color: "#155e75",
            fontWeight: 700,
            lineHeight: 1.6,
          }}
        >
          ScoutLine is building this database to help families make smarter,
          better-informed recruiting and college decisions with confidence.
        </div>
      </section>
    </main>
  );
}