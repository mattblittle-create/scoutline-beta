"use client";

import React, { useMemo, useRef, useState, useEffect } from "react";
import Link from "next/link";

// -------------------------------------------------------------
// Types & Sample Data (replace with your JSON later)
// -------------------------------------------------------------
type College = {
  name: string;
  url: string;
  region: string;
  state: string;
  division: string;
  conference: string;

  // Extra detail fields
  type?: "Public" | "Private";
  enrollmentApprox?: number; // as integer
  campusType?: "Urban" | "Suburban" | "Rural" | "Research" | "Liberal Arts";
  tuitionInState?: number;       // per year USD
  tuitionOutState?: number;      // per year USD
  tuitionInternational?: number; // per year USD
  scholarshipAcademic?: boolean;
  scholarshipAthletic?: boolean;

  // Optional deep links
  programsUrl?: string;       // academic programs
  baseballUrl?: string;       // baseball team page
  campsUrl?: string;          // camps page
  questionnaireUrl?: string;  // recruiting questionnaire
};

const SAMPLE_COLLEGES: College[] = [
  {
    name: "Clemson University",
    url: "https://www.clemson.edu/",
    region: "Southeast",
    state: "SC",
    division: "NCAA D1",
    conference: "ACC",
    type: "Public",
    enrollmentApprox: 27000,
    campusType: "Suburban",
    tuitionInState: 15958,
    tuitionOutState: 40054,
    tuitionInternational: 40054,
    scholarshipAcademic: true,
    scholarshipAthletic: true,
    programsUrl: "https://www.clemson.edu/academics/programs.html",
    baseballUrl: "https://clemsontigers.com/sports/baseball/",
    campsUrl: "https://clemsontigers.com/camps/",
    questionnaireUrl:
      "https://clemsontigers.com/sports/2020/8/6/baseball-recruiting-questionnaire.aspx",
  },
  {
    name: "University of Florida",
    url: "https://www.ufl.edu/",
    region: "Southeast",
    state: "FL",
    division: "NCAA D1",
    conference: "SEC",
    type: "Public",
    enrollmentApprox: 57000,
    campusType: "Urban",
    tuitionInState: 6380,
    tuitionOutState: 28658,
    tuitionInternational: 28658,
    scholarshipAcademic: true,
    scholarshipAthletic: true,
    programsUrl: "https://catalog.ufl.edu/undergraduate/majors/",
    baseballUrl: "https://floridagators.com/sports/baseball",
    campsUrl: "https://floridagators.com/sports/2022/5/3/camps.aspx",
  },
  {
    name: "Duke University",
    url: "https://www.duke.edu/",
    region: "Southeast",
    state: "NC",
    division: "NCAA D1",
    conference: "ACC",
    type: "Private",
    enrollmentApprox: 17000,
    campusType: "Urban",
    tuitionInState: 66600,
    tuitionOutState: 66600,
    tuitionInternational: 66600,
    scholarshipAcademic: true,
    scholarshipAthletic: true,
    programsUrl: "https://trinity.duke.edu/undergraduate/majors",
    baseballUrl: "https://goduke.com/sports/baseball",
    campsUrl: "https://goduke.com/sports/2018/6/8/211700262.aspx",
    questionnaireUrl: "https://recruiting.dukeathletics.com/",
  },
  {
    name: "Boston College",
    url: "https://www.bc.edu/",
    region: "Northeast",
    state: "MA",
    division: "NCAA D1",
    conference: "ACC",
    type: "Private",
    enrollmentApprox: 14800,
    campusType: "Urban",
    tuitionInState: 68900,
    tuitionOutState: 68900,
    tuitionInternational: 68900,
    scholarshipAcademic: true,
    scholarshipAthletic: true,
    programsUrl:
      "https://www.bc.edu/bc-web/schools/mcas/undergraduate/majors-minors.html",
    baseballUrl: "https://bceagles.com/sports/baseball",
  },
  {
    name: "Auburn University",
    url: "https://www.auburn.edu/",
    region: "Southeast",
    state: "AL",
    division: "NCAA D1",
    conference: "SEC",
    type: "Public",
    enrollmentApprox: 32000,
    campusType: "Suburban",
    tuitionInState: 12000,
    tuitionOutState: 32400,
    tuitionInternational: 32400,
    scholarshipAcademic: true,
    scholarshipAthletic: true,
    programsUrl: "https://www.auburn.edu/majors/",
    baseballUrl: "https://auburntigers.com/sports/baseball",
    campsUrl: "https://auburntigers.com/sports/2018/6/6/camps.aspx",
  },
];

// -------------------------------------------------------------
// Utilities
// -------------------------------------------------------------
function uniqSorted(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function formatUSD(n?: number) {
  if (n == null) return "—";
  try {
    return `$${n.toLocaleString()}`;
  } catch {
    return `$${n}`;
  }
}

const check = "✓";
const cross = "✕";

// -------------------------------------------------------------
// MultiSelectDropdown (keyboard-friendly)
// -------------------------------------------------------------
type MultiSelectProps = {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
};

function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  placeholder = "Select…",
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  // Keyboard support on trigger
  function onTriggerKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen((v) => !v);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setTimeout(() => {
        const first = menuRef.current?.querySelector<HTMLButtonElement>(
          '[data-option="true"]'
        );
        first?.focus();
      }, 0);
    }
  }

  function toggle(val: string) {
    const next = selected.includes(val)
      ? selected.filter((v) => v !== val)
      : [...selected, val];
    onChange(next);
  }

  return (
    <div>
      <label
        style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6 }}
      >
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <button
          ref={btnRef}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          onKeyDown={onTriggerKey}
          style={{
            width: "100%",
            padding: "10px 12px",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            background: "#fff",
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          {selected.length > 0 ? selected.join(", ") : placeholder}
        </button>

        {open && (
          <div
            ref={menuRef}
            role="listbox"
            tabIndex={-1}
            style={{
              position: "absolute",
              zIndex: 20,
              left: 0,
              right: 0,
              marginTop: 6,
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
              maxHeight: 280,
              overflowY: "auto",
              padding: 6,
            }}
          >
            {options.map((opt) => {
              const active = selected.includes(opt);
              return (
                <button
                  key={opt}
                  data-option="true"
                  onClick={() => toggle(opt)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setOpen(false);
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      const next =
                        (e.currentTarget.nextSibling as HTMLButtonElement) || null;
                      next?.focus();
                    }
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      const prev =
                        (e.currentTarget.previousSibling as HTMLButtonElement) ||
                        null;
                      prev?.focus();
                    }
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 10px",
                    border: "none",
                    borderRadius: 8,
                    background: active ? "#fff7e6" : "transparent",
                    borderLeft: active ? "3px solid #ca9a3f" : "3px solid transparent",
                    cursor: "pointer",
                    outline: "none",
                  }}
                >
                  {active ? "☑ " : "☐ "} {opt}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {selected.map((v) => (
            <span
              key={v}
              style={{
                padding: "4px 8px",
                borderRadius: 999,
                border: "1px solid #e5e7eb",
                background: "#f8fafc",
                fontSize: 12,
              }}
            >
              {v}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// Main Component
// -------------------------------------------------------------
export default function CollegeSearch() {
  const [query, setQuery] = useState("");
  const [regions, setRegions] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [divisions, setDivisions] = useState<string[]>([]);
  const [conferences, setConferences] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Options derived from data
  const regionOptions = useMemo(
    () => uniqSorted(SAMPLE_COLLEGES.map((c) => c.region)),
    []
  );
  const stateOptions = useMemo(
    () => uniqSorted(SAMPLE_COLLEGES.map((c) => c.state)),
    []
  );
  const divisionOptions = useMemo(
    () => uniqSorted(SAMPLE_COLLEGES.map((c) => c.division)),
    []
  );
  const conferenceOptions = useMemo(
    () => uniqSorted(SAMPLE_COLLEGES.map((c) => c.conference)),
    []
  );

  // Name suggestions (darker hover)
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return uniqSorted(
      SAMPLE_COLLEGES.filter((c) => c.name.toLowerCase().includes(q)).map(
        (c) => c.name
      )
    ).slice(0, 10);
  }, [query]);

  // Filtered results
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (
      !q &&
      regions.length === 0 &&
      states.length === 0 &&
      divisions.length === 0 &&
      conferences.length === 0
    ) {
      return [];
    }
    return SAMPLE_COLLEGES.filter((c) => {
      const matchesQuery = q ? c.name.toLowerCase().includes(q) : true;
      const matchesRegion = regions.length ? regions.includes(c.region) : true;
      const matchesState = states.length ? states.includes(c.state) : true;
      const matchesDivision = divisions.length ? divisions.includes(c.division) : true;
      const matchesConf = conferences.length
        ? conferences.includes(c.conference)
        : true;
      return (
        matchesQuery && matchesRegion && matchesState && matchesDivision && matchesConf
      );
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
    <section
      style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 16px", color: "#0f172a" }}
    >
      <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.15 }}>College Search</h1>
      <div style={{ height: 1, background: "#e5e7eb", margin: "12px 0 20px" }} />

      {/* Search + Filters */}
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
          <label
            style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6 }}
          >
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
                zIndex: 25,
                left: 0,
                right: 0,
                top: "100%",
                marginTop: 6,
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                boxShadow: "0 10px 24px rgba(0,0,0,0.12)",
                maxHeight: 260,
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
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#0f172a0F")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
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
          onChange={setRegions}
        />
        <MultiSelectDropdown
          label="State"
          options={stateOptions}
          selected={states}
          onChange={setStates}
        />
        <MultiSelectDropdown
          label="Division"
          options={divisionOptions}
          selected={divisions}
          onChange={setDivisions}
        />
        <MultiSelectDropdown
          label="Conference"
          options={conferenceOptions}
          selected={conferences}
          onChange={setConferences}
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
                <h3 style={{ margin: "0 0 4px", fontSize: 18 }}>
                  {c.name}{" "}
                  {c.type ? (
                    <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>
                      ({c.type})
                    </span>
                  ) : null}
                </h3>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    color: "#64748b",
                    fontSize: 12,
                    marginBottom: 8,
                  }}
                >
                  <span>{c.region}</span>
                  <span>•</span>
                  <span>{c.state}</span>
                  <span>•</span>
                  <span>{c.division}</span>
                  <span>•</span>
                  <span>{c.conference}</span>
                </div>

                {/* Info block – grid label/value pairs */}
                <dl
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: "#0f172a",
                    display: "grid",
                    gridTemplateColumns: "auto 1fr",
                    columnGap: 12,
                    rowGap: 6,
                    alignItems: "start",
                  }}
                >
                  {/* Enrollment */}
                  <dt style={{ fontWeight: 600 }}>Enrollment (approx):</dt>
                  <dd style={{ margin: 0 }}>
                    {c.enrollmentApprox ? c.enrollmentApprox.toLocaleString() : "—"}
                  </dd>

                  {/* Campus */}
                  <dt style={{ fontWeight: 600 }}>Campus:</dt>
                  <dd style={{ margin: 0 }}>{c.campusType ?? "—"}</dd>

                  {/* Tuition */}
                  <dt style={{ fontWeight: 600 }}>Tuition (approx):</dt>
                  <dd style={{ margin: 0 }}>
                    {/* First line sits inline with the label */}
                    In-State: {formatUSD(c.tuitionInState)}
                    {/* Next lines sit directly under the In-State line, within the value column */}
                    <div>Out-of-State: {formatUSD(c.tuitionOutState)}</div>
                    <div>International: {formatUSD(c.tuitionInternational)}</div>
                  </dd>

                  {/* Scholarships */}
                  <dt style={{ fontWeight: 600 }}>Scholarships:</dt>
                  <dd style={{ margin: 0 }}>
                    Academic: {c.scholarshipAcademic ? check : cross} &nbsp;|&nbsp; Athletic:{" "}
                    {c.scholarshipAthletic ? check : cross}
                  </dd>
                </dl>

                {/* Link buttons (only render if URL exists) */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                  {c.url && (
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sl-link-btn"
                    >
                      Website
                    </a>
                  )}
                  {c.programsUrl && (
                    <a
                      href={c.programsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sl-link-btn"
                    >
                      Academic Programs
                    </a>
                  )}
                  {c.baseballUrl && (
                    <a
                      href={c.baseballUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sl-link-btn"
                    >
                      Baseball
                    </a>
                  )}
                  {c.campsUrl && (
                    <a
                      href={c.campsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sl-link-btn"
                    >
                      Camps
                    </a>
                  )}
                  {c.questionnaireUrl && (
                    <a
                      href={c.questionnaireUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sl-link-btn"
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

      {/* Local styles for link buttons & hover */}
      <style>{`
        .sl-link-btn {
          display: inline-block;
          padding: 8px 12px;
          border-radius: 10px;
          background: rgba(255,255,255,0.96);
          color: #0f172a;
          text-decoration: none;
          border: 1px solid #e5e7eb;
          font-weight: 600;
          transition: transform .2s ease, box-shadow .2s ease, background-color .2s ease, text-decoration-color .2s ease, border-color .2s ease;
        }
        .sl-link-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.18);
          background: #f3f4f6;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
      `}</style>
    </section>
  );
}
