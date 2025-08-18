"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";

/** -------- Types & Demo Data (replace with your JSON later) -------- */
type College = {
  name: string;
  url: string;
  region: string;
  state: string;
  division: string;
  conference: string;
  type: "Public" | "Private";
  enrollment (approx): number;
  campusType: string;
  tuition: {
    inState?: number;
    outOfState?: number;
    international?: number;
  };
  scholarships: {
    academic: boolean;
    athletic: boolean;
  };
  links?: {
    baseballPage?: string;
    camps?: string;
    programs?: string; // academic programs
    recruitingQuestionnaire?: string; // NEW
  };
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
    enrollment: 27000,
    campusType: "Suburban Research",
    tuition: { inState: 15320, outOfState: 39038, international: 39038 },
    scholarships: { academic: true, athletic: true },
    links: {
      baseballPage: "https://clemsontigers.com/sports/baseball/",
      camps: "https://clemsontigers.com/camps/",
      programs: "https://www.clemson.edu/degrees/",
      recruitingQuestionnaire: "https://clemsontigers.com/sb_output.aspx?form=3", // example
    },
  },
  {
    name: "University of Florida",
    url: "https://www.ufl.edu/",
    region: "Southeast",
    state: "FL",
    division: "NCAA D1",
    conference: "SEC",
    type: "Public",
    enrollment: 57000,
    campusType: "Urban Research",
    tuition: { inState: 6550, outOfState: 28758, international: 28758 },
    scholarships: { academic: true, athletic: true },
    links: {
      baseballPage: "https://floridagators.com/sports/baseball",
      camps: "https://floridagators.com/camps",
      programs: "https://catalog.ufl.edu/",
      recruitingQuestionnaire: "https://floridagators.com/sb_output.aspx?form=3", // example
    },
  },
  {
    name: "Boston College",
    url: "https://www.bc.edu/",
    region: "Northeast",
    state: "MA",
    division: "NCAA D1",
    conference: "ACC",
    type: "Private",
    enrollment: 15000,
    campusType: "Urban Liberal Arts",
    tuition: { inState: 68854, outOfState: 68854, international: 68854 },
    scholarships: { academic: true, athletic: true },
    links: {
      baseballPage: "https://bceagles.com/sports/baseball",
      camps: "https://bceagles.com/sports/2016/6/9/camps.aspx",
      programs: "https://www.bc.edu/academics.html",
      recruitingQuestionnaire: "https://bceagles.com/sb_output.aspx?form=3", // example
    },
  },
  {
    name: "Emory University",
    url: "https://www.emory.edu/",
    region: "Southeast",
    state: "GA",
    division: "NCAA D3",
    conference: "UAA",
    type: "Private",
    enrollment: 15000,
    campusType: "Urban Research",
    tuition: { inState: 65000, outOfState: 65000, international: 65000 },
    scholarships: { academic: true, athletic: false },
    links: {
      baseballPage: "https://emoryathletics.com/sports/baseball",
      camps: "https://emoryathletics.com/camps",
      programs: "https://catalog.college.emory.edu/programs/",
      recruitingQuestionnaire: "https://emoryathletics.com/sb_output.aspx?form=3", // example
    },
  },
];

function uniqSorted(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

/** ---------------- Hoverable Link Button ---------------- */
function LinkButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-block",
        padding: "8px 12px",
        borderRadius: 10,
        background: hover ? "#f3f4f6" : "rgba(255,255,255,0.96)",
        color: "#0f172a",
        textDecoration: hover ? "underline" : "none",
        border: hover ? "1px solid #d1d5db" : "1px solid #e5e7eb",
        fontWeight: 600,
        transform: hover ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hover ? "0 6px 16px rgba(0,0,0,0.12)" : "none",
        transition:
          "transform .15s ease, box-shadow .15s ease, background-color .15s ease, border-color .15s ease, text-decoration-color .15s ease",
      }}
    >
      {children}
    </a>
  );
}

/** ----------- Multi-select Dropdown (checkbox list) ----------- */
function MultiSelect({
  label,
  options,
  selected,
  onChange,
  placeholder = "Select…",
  summaryMode = "auto", // "auto" | "list" — list = always show comma-separated values
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  summaryMode?: "auto" | "list";
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

  const toggle = (value: string) => {
    const exists = selected.includes(value);
    onChange(exists ? selected.filter((v) => v !== value) : [...selected, value]);
  };

  let summary: string;
  if (selected.length === 0) {
    summary = placeholder;
  } else if (summaryMode === "list") {
    summary = selected.join(", ");
  } else {
    summary = selected.length <= 2 ? selected.join(", ") : `${selected.length} selected`;
  }

  return (
    <div style={{ position: "relative" }} ref={wrapRef}>
      <label style={{ display: "block", fontSize: 12, color: "#64748b", marginBottom: 6 }}>
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
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
      </button>

      {open && (
        <div
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
              <label
                key={opt}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 8px",
                  borderRadius: 8,
                  cursor: "pointer",
                  userSelect: "none",
                }}
                onMouseDown={(e) => e.preventDefault()}
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggle(opt)}
                  style={{ cursor: "pointer" }}
                />
                <span>{opt}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** -------------------- Main Component -------------------- */
export default function CollegeSearch() {
  const [query, setQuery] = useState("");
  const [regions, setRegions] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [divisions, setDivisions] = useState<string[]>([]);
  const [conferences, setConferences] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  // Build option lists from data
  const regionOptions = useMemo(() => uniqSorted(SAMPLE_COLLEGES.map((c) => c.region)), []);
  const stateOptions = useMemo(() => uniqSorted(SAMPLE_COLLEGES.map((c) => c.state)), []);
  const divisionOptions = useMemo(() => uniqSorted(SAMPLE_COLLEGES.map((c) => c.division)), []);
  const conferenceOptions = useMemo(() => uniqSorted(SAMPLE_COLLEGES.map((c) => c.conference)), []);

  // Filtered suggestions for the text input
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return uniqSorted(SAMPLE_COLLEGES.filter((c) => c.name.toLowerCase().includes(q)).map((c) => c.name)).slice(0, 12);
  }, [query]);

  // Actual filtered result set (hidden when no input/filters)
  const filtered = useMemo(() => {
    if (!query && regions.length === 0 && states.length === 0 && divisions.length === 0 && conferences.length === 0) {
      return [];
    }
    const q = query.trim().toLowerCase();
    return SAMPLE_COLLEGES.filter((c) => {
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
    setActiveIndex(-1);
  }

  // Keyboard nav for suggestions
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        setQuery(suggestions[activeIndex]);
        setShowSuggestions(false);
        setActiveIndex(-1);
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setActiveIndex(-1);
    }
  }

  const hasSelections =
    !!query || regions.length > 0 || states.length > 0 || divisions.length > 0 || conferences.length > 0;

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
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(-1);
            }}
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
              {suggestions.map((name, idx) => (
                <button
                  key={name}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setQuery(name);
                    setShowSuggestions(false);
                    setActiveIndex(-1);
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 12px",
                    background: activeIndex === idx ? "#0f172a" : "transparent",
                    color: activeIndex === idx ? "#fff" : "inherit",
                    border: "none",
                    cursor: "pointer",
                  }}
                  onMouseEnter={() => setActiveIndex(idx)}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Multi-select dropdowns (State & Conference always show full list of selections) */}
        <MultiSelect label="Region" options={regionOptions} selected={regions} onChange={setRegions} />
        <MultiSelect
          label="State"
          options={stateOptions}
          selected={states}
          onChange={setStates}
          summaryMode="list"
        />
        <MultiSelect label="Division" options={divisionOptions} selected={divisions} onChange={setDivisions} />
        <MultiSelect
          label="Conference"
          options={conferenceOptions}
          selected={conferences}
          onChange={setConferences}
          summaryMode="list"
        />
      </div>

      {/* Selected filters chip bar */}
      {hasSelections && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            {/* Query chip */}
            {query && <Chip label={`Name: ${query}`} onRemove={() => setQuery("")} />}

            {/* Regions */}
            {regions.map((r) => (
              <Chip key={`region-${r}`} label={`Region: ${r}`} onRemove={() => setRegions(regions.filter((x) => x !== r))} />
            ))}

            {/* States */}
            {states.map((s) => (
              <Chip key={`state-${s}`} label={`State: ${s}`} onRemove={() => setStates(states.filter((x) => x !== s))} />
            ))}

            {/* Divisions */}
            {divisions.map((d) => (
              <Chip key={`div-${d}`} label={`Division: ${d}`} onRemove={() => setDivisions(divisions.filter((x) => x !== d))} />
            ))}

            {/* Conferences */}
            {conferences.map((c) => (
              <Chip key={`conf-${c}`} label={`Conference: ${c}`} onRemove={() => setConferences(conferences.filter((x) => x !== c))} />
            ))}

            <button
              onClick={clearAll}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid #e5e7eb",
                background: "#fff",
                cursor: "pointer",
                fontSize: 12,
                marginLeft: 4,
              }}
            >
              Clear all
            </button>
          </div>
        </div>
      )}

      {/* Results (hidden until something is typed/selected) */}
      {filtered.length > 0 && (
        <>
          {/* Results count */}
          <div style={{ marginTop: 14, color: "#475569", fontSize: 14 }}>
            <strong>{filtered.length}</strong> {filtered.length === 1 ? "college found" : "colleges found"}
          </div>

          <div style={{ height: 1, background: "#e5e7eb", margin: "12px 0 18px" }} />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
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
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                    ({c.type})
                  </span>
                </h3>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", color: "#64748b", fontSize: 12 }}>
                  <span>{c.region}</span>
                  <span>•</span>
                  <span>{c.state}</span>
                  <span>•</span>
                  <span>{c.division}</span>
                  <span>•</span>
                  <span>{c.conference}</span>
                </div>

                <div style={{ marginTop: 8, color: "#475569", fontSize: 14, lineHeight: 1.5 }}>
                  <div><strong>Enrollment:</strong> {c.enrollment.toLocaleString()}</div>
                  <div><strong>Campus:</strong> {c.campusType}</div>
                  <div>
                    <strong>Tuition:</strong>{" "}
                    {[
                      c.tuition.inState !== undefined ? `In-State $${c.tuition.inState.toLocaleString()}` : null,
                      c.tuition.outOfState !== undefined ? `Out-of-State $${c.tuition.outOfState.toLocaleString()}` : null,
                      c.tuition.international !== undefined ? `International $${c.tuition.international.toLocaleString()}` : null,
                    ].filter(Boolean).join(" | ")}
                  </div>
                  <div>
                    <strong>Scholarships:</strong>{" "}
                    <span style={{ whiteSpace: "nowrap" }}>
                      Academic: {c.scholarships.academic ? "✅" : "❌"}
                    </span>{" "}
                    <span style={{ marginLeft: 8, whiteSpace: "nowrap" }}>
                      Athletic: {c.scholarships.athletic ? "✅" : "❌"}
                    </span>
                  </div>
                </div>

                {/* Action links with hover */}
                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <LinkButton href={c.url}>Visit Website</LinkButton>
                  {c.links?.baseballPage && <LinkButton href={c.links.baseballPage}>Baseball Page</LinkButton>}
                  {c.links?.camps && <LinkButton href={c.links.camps}>Camps</LinkButton>}
                  {c.links?.programs && <LinkButton href={c.links.programs}>Academic Programs</LinkButton>}
                  {c.links?.recruitingQuestionnaire && (
                    <LinkButton href={c.links.recruitingQuestionnaire}>
                      Recruiting Questionnaire
                    </LinkButton>
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

/** -------- Small chip (selected filter) -------- */
function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: 999,
        border: "1px solid #ca9a3f",
        background: "#fff7e6",
        color: "#8a6b20",
        fontSize: 12,
        fontWeight: 600,
      }}
    >
      {label}
      <button
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        style={{
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontSize: 14,
          lineHeight: 1,
          color: "#8a6b20",
        }}
      >
        ×
      </button>
    </span>
  );
}
