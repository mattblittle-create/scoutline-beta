"use client";
import React, { useMemo, useState } from "react";
import Link from "next/link";

// --- Demo data (swap this for your real dataset later) ---
type College = {
  name: string;
  url: string;
  region: string;     // e.g., "Southeast"
  state: string;      // e.g., "FL"
  division: string;   // e.g., "NCAA D1"
  conference: string; // e.g., "SEC"
};

const SAMPLE_COLLEGES: College[] = [
  { name: "Clemson University", url: "https://www.clemson.edu/", region: "Southeast", state: "SC", division: "NCAA D1", conference: "ACC" },
  { name: "University of Florida", url: "https://www.ufl.edu/", region: "Southeast", state: "FL", division: "NCAA D1", conference: "SEC" },
  { name: "University of Georgia", url: "https://www.uga.edu/", region: "Southeast", state: "GA", division: "NCAA D1", conference: "SEC" },
  { name: "University of North Carolina", url: "https://www.unc.edu/", region: "Southeast", state: "NC", division: "NCAA D1", conference: "ACC" },
  { name: "Boston College", url: "https://www.bc.edu/", region: "Northeast", state: "MA", division: "NCAA D1", conference: "ACC" },
  { name: "Duke University", url: "https://www.duke.edu/", region: "Southeast", state: "NC", division: "NCAA D1", conference: "ACC" },
  { name: "Auburn University", url: "https://www.auburn.edu/", region: "Southeast", state: "AL", division: "NCAA D1", conference: "SEC" },
  { name: "University of Alabama", url: "https://www.ua.edu/", region: "Southeast", state: "AL", division: "NCAA D1", conference: "SEC" },
];

function uniqSorted(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

export default function CollegeSearch() {
  const [query, setQuery] = useState("");
  const [regions, setRegions] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [divisions, setDivisions] = useState<string[]>([]);
  const [conferences, setConferences] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Build option lists from data
  const regionOptions = useMemo(() => uniqSorted(SAMPLE_COLLEGES.map(c => c.region)), []);
  const stateOptions = useMemo(() => uniqSorted(SAMPLE_COLLEGES.map(c => c.state)), []);
  const divisionOptions = useMemo(() => uniqSorted(SAMPLE_COLLEGES.map(c => c.division)), []);
  const conferenceOptions = useMemo(() => uniqSorted(SAMPLE_COLLEGES.map(c => c.conference)), []);

  // Filtered suggestions for the text input
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return uniqSorted(
      SAMPLE_COLLEGES
        .filter(c => c.name.toLowerCase().includes(q))
        .map(c => c.name)
    ).slice(0, 10);
  }, [query]);

  // Actual filtered result set
  const filtered = useMemo(() => {
    if (!query && regions.length === 0 && states.length === 0 && divisions.length === 0 && conferences.length === 0) {
      return [];
    }
    const q = query.trim().toLowerCase();
    return SAMPLE_COLLEGES.filter(c => {
      const matchesQuery = q ? c.name.toLowerCase().includes(q) : true;
      const matchesRegion = regions.length ? regions.includes(c.region) : true;
      const matchesState = states.length ? states.includes(c.state) : true;
      const matchesDivision = divisions.length ? divisions.includes(c.division) : true;
      const matchesConference = conferences.length ? conferences.includes(c.conference) : true;
      return matchesQuery && matchesRegion && matchesState && matchesDivision && matchesConference;
    });
  }, [query, regions, states, divisions, conferences]);

  function toggleValue(list: string[], value: string, setList: (v: string[]) => void) {
    setList(list.includes(value) ? list.filter(v => v !== value) : [...list, value]);
  }

  function clearAll() {
    setQuery("");
    setRegions([]);
    setStates([]);
    setDivisions([]);
    setConferences([]);
  }

  return (
    <section style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 16px", color: "#0f172a" }}>
      <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.15 }}>College Search</h1>
      <div style={{ height: 1, background: "#e5e7eb", margin: "12px 0 20px" }} />

      {/* Search row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr 1fr 1fr 1fr",
          gap: 12,
          alignItems: "start",
        }}
      >
        {/* Text search with suggestions */}
        <div style={{ position: "relative" }}>
          <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6 }}>
            Search by college name
          </label>
          <input
            type="text"
            placeholder="Start typing a college…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              outline: "none",
            }}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div
              style={{
                position: "absolute",
                zIndex: 10,
                left: 0,
                right: 0,
                top: "100%",
                marginTop: 6,
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
                maxHeight: 260,
                overflowY: "auto",
              }}
            >
              {suggestions.map((name) => (
                <button
                  key={name}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setQuery(name); setShowSuggestions(false); }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Multi-selects (simple pill checklists) */}
        <FilterColumn
          label="Region"
          options={regionOptions}
          selected={regions}
          onToggle={(v) => toggleValue(regions, v, setRegions)}
        />
        <FilterColumn
          label="State"
          options={stateOptions}
          selected={states}
          onToggle={(v) => toggleValue(states, v, setStates)}
        />
        <FilterColumn
          label="Division"
          options={divisionOptions}
          selected={divisions}
          onToggle={(v) => toggleValue(divisions, v, setDivisions)}
        />
        <FilterColumn
          label="Conference"
          options={conferenceOptions}
          selected={conferences}
          onToggle={(v) => toggleValue(conferences, v, setConferences)}
        />
      </div>

      {/* Clear filters */}
      <div style={{ marginTop: 12 }}>
        <button
          onClick={clearAll}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          Clear filters
        </button>
      </div>

      {/* Results (hidden until something is typed/selected) */}
      {filtered.length > 0 && (
        <>
          <div style={{ height: 1, background: "#e5e7eb", margin: "18px 0" }} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 12,
            }}
          >
            {filtered.map((c) => (
              <article
                key={c.name}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  background: "#fff",
                  padding: 14,
                  boxShadow: "0 6px 16px rgba(15,23,42,0.06)",
                }}
              >
                <h3 style={{ margin: "0 0 6px", fontSize: 18 }}>{c.name}</h3>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", color: "#64748b", fontSize: 12 }}>
                  <span>{c.region}</span>
                  <span>•</span>
                  <span>{c.state}</span>
                  <span>•</span>
                  <span>{c.division}</span>
                  <span>•</span>
                  <span>{c.conference}</span>
                </div>
                <div style={{ marginTop: 10 }}>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-block",
                      padding: "8px 12px",
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.96)",
                      color: "#0f172a",
                      textDecoration: "none",
                      border: "1px solid #e5e7eb",
                      fontWeight: 600,
                    }}
                  >
                    Visit Website
                  </a>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function FilterColumn({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6 }}>
        {label}
      </label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {options.map((opt) => {
          const active = selected.includes(opt);
          return (
            <button
              type="button"
              key={opt}
              onClick={() => onToggle(opt)}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: active ? "1px solid #ca9a3f" : "1px solid #e5e7eb",
                background: active ? "#fff7e6" : "#fff",
                color: active ? "#8a6b20" : "#0f172a",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
