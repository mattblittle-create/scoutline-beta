"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type College = {
  name: string;
  state: string;
  region: string;
  division: string;
  conference: string;
  website: string;
};

export default function RecruitingJourneySearch() {
  const [allColleges, setAllColleges] = useState<College[]>([]);
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [division, setDivision] = useState("");
  const [conference, setConference] = useState("");
  const [showTypeahead, setShowTypeahead] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);

  // Load local JSON (static file) at runtime
  useEffect(() => {
    fetch("/colleges.json")
      .then((r) => r.json())
      .then((data: College[]) => setAllColleges(data))
      .catch(() => setAllColleges([]));
  }, []);

  // Unique lists for filters (derived from data)
  const regions = useMemo(
    () =>
      Array.from(new Set(allColleges.map((c) => c.region))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [allColleges]
  );
  const states = useMemo(
    () =>
      Array.from(new Set(allColleges.map((c) => c.state))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [allColleges]
  );
  const divisions = useMemo(
    () =>
      Array.from(new Set(allColleges.map((c) => c.division))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [allColleges]
  );
  const conferences = useMemo(
    () =>
      Array.from(new Set(allColleges.map((c) => c.conference))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [allColleges]
  );

  // Filtering logic
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allColleges
      .filter((c) => (region ? c.region === region : true))
      .filter((c) => (stateCode ? c.state === stateCode : true))
      .filter((c) => (division ? c.division === division : true))
      .filter((c) => (conference ? c.conference === conference : true))
      .filter((c) => (q ? c.name.toLowerCase().includes(q) : true))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allColleges, query, region, stateCode, division, conference]);

  // Typeahead suggestions (only name-driven; independent of filters)
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allColleges
      .filter((c) => c.name.toLowerCase().startsWith(q))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 12);
  }, [allColleges, query]);

  function clearFilters() {
    setRegion("");
    setStateCode("");
    setDivision("");
    setConference("");
  }

  return (
    <section
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "24px 16px",
        color: "#0f172a",
      }}
    >
      <h2 style={{ margin: 0, fontSize: 24 }}>Explore college programs</h2>
      <div style={{ height: 1, background: "#e5e7eb", margin: "12px 0 18px" }} />

      {/* Search + typeahead */}
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowTypeahead(true)}
          onBlur={() => setTimeout(() => setShowTypeahead(false), 150)} // small delay so clicks register
          placeholder="Search by school name…"
          aria-label="Search by school name"
          style={{
            width: "100%",
            padding: "12px 14px",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            outline: "none",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
          }}
        />

        {showTypeahead && suggestions.length > 0 && (
          <div
            role="listbox"
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderTop: "none",
              borderRadius: "0 0 10px 10px",
              boxShadow: "0 12px 20px rgba(0,0,0,0.06)",
              zIndex: 30,
              maxHeight: 320,
              overflowY: "auto",
            }}
          >
            {suggestions.map((s) => (
              <button
                key={s.name}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setQuery(s.name);
                  setShowTypeahead(false);
                  inputRef.current?.blur();
                }}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  border: "none",
                  background: "white",
                  cursor: "pointer",
                }}
              >
                <span>{s.name}</span>
                <span style={{ color: "#64748b", fontSize: 12 }}>
                  {s.division} · {s.conference}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: 12,
          marginTop: 14,
        }}
      >
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          aria-label="Filter by region"
          style={selectStyle}
        >
          <option value="">Region (any)</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <select
          value={stateCode}
          onChange={(e) => setStateCode(e.target.value)}
          aria-label="Filter by state"
          style={selectStyle}
        >
          <option value="">State (any)</option>
          {states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={division}
          onChange={(e) => setDivision(e.target.value)}
          aria-label="Filter by division"
          style={selectStyle}
        >
          <option value="">Division (any)</option>
          {divisions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <select
          value={conference}
          onChange={(e) => setConference(e.target.value)}
          aria-label="Filter by conference"
          style={selectStyle}
        >
          <option value="">Conference (any)</option>
          {conferences.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <button
          onClick={clearFilters}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            background: "#fff",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Clear
        </button>
      </div>

      {/* Results */}
      <div
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 12,
        }}
      >
        {filtered.map((c) => (
          <a
            key={c.name}
            href={c.website}
            target="_blank"
            rel="noopener noreferrer"
            style={cardStyle}
          >
            <div style={{ fontWeight: 700 }}>{c.name}</div>
            <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
              {c.division} · {c.conference}
            </div>
            <div style={{ color: "#64748b", fontSize: 12, marginTop: 2 }}>
              {c.region} · {c.state}
            </div>
          </a>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div
          style={{
            marginTop: 14,
            color: "#64748b",
            fontSize: 14,
          }}
        >
          No matching programs yet. Try a different name or adjust the filters.
        </div>
      )}
    </section>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  cursor: "pointer",
};

const cardStyle: React.CSSProperties = {
  display: "block",
  padding: 14,
  borderRadius: 12,
  background: "#fff",
  border: "1px solid #e5e7eb",
  textDecoration: "none",
  color: "#0f172a",
  boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
  transition: "transform .2s ease, box-shadow .2s ease, border-color .2s ease",
} as const;
