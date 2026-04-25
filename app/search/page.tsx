// app/search/page.tsx

"use client";

import React, { useEffect, useMemo, useState } from "react";

type CollegeResult = {
  id: string;
  name: string;
  slug: string;
  websiteUrl?: string | null;
  admissionsUrl?: string | null;
  city?: string | null;
  state?: string | null;
  region?: string | null;
  control?: string | null;
  schoolType?: string | null;
  baseballProgram?: {
    division?: string | null;
    conference?: string | null;
    nickname?: string | null;
    baseballWebsiteUrl?: string | null;
  } | null;
};

function pretty(value?: string | null) {
  if (!value) return "—";

  const raw = value.replace(/_/g, " ").toUpperCase();

  const fixes: Record<string, string> = {
    NCAA: "NCAA",
    NAIA: "NAIA",
    NJCAA: "NJCAA",
    SEC: "SEC",
    ACC: "ACC",
    BIG: "Big",
    PAC: "Pac",
    SUN: "Sun",
  };

  // Handle common patterns like NCAA_D1 → NCAA D1
  const words = raw.split(" ").map((word) => {
    if (fixes[word]) return fixes[word];

    // Keep D1, D2, etc.
    if (/^D[123]$/.test(word)) return word;

    return word.charAt(0) + word.slice(1).toLowerCase();
  });

  return words.join(" ");
}

export default function CollegeSearchPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CollegeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSearch = q.trim().length >= 2;

  useEffect(() => {
    let cancelled = false;

    async function runSearch() {
      setError("");

      if (!canSearch) {
        setResults([]);
        return;
      }

      try {
        setLoading(true);

        const res = await fetch(
          `/api/colleges/search?q=${encodeURIComponent(q.trim())}&limit=50`,
          { cache: "no-store" }
        );

        const data = await res.json();

        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || "Search failed.");
        }

        if (!cancelled) {
          setResults(data.results || []);
        }
      } catch (err) {
        console.error("COLLEGE_SEARCH_PAGE_ERROR", err);
        if (!cancelled) {
          setError("Could not search colleges. Please try again.");
          setResults([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    const t = window.setTimeout(runSearch, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [q, canSearch]);

  const helperText = useMemo(() => {
    if (!q.trim()) return "Search by college name to explore ScoutLine’s college database.";
    if (!canSearch) return "Type at least 2 characters to search.";
    if (loading) return "Searching colleges...";
    return `${results.length} result${results.length === 1 ? "" : "s"} found.`;
  }, [q, canSearch, loading, results.length]);

  return (
    <main style={{ color: "#0f172a", fontFamily: "Arial, sans-serif" }}>
      <section
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "34px 16px 48px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(2rem, 5vw, 3.25rem)",
              fontWeight: 900,
              letterSpacing: "-0.04em",
            }}
          >
            College Search
          </h1>

          <p
            style={{
              margin: "10px auto 0",
              maxWidth: 720,
              color: "#475569",
              fontSize: "1.05rem",
              lineHeight: 1.45,
            }}
          >
            Search college programs, admissions links, and baseball info. Advanced filters and
            Truth Fit recommendations are coming for ScoutLine users.
          </p>
        </div>

        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 18,
            boxShadow: "0 10px 28px rgba(15,23,42,0.08)",
            padding: 18,
            marginBottom: 18,
          }}
        >
          <label
            htmlFor="college-search"
            style={{
              display: "block",
              fontWeight: 900,
              marginBottom: 8,
            }}
          >
            Search by college name
          </label>

          <input
            id="college-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Example: South Carolina"
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: "13px 14px",
              borderRadius: 12,
              border: "1px solid #cbd5e1",
              fontSize: 16,
              outline: "none",
            }}
          />

          <div style={{ marginTop: 8, color: "#64748b", fontSize: 14 }}>
            {helperText}
          </div>
        </div>

        {error ? (
          <div
            style={{
              border: "1px solid #fecaca",
              background: "#fff1f2",
              color: "#991b1b",
              borderRadius: 12,
              padding: 14,
              marginBottom: 16,
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        ) : null}

        <div style={{ display: "grid", gap: 14 }}>
          {results.map((college) => {
            const baseball = college.baseballProgram;

            return (
              <article
                key={college.id}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 18,
                  background: "#ffffff",
                  padding: 18,
                  boxShadow: "0 8px 20px rgba(15,23,42,0.05)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 14,
                    flexWrap: "wrap",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 900 }}>
                      {college.websiteUrl ? (
                        <a
                          href={college.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "#0f172a", textDecorationColor: "#caa042" }}
                        >
                          {college.name}
                        </a>
                      ) : (
                        college.name
                      )}
                    </h2>

                    <div style={{ marginTop: 6, color: "#475569", fontWeight: 700 }}>
                      {[college.city, college.state].filter(Boolean).join(", ") || "Location TBD"}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      justifyContent: "flex-end",
                    }}
                  >
                    <span style={pillStyle}>{pretty(college.region)}</span>
                    <span style={pillStyle}>{pretty(college.control)}</span>
                    <span style={pillStyle}>{pretty(college.schoolType)}</span>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 16,
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 10,
                  }}
                >
                  <Info label="Nickname" value={baseball?.nickname || "—"} />
                  <Info label="Division" value={pretty(baseball?.division)} />
                  <Info label="Conference" value={baseball?.conference || "—"} />
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
                  {college.admissionsUrl ? (
                    <a href={college.admissionsUrl} target="_blank" rel="noreferrer" style={buttonStyle}>
                      Admissions
                    </a>
                  ) : null}

                  {baseball?.baseballWebsiteUrl ? (
                    <a
                      href={baseball.baseballWebsiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={buttonStyle}
                    >
                      Baseball Program
                    </a>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: "1px solid #eef2f7",
        background: "#f8fafc",
        borderRadius: 12,
        padding: "10px 12px",
      }}
    >
      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>{label}</div>
      <div style={{ marginTop: 3, fontWeight: 900 }}>{value}</div>
    </div>
  );
}

const pillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 900,
  color: "#334155",
};

const buttonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  padding: "9px 13px",
  background: "#caa042",
  color: "#0f172a",
  textDecoration: "none",
  fontWeight: 900,
  border: "1px solid #caa042",
};