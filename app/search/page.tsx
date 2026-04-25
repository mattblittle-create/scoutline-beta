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
  tuitionInState?: number | null;
  tuitionOutOfState?: number | null;
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

  const words = raw.split(" ").map((word) => {
    if (["NCAA", "NAIA", "NJCAA", "SEC", "ACC"].includes(word)) return word;
    if (/^D[123]$/.test(word)) return word;
    return word.charAt(0) + word.slice(1).toLowerCase();
  });

  return words.join(" ");
}

function money(value?: number | null) {
  if (value == null) return "—";
  return `$${value.toLocaleString()}`;
}

export default function CollegeSearchPage() {
  const [q, setQ] = useState("");
  const [state, setState] = useState("");
  const [region, setRegion] = useState("");
  const [control, setControl] = useState("");
  const [division, setDivision] = useState("");
  const [conference, setConference] = useState("");
  const [minTuition, setMinTuition] = useState("");
  const [maxTuition, setMaxTuition] = useState("");

  const [results, setResults] = useState<CollegeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // temporary: filters visible now so you can test/build;
  // later we can gate this with /api/auth/me
  const advancedFiltersEnabled = true;

  const hasAnySearch =
    q.trim().length >= 2 ||
    state ||
    region ||
    control ||
    division ||
    conference ||
    minTuition ||
    maxTuition;

  useEffect(() => {
    let cancelled = false;

    async function runSearch() {
      setError("");

      if (!hasAnySearch) {
        setResults([]);
        return;
      }

      try {
        setLoading(true);

        const params = new URLSearchParams();

        if (q.trim().length >= 2) params.set("q", q.trim());
        if (state) params.set("state", state);
        if (region) params.set("region", region);
        if (control) params.set("control", control);
        if (division) params.set("division", division);
        if (conference) params.set("conference", conference);
        if (minTuition) params.set("minTuition", minTuition);
        if (maxTuition) params.set("maxTuition", maxTuition);

        params.set("limit", "100");

        const res = await fetch(`/api/colleges/search?${params.toString()}`, {
          cache: "no-store",
        });

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
  }, [
    q,
    state,
    region,
    control,
    division,
    conference,
    minTuition,
    maxTuition,
    hasAnySearch,
  ]);

  const helperText = useMemo(() => {
    if (!hasAnySearch) return "Search by college name or use filters.";
    if (loading) return "Searching colleges...";
    return `${results.length} result${results.length === 1 ? "" : "s"} found.`;
  }, [hasAnySearch, loading, results.length]);

  function clearFilters() {
    setQ("");
    setState("");
    setRegion("");
    setControl("");
    setDivision("");
    setConference("");
    setMinTuition("");
    setMaxTuition("");
  }

  return (
    <main style={{ color: "#0f172a", fontFamily: "Arial, sans-serif" }}>
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "34px 16px 48px" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: "clamp(2rem, 5vw, 3.25rem)", fontWeight: 900 }}>
            College Search
          </h1>

          <p style={{ margin: "10px auto 0", maxWidth: 760, color: "#475569", fontSize: "1.05rem" }}>
            Search college programs, admissions links, and baseball info. Truth Fit recommendations
            are coming next.
          </p>
        </div>

        <div style={panelStyle}>
          <label htmlFor="college-search" style={labelStyle}>
            Search by college name
          </label>

          <input
            id="college-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Example: South Carolina"
            style={inputStyle}
          />

          {advancedFiltersEnabled && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 900, marginBottom: 10 }}>Advanced Filters</div>

              <div style={filterGridStyle}>
                <Field label="State">
                  <input value={state} onChange={(e) => setState(e.target.value.toUpperCase())} placeholder="SC" style={inputStyle} />
                </Field>

                <Field label="Region">
                  <select value={region} onChange={(e) => setRegion(e.target.value)} style={inputStyle}>
                    <option value="">Any</option>
                    <option value="NORTHEAST">Northeast</option>
                    <option value="MID_ATLANTIC">Mid-Atlantic</option>
                    <option value="SOUTHEAST">Southeast</option>
                    <option value="MIDWEST">Midwest</option>
                    <option value="SOUTHWEST">Southwest</option>
                    <option value="WEST">West</option>
                    <option value="PACIFIC">Pacific</option>
                  </select>
                </Field>

                <Field label="Public / Private">
                  <select value={control} onChange={(e) => setControl(e.target.value)} style={inputStyle}>
                    <option value="">Any</option>
                    <option value="PUBLIC">Public</option>
                    <option value="PRIVATE">Private</option>
                  </select>
                </Field>

                <Field label="Division">
                  <select value={division} onChange={(e) => setDivision(e.target.value)} style={inputStyle}>
                    <option value="">Any</option>
                    <option value="NCAA_D1">NCAA D1</option>
                    <option value="NCAA_D2">NCAA D2</option>
                    <option value="NCAA_D3">NCAA D3</option>
                    <option value="NAIA">NAIA</option>
                    <option value="NJCAA_D1">NJCAA D1</option>
                    <option value="NJCAA_D2">NJCAA D2</option>
                    <option value="NJCAA_D3">NJCAA D3</option>
                  </select>
                </Field>

                <Field label="Conference">
                  <input value={conference} onChange={(e) => setConference(e.target.value)} placeholder="SEC" style={inputStyle} />
                </Field>

                <Field label="Min Tuition">
                  <input value={minTuition} onChange={(e) => setMinTuition(e.target.value)} placeholder="0" inputMode="numeric" style={inputStyle} />
                </Field>

                <Field label="Max Tuition">
                  <input value={maxTuition} onChange={(e) => setMaxTuition(e.target.value)} placeholder="50000" inputMode="numeric" style={inputStyle} />
                </Field>
              </div>

              <button type="button" onClick={clearFilters} style={clearButtonStyle}>
                Clear Filters
              </button>
            </div>
          )}

          <div style={{ marginTop: 10, color: "#64748b", fontSize: 14 }}>{helperText}</div>
        </div>

        {error ? <div style={errorStyle}>{error}</div> : null}

        <div style={{ display: "grid", gap: 14 }}>
          {results.map((college) => {
            const baseball = college.baseballProgram;

            return (
              <article key={college.id} style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 900 }}>
                      {college.websiteUrl ? (
                        <a href={college.websiteUrl} target="_blank" rel="noreferrer" style={{ color: "#0f172a", textDecorationColor: "#caa042" }}>
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

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <span style={pillStyle}>{pretty(college.region)}</span>
                    <span style={pillStyle}>{pretty(college.control)}</span>
                    <span style={pillStyle}>{pretty(college.schoolType)}</span>
                  </div>
                </div>

                <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
                  <Info label="Nickname" value={baseball?.nickname || "—"} />
                  <Info label="Division" value={pretty(baseball?.division)} />
                  <Info label="Conference" value={baseball?.conference || "—"} />
                  <Info label="In-State Tuition" value={money(college.tuitionInState)} />
                  <Info label="Out-of-State Tuition" value={money(college.tuitionOutOfState)} />
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
                  {college.admissionsUrl ? (
                    <a href={college.admissionsUrl} target="_blank" rel="noreferrer" style={buttonStyle}>
                      Admissions
                    </a>
                  ) : null}

                  {baseball?.baseballWebsiteUrl ? (
                    <a href={baseball.baseballWebsiteUrl} target="_blank" rel="noreferrer" style={buttonStyle}>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 900, color: "#475569" }}>{label}</span>
      {children}
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: "1px solid #eef2f7", background: "#f8fafc", borderRadius: 12, padding: "10px 12px" }}>
      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>{label}</div>
      <div style={{ marginTop: 3, fontWeight: 900 }}>{value}</div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  boxShadow: "0 10px 28px rgba(15,23,42,0.08)",
  padding: 18,
  marginBottom: 18,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontWeight: 900,
  marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px 12px",
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  fontSize: 15,
  outline: "none",
};

const filterGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 12,
};

const clearButtonStyle: React.CSSProperties = {
  marginTop: 12,
  border: "1px solid #cbd5e1",
  background: "#f8fafc",
  borderRadius: 999,
  padding: "8px 12px",
  fontWeight: 900,
  cursor: "pointer",
};

const errorStyle: React.CSSProperties = {
  border: "1px solid #fecaca",
  background: "#fff1f2",
  color: "#991b1b",
  borderRadius: 12,
  padding: 14,
  marginBottom: 16,
  fontWeight: 700,
};

const cardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  background: "#ffffff",
  padding: 18,
  boxShadow: "0 8px 20px rgba(15,23,42,0.05)",
};

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