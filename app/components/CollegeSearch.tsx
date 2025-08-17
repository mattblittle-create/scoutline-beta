// app/search/CollegeSearch.tsx
"use client";
import React, { useMemo, useState } from "react";
import Link from "next/link";

// --- Data model (expandable to match your spreadsheet) ---
type College = {
  name: string;
  url: string;
  region: string;
  state: string;
  division: string;
  conference: string;
  // NEW FIELDS
  type: "Public" | "Private";
  enrollmentTotal?: number;              // Total enrollment
  campusType?: string;                   // "Urban", "Suburban", "Rural", etc. (can be comma-separated)
  programsUrl?: string;                  // Academic programs
  tuitionInState?: number;               // annual $
  tuitionOutState?: number;              // annual $
  tuitionInternational?: number;         // annual $
  scholarshipsAcademic?: boolean;        // academic scholarship availability
  scholarshipsAthletic?: boolean;        // athletic scholarship availability
  sportUrlBaseball?: string;             // baseball page
  campsUrl?: string;                     // camps page
};

// --- Demo dataset (replace with JSON from your spreadsheet later) ---
const SAMPLE_COLLEGES: College[] = [
  {
    name: "Clemson University",
    url: "https://www.clemson.edu/",
    region: "Southeast",
    state: "SC",
    division: "NCAA D1",
    conference: "ACC",
    type: "Public",
    enrollmentTotal: 27000,
    campusType: "Suburban, Research",
    programsUrl: "https://www.clemson.edu/academics/",
    tuitionInState: 16350,
    tuitionOutState: 39250,
    tuitionInternational: 39250,
    scholarshipsAcademic: true,
    scholarshipsAthletic: true,
    sportUrlBaseball: "https://clemsontigers.com/sports/baseball/",
    campsUrl: "https://clemsontigers.com/sports/baseball/camps/",
  },
  {
    name: "University of Florida",
    url: "https://www.ufl.edu/",
    region: "Southeast",
    state: "FL",
    division: "NCAA D1",
    conference: "SEC",
    type: "Public",
    enrollmentTotal: 55000,
    campusType: "Urban, Research",
    programsUrl: "https://catalog.ufl.edu/UGRD/colleges-schools/",
    tuitionInState: 6500,
    tuitionOutState: 28700,
    tuitionInternational: 28700,
    scholarshipsAcademic: true,
    scholarshipsAthletic: true,
    sportUrlBaseball: "https://floridagators.com/sports/baseball",
    campsUrl: "https://floridagators.com/sports/baseball/camps",
  },
  {
    name: "University of Georgia",
    url: "https://www.uga.edu/",
    region: "Southeast",
    state: "GA",
    division: "NCAA D1",
    conference: "SEC",
    type: "Public",
    enrollmentTotal: 40000,
    campusType: "Urban, Research",
    programsUrl: "https://www.uga.edu/academics/",
    tuitionInState: 12000,
    tuitionOutState: 31500,
    tuitionInternational: 31500,
    scholarshipsAcademic: true,
    scholarshipsAthletic: true,
    sportUrlBaseball: "https://georgiadogs.com/sports/baseball",
    campsUrl: "https://georgiadogs.com/sports/baseball/camps",
  },
  {
    name: "University of North Carolina",
    url: "https://www.unc.edu/",
    region: "Southeast",
    state: "NC",
    division: "NCAA D1",
    conference: "ACC",
    type: "Public",
    enrollmentTotal: 31000,
    campusType: "Suburban, Research",
    programsUrl: "https://tarheels.live/programs/",
    tuitionInState: 9700,
    tuitionOutState: 37000,
    tuitionInternational: 37000,
    scholarshipsAcademic: true,
    scholarshipsAthletic: true,
    sportUrlBaseball: "https://goheels.com/sports/baseball",
    campsUrl: "https://goheels.com/sports/baseball/camps",
  },
  {
    name: "Boston College",
    url: "https://www.bc.edu/",
    region: "Northeast",
    state: "MA",
    division: "NCAA D1",
    conference: "ACC",
    type: "Private",
    enrollmentTotal: 15000,
    campusType: "Urban, Liberal Arts",
    programsUrl: "https://www.bc.edu/bc-web/academics.html",
    tuitionInState: 68200,
    tuitionOutState: 68200,
    tuitionInternational: 68200,
    scholarshipsAcademic: true,
    scholarshipsAthletic: true,
    sportUrlBaseball: "https://bceagles.com/sports/baseball",
    campsUrl: "https://bceagles.com/sports/baseball/camps",
  },
  {
    name: "Duke University",
    url: "https://www.duke.edu/",
    region: "Southeast",
    state: "NC",
    division: "NCAA D1",
    conference: "ACC",
    type: "Private",
    enrollmentTotal: 16000,
    campusType: "Urban, Research",
    programsUrl: "https://trinity.duke.edu/undergraduate/majors-minors",
    tuitionInState: 67500,
    tuitionOutState: 67500,
    tuitionInternational: 67500,
    scholarshipsAcademic: true,
    scholarshipsAthletic: true,
    sportUrlBaseball: "https://goduke.com/sports/baseball",
    campsUrl: "https://goduke.com/sports/baseball/camps",
  },
  {
    name: "Auburn University",
    url: "https://www.auburn.edu/",
    region: "Southeast",
    state: "AL",
    division: "NCAA D1",
    conference: "SEC",
    type: "Public",
    enrollmentTotal: 32000,
    campusType: "Suburban, Research",
    programsUrl: "https://bulletin.auburn.edu/undergraduate/majors/",
    tuitionInState: 12000,
    tuitionOutState: 32000,
    tuitionInternational: 32000,
    scholarshipsAcademic: true,
    scholarshipsAthletic: true,
    sportUrlBaseball: "https://auburntigers.com/sports/baseball",
    campsUrl: "https://auburntigers.com/sports/baseball/camps",
  },
  {
    name: "University of Alabama",
    url: "https://www.ua.edu/",
    region: "Southeast",
    state: "AL",
    division: "NCAA D1",
    conference: "SEC",
    type: "Public",
    enrollmentTotal: 39000,
    campusType: "Urban, Research",
    programsUrl: "https://catalog.ua.edu/undergraduate/",
    tuitionInState: 11500,
    tuitionOutState: 32000,
    tuitionInternational: 32000,
    scholarshipsAcademic: true,
    scholarshipsAthletic: true,
    sportUrlBaseball: "https://rolltide.com/sports/baseball",
    campsUrl: "https://rolltide.com/sports/baseball/camps",
  },
];

// Helpers
function uniqSorted(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}
function fmtCurrency(n?: number) {
  if (typeof n !== "number") return "—";
  return `$${n.toLocaleString()}`;
}
function Checkbox({ checked, label }: { checked?: boolean; label: string }) {
  const boxStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "2px 6px",
    borderRadius: 6,
    border: "1px solid #e5e7eb",
    background: checked ? "#f5fdf6" : "#fff",
    color: checked ? "#166534" : "#0f172a",
    fontSize: 13,
  };
  const square: React.CSSProperties = {
    width: 14,
    height: 14,
    borderRadius: 3,
    border: "1px solid #94a3b8",
    display: "grid",
    placeItems: "center",
    background: checked ? "#22c55e" : "#fff",
    color: checked ? "#fff" : "transparent",
    fontSize: 12,
    lineHeight: 1,
  };
  return (
    <span style={boxStyle} aria-checked={!!checked} role="checkbox">
      <span style={square}>{checked ? "✓" : ""}</span>
      {label}
    </span>
  );
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
      SAMPLE_COLLEGES.filter(c => c.name.toLowerCase().includes(q)).map(c => c.name)
    ).slice(0, 10);
  }, [query]);

  // Actual filtered result set (hidden until something selected/typed)
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
            aria-autocomplete="list"
            aria-expanded={showSuggestions}
            aria-controls="college-suggestions"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div
              id="college-suggestions"
              role="listbox"
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
                  role="option"
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
                  onMouseOver={(e) => {
                    (e.currentTarget.style.backgroundColor = "#f8fafc");
                  }}
                  onMouseOut={(e) => {
                    (e.currentTarget.style.backgroundColor = "transparent");
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Multi-selects as simple pill checklists */}
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

      {/* Results */}
      {filtered.length > 0 && (
        <>
          <div style={{ height: 1, background: "#e5e7eb", margin: "18px 0" }} />
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
                {/* Name + Type */}
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                  <h3 style={{ margin: 0, fontSize: 18 }}>{c.name}</h3>
                  {c.type && (
                    <span style={{ fontSize: 12, color: "#64748b" }}>({c.type})</span>
                  )}
                </div>

                {/* Meta line */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", color: "#64748b", fontSize: 12, marginTop: 6 }}>
                  <span>{c.region}</span>
                  <span>•</span>
                  <span>{c.state}</span>
                  <span>•</span>
                  <span>{c.division}</span>
                  <span>•</span>
                  <span>{c.conference}</span>
                </div>

                {/* Details */}
                <dl style={{ marginTop: 10, display: "grid", rowGap: 6 }}>
                  <Detail label="Total Enrollment" value={c.enrollmentTotal?.toLocaleString() ?? "—"} />
                  <Detail label="Campus Type" value={c.campusType ?? "—"} />
                  <Detail
                    label="Academic Programs"
                    value={
                      c.programsUrl ? (
                        <a href={c.programsUrl} target="_blank" rel="noopener noreferrer" style={linkStyle}>
                          View programs
                        </a>
                      ) : "—"
                    }
                  />
                  <Detail
                    label="Tuition (annual)"
                    value={
                      <>
                        In-state {fmtCurrency(c.tuitionInState)} • Out-of-state {fmtCurrency(c.tuitionOutState)} • Intl {fmtCurrency(c.tuitionInternational)}
                      </>
                    }
                  />
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <dt style={dtStyle}>Scholarship Opportunities</dt>
                    <dd style={{ margin: 0, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Checkbox checked={c.scholarshipsAcademic} label="Academic" />
                      <Checkbox checked={c.scholarshipsAthletic} label="Athletic" />
                    </dd>
                  </div>
                </dl>

                {/* Links row */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                  <a href={c.url} target="_blank" rel="noopener noreferrer" style={buttonLink}>
                    School Website
                  </a>
                  {c.sportUrlBaseball && (
                    <a href={c.sportUrlBaseball} target="_blank" rel="noopener noreferrer" style={buttonLink}>
                      Baseball
                    </a>
                  )}
                  {c.campsUrl && (
                    <a href={c.campsUrl} target="_blank" rel="noopener noreferrer" style={buttonLink}>
                      Camps
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

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 8, alignItems: "baseline" }}>
      <dt style={dtStyle}>{label}</dt>
      <dd style={{ margin: 0, color: "#0f172a" }}>{value}</dd>
    </div>
  );
}

const dtStyle: React.CSSProperties = { color: "#64748b", fontSize: 12 };
const linkStyle: React.CSSProperties = {
  color: "#0f172a",
  textDecoration: "underline",
  textUnderlineOffset: 3,
};
const buttonLink: React.CSSProperties = {
  display: "inline-block",
  padding: "8px 12px",
  borderRadius: 10,
  background: "rgba(255,255,255,0.96)",
  color: "#0f172a",
  textDecoration: "none",
  border: "1px solid #e5e7eb",
  fontWeight: 600,
};

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
