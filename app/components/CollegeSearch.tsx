"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

/** ------------------------------
 * Types & Demo Data (replace SAMPLE_COLLEGES with your real JSON later)
 * ------------------------------ */
type College = {
  name: string;
  website?: string;

  region: string;     // e.g., "Southeast"
  state: string;      // e.g., "FL"
  division: string;   // e.g., "NCAA D1"
  conference: string; // e.g., "SEC"

  type?: "Public" | "Private";
  enrollmentApprox?: number; // total headcount, approx
  campusType?: "Urban" | "Suburban" | "Rural" | "Research" | "Liberal Arts";

  tuitionApprox?: {
    inState?: number;
    outOfState?: number;
    international?: number;
  };

  scholarships?: {
    academic?: boolean;
    athletic?: boolean;
  };

  programsUrl?: string;       // academic programs
  athleticsUrl?: string;      // athletics site (baseball)
  campsUrl?: string;          // camps link
  questionnaireUrl?: string;  // recruiting questionnaire
};

const SAMPLE_COLLEGES: College[] = [
  {
    name: "Clemson University",
    website: "https://www.clemson.edu/",
    region: "Southeast",
    state: "SC",
    division: "NCAA D1",
    conference: "ACC",
    type: "Public",
    enrollmentApprox: 28000,
    campusType: "Suburban",
    tuitionApprox: { inState: 15458, outOfState: 39850, international: 39850 },
    scholarships: { academic: true, athletic: true },
    programsUrl: "https://www.clemson.edu/academics/programs/",
    athleticsUrl: "https://clemsontigers.com/sports/baseball/",
    campsUrl: "https://clemsontigers.com/camps/",
    questionnaireUrl: "https://clemsontigers.com/recruiting/",
  },
  {
    name: "University of Florida",
    website: "https://www.ufl.edu/",
    region: "Southeast",
    state: "FL",
    division: "NCAA D1",
    conference: "SEC",
    type: "Public",
    enrollmentApprox: 52000,
    campusType: "Urban",
    tuitionApprox: { inState: 6381, outOfState: 28658, international: 28658 },
    scholarships: { academic: true, athletic: true },
    programsUrl: "https://catalog.ufl.edu/UGRD/programs/",
    athleticsUrl: "https://floridagators.com/sports/baseball",
    campsUrl: "https://floridagators.com/camps",
    questionnaireUrl: "https://floridagators.com/sb_output.aspx?form=2",
  },
  {
    name: "Boston College",
    website: "https://www.bc.edu/",
    region: "Northeast",
    state: "MA",
    division: "NCAA D1",
    conference: "ACC",
    type: "Private",
    enrollmentApprox: 15000,
    campusType: "Urban",
    tuitionApprox: { inState: 68800, outOfState: 68800, international: 68800 },
    scholarships: { academic: true, athletic: true },
    programsUrl: "https://www.bc.edu/bc-web/academics/majors-minors.html",
    athleticsUrl: "https://bceagles.com/sports/baseball",
    campsUrl: "",
    questionnaireUrl: "",
  },
  {
    name: "University of Georgia",
    website: "https://www.uga.edu/",
    region: "Southeast",
    state: "GA",
    division: "NCAA D1",
    conference: "SEC",
    type: "Public",
    enrollmentApprox: 40000,
    campusType: "Suburban",
    tuitionApprox: { inState: 12280, outOfState: 31520, international: 31520 },
    scholarships: { academic: true, athletic: true },
    programsUrl: "https://www.uga.edu/academics/degree-programs/",
    athleticsUrl: "https://georgiadogs.com/sports/baseball",
    campsUrl: "https://georgiadogs.com/camps",
    questionnaireUrl: "",
  },
];

function uniqSorted(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}
function currency(n?: number) {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

/** ------------------------------
 * MultiSelect (custom dropdown with checkboxes + chips)
 * ------------------------------ */
function MultiSelect({
  label,
  options,
  selected,
  setSelected,
  placeholder = "Select…",
}: {
  label: string;
  options: string[];
  selected: string[];
  setSelected: (next: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [focusIndex, setFocusIndex] = useState<number>(-1);

  // Close on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      const t = e.target as Node;
      if (btnRef.current?.contains(t)) return;
      if (listRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const toggleValue = (v: string) => {
    setSelected(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);
  };

  const displayText =
    selected.length === 0 ? placeholder : selected.slice(0, 3).join(", ") + (selected.length > 3 ? ` +${selected.length - 3}` : "");

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      setOpen(true);
      setFocusIndex(0);
      return;
    }
    if (!open) return;
    if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusIndex(i => Math.min(options.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusIndex(i => Math.max(0, i - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const v = options[focusIndex];
      if (v) toggleValue(v);
    }
  };

  return (
    <div style={{ position: "relative" }}>
      <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6 }}>{label}</label>

      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
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
        {displayText}
      </button>

      {open && (
        <div
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          style={{
            position: "absolute",
            zIndex: 30,
            left: 0,
            right: 0,
            top: "100%",
            marginTop: 6,
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
            maxHeight: 280,
            overflowY: "auto",
            padding: 6,
          }}
          onKeyDown={onKeyDown}
        >
          {options.map((opt, idx) => {
            const active = selected.includes(opt);
            const highlighted = idx === focusIndex;
            return (
              <div
                key={opt}
                role="option"
                aria-selected={active}
                onMouseEnter={() => setFocusIndex(idx)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => toggleValue(opt)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  borderRadius: 8,
                  cursor: "pointer",
                  background: highlighted ? "rgba(0,0,0,0.06)" : "transparent",
                }}
              >
                <input type="checkbox" checked={active} readOnly />
                <span>{opt}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Selected chips under trigger */}
      {selected.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          {selected.map((v) => (
            <span
              key={v}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid #e5e7eb",
                background: "#fff",
                fontSize: 12,
              }}
            >
              {v}
              <button
                type="button"
                onClick={() => setSelected(selected.filter(x => x !== v))}
                aria-label={`Remove ${v}`}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 14,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** ------------------------------
 * Main Component
 * ------------------------------ */
export default function CollegeSearch() {
  // Text query & suggestions
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Filters
  const [regions, setRegions] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [divisions, setDivisions] = useState<string[]>([]);
  const [conferences, setConferences] = useState<string[]>([]);

  // Build option lists from data
  const regionOptions = useMemo(() => uniqSorted(SAMPLE_COLLEGES.map(c => c.region)), []);
  const stateOptions = useMemo(() => uniqSorted(SAMPLE_COLLEGES.map(c => c.state)), []);
  const divisionOptions = useMemo(() => uniqSorted(SAMPLE_COLLEGES.map(c => c.division)), []);
  const conferenceOptions = useMemo(() => uniqSorted(SAMPLE_COLLEGES.map(c => c.conference)), []);

  // Suggestions for the text input (darker hover)
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return uniqSorted(
      SAMPLE_COLLEGES.filter(c => c.name.toLowerCase().includes(q)).map(c => c.name)
    ).slice(0, 12);
  }, [query]);

  // Filtered result set (nothing shown until something is typed/selected)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const isEmpty =
      !q && regions.length === 0 && states.length === 0 && divisions.length === 0 && conferences.length === 0;
    if (isEmpty) return [];

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
  }

  return (
    <section style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 16px", color: "#0f172a" }}>
      <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.15 }}>College Search</h1>
      <div style={{ height: 1, background: "#e5e7eb", margin: "12px 0 20px" }} />

      {/* Search row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr 1fr 1fr 1fr",
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
                zIndex: 20,
                left: 0,
                right: 0,
                top: "100%",
                marginTop: 6,
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
                maxHeight: 280,
                overflowY: "auto",
              }}
            >
              {suggestions.map((name) => (
                <button
                  key={name}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setQuery(name);
                    setShowSuggestions(false);
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(0,0,0,0.10)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Multi-select dropdowns */}
        <MultiSelect label="Region" options={regionOptions} selected={regions} setSelected={setRegions} />
        <MultiSelect label="State" options={stateOptions} selected={states} setSelected={setStates} />
        <MultiSelect label="Division" options={divisionOptions} selected={divisions} setSelected={setDivisions} />
        <MultiSelect label="Conference" options={conferenceOptions} selected={conferences} setSelected={setConferences} />
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

      {/* Results */}
      {filtered.length > 0 && (
        <>
          <div style={{ height: 1, background: "#e5e7eb", margin: "18px 0" }} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
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
                {/* Title + type */}
                <h3 style={{ margin: "0 0 4px", fontSize: 18 }}>
                  {c.name}
                  {c.type ? (
                    <span style={{ fontSize: 12, fontWeight: 500, color: "#64748b", marginLeft: 8 }}>
                      ({c.type})
                    </span>
                  ) : null}
                </h3>

                {/* Meta line: region • state • division • conference */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", color: "#64748b", fontSize: 12 }}>
                  <span>{c.region}</span>
                  <span>•</span>
                  <span>{c.state}</span>
                  <span>•</span>
                  <span>{c.division}</span>
                  <span>•</span>
                  <span>{c.conference}</span>
                </div>

                {/* Enrollment / campus / tuition / scholarships */}
                <dl style={{ margin: "10px 0 0", fontSize: 13, color: "#334155" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <dt style={{ color: "#64748b" }}>Enrollment (approx)</dt>
                    <dd>{c.enrollmentApprox ? c.enrollmentApprox.toLocaleString() : "—"}</dd>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <dt style={{ color: "#64748b" }}>Campus</dt>
                    <dd>{c.campusType ?? "—"}</dd>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <dt style={{ color: "#64748b" }}>Tuition (approx)</dt>
                    <dd>
                      In-State {currency(c.tuitionApprox?.inState)} · Out-of-State {currency(c.tuitionApprox?.outOfState)} ·
                      International {currency(c.tuitionApprox?.international)}
                    </dd>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <dt style={{ color: "#64748b" }}>Scholarships</dt>
                    <dd>
                      Academic {c.scholarships?.academic ? "✅" : "✖"} · Athletic {c.scholarships?.athletic ? "✅" : "✖"}
                    </dd>
                  </div>
                </dl>

                {/* Links — only render if the field exists */}
                <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {c.website && (
                    <a
                      href={c.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={linkBtnStyle}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#f8fafc")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.backgroundColor = "rgba(255,255,255,0.96)")}
                    >
                      Website
                    </a>
                  )}
                  {c.programsUrl && (
                    <a
                      href={c.programsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={linkBtnStyle}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#f8fafc")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.backgroundColor = "rgba(255,255,255,0.96)")}
                    >
                      Academic Programs
                    </a>
                  )}
                  {c.athleticsUrl && (
                    <a
                      href={c.athleticsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={linkBtnStyle}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#f8fafc")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.backgroundColor = "rgba(255,255,255,0.96)")}
                    >
                      Athletics
                    </a>
                  )}
                  {c.campsUrl && (
                    <a
                      href={c.campsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={linkBtnStyle}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#f8fafc")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.backgroundColor = "rgba(255,255,255,0.96)")}
                    >
                      Camps
                    </a>
                  )}
                  {c.questionnaireUrl && (
                    <a
                      href={c.questionnaireUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={linkBtnStyle}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#f8fafc")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.backgroundColor = "rgba(255,255,255,0.96)")}
                    >
                      Recruiting Questionnaire
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

const linkBtnStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "8px 12px",
  borderRadius: 10,
  background: "rgba(255,255,255,0.96)",
  color: "#0f172a",
  textDecoration: "none",
  border: "1px solid #e5e7eb",
  fontWeight: 600,
  transition: "transform .2s ease, box-shadow .2s ease, background-color .2s ease",
};
