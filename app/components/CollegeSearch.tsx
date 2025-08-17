"use client";
import React, { useMemo, useState, useRef, useEffect } from "react";
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
  const [highlightIndex, setHighlightIndex] = useState(-1);

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

  function clearAll() {
    setQuery("");
    setRegions([]);
    setStates([]);
    setDivisions([]);
    setConferences([]);
    setHighlightIndex(-1);
  }

  const inputRef = useRef<HTMLInputElement | null>(null);

  // Handle keyboard navigation in suggestions
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      if (highlightIndex >= 0 && highlightIndex < suggestions.length) {
        setQuery(suggestions[highlightIndex]);
        setShowSuggestions(false);
        setHighlightIndex(-1);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setHighlightIndex(-1);
    }
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
            Search by College Name
          </label>
          <input
            ref={inputRef}
            type="text"
            placeholder="Start typing a college…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setHighlightIndex(-1); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            onKeyDown={onKeyDown}
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
              {suggestions.map((name, idx) => (
                <button
                  key={name}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setQuery(name); setShowSuggestions(false); setHighlightIndex(-1); }}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    background: idx === highlightIndex ? "#f6f7fb" : "transparent",
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

        {/* Multi-select dropdowns */}
        <MultiSelectDropdown
          label="Region"
          options={regionOptions}
          selected={regions}
          setSelected={setRegions}
        />
        <MultiSelectDropdown
          label="State"
          options={stateOptions}
          selected={states}
          setSelected={setStates}
        />
        <MultiSelectDropdown
          label="Division"
          options={divisionOptions}
          selected={divisions}
          setSelected={setDivisions}
        />
        <MultiSelectDropdown
          label="Conference"
          options={conferenceOptions}
          selected={conferences}
          setSelected={setConferences}
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

/** Multi-select dropdown with checkboxes (no external deps) */
function MultiSelectDropdown({
  label,
  options,
  selected,
  setSelected,
}: {
  label: string;
  options: string[];
  selected: string[];
  setSelected: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function toggleValue(value: string) {
    setSelected(
      selected.includes(value)
        ? selected.filter(v => v !== value)
        : [...selected, value]
    );
  }

  const summary =
    selected.length === 0
      ? "Any"
      : selected.length <= 2
      ? selected.join(", ")
      : `${selected.length} selected`;

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6 }}>
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "10px 12px",
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          background: "#fff",
          cursor: "pointer",
        }}
      >
        {summary}
        <span style={{ float: "right", opacity: 0.6 }}>▾</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            zIndex: 20,
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 6,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
            maxHeight: 260,
            overflowY: "auto",
            padding: 8,
          }}
        >
          {options.map((opt) => {
            const active = selected.includes(opt);
            return (
              <label
                key={opt}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 8px",
                  borderRadius: 8,
                  background: active ? "#fff7e6" : "transparent",
                  color: active ? "#8a6b20" : "#0f172a",
                  border: active ? "1px solid #f3e2b7" : "1px solid transparent",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggleValue(opt)}
                />
                <span>{opt}</span>
              </label>
            );
          })}
          {options.length === 0 && (
            <div style={{ padding: 8, color: "#64748b", fontSize: 14 }}>
              No options
            </div>
          )}
        </div>
      )}
    </div>
  );
}
