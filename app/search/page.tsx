// app/search/page.tsx

"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const TUITION_MAX = 100000;

const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME",
  "MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA",
  "RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"
];

const REGIONS = [
  ["NORTHEAST", "Northeast"],
  ["MID_ATLANTIC", "Mid-Atlantic"],
  ["SOUTHEAST", "Southeast"],
  ["MIDWEST", "Midwest"],
  ["SOUTHWEST", "Southwest"],
  ["WEST", "West"],
  ["PACIFIC", "Pacific"],
] as const;

const REGION_ABBR: Record<string, string> = {
  NORTHEAST: "NE",
  MID_ATLANTIC: "MA",
  SOUTHEAST: "SE",
  MIDWEST: "MW",
  SOUTHWEST: "SW",
  WEST: "W",
  PACIFIC: "P",
};

const DIVISIONS = [
  ["NCAA_D1", "NCAA D1"],
  ["NCAA_D2", "NCAA D2"],
  ["NCAA_D3", "NCAA D3"],
  ["NAIA", "NAIA"],
  ["NJCAA_D1", "NJCAA D1"],
  ["NJCAA_D2", "NJCAA D2"],
  ["NJCAA_D3", "NJCAA D3"],
] as const;

const TARGET_STATUS_OPTIONS = [
  ["SAVED", "Saved"],
  ["INTERESTED", "Interested"],
  ["CONTACTED", "Contacted"],
  ["VISITED", "Visited"],
  ["OFFERED", "Offered"],
  ["COMMITTED", "Committed"],
  ["SIGNED", "Signed"],
  ["APPLIED", "Applied"],
  ["ACCEPTED", "Accepted"],
  ["NOT_PURSUING", "Not Pursuing"],
] as const;

const CONFERENCES_BY_DIVISION: Record<string, string[]> = {
  NCAA_D1: [
    "ACC",
    "AAC",
    "ASUN",
    "Atlantic 10",
    "Big 12",
    "Big East",
    "Big South",
    "Big Ten",
    "CAA",
    "Conference USA",
    "Horizon League",
    "Ivy League",
    "MAAC",
    "MAC",
    "MEAC",
    "Missouri Valley",
    "Mountain West",
    "Northeast Conference",
    "Ohio Valley",
    "Pac-12",
    "Patriot League",
    "SoCon",
    "Southland",
    "Sun Belt",
    "SWAC",
    "WAC",
    "West Coast Conference",
  ],

  NCAA_D2: [
    "Central Atlantic Collegiate Conference (CACC)",
    "Conference Carolinas",
    "East Coast Conference (ECC)",
    "Great American Conference (GAC)",
    "Great Lakes Intercollegiate Athletic Conference (GLIAC)",
    "Great Lakes Valley Conference (GLVC)",
    "Great Midwest Athletic Conference (G-MAC)",
    "Great Northwest Athletic Conference (GNAC)",
    "Gulf South Conference (GSC)",
    "Lone Star Conference (LSC)",
    "Mountain East Conference (MEC)",
    "Northeast-10 Conference (NE10)",
    "Northern Sun Intercollegiate Conference (NSIC)",
    "Pacific West Conference (PacWest)",
    "Peach Belt Conference (PBC)",
    "Pennsylvania State Athletic Conference (PSAC)",
    "Rocky Mountain Athletic Conference (RMAC)",
    "South Atlantic Conference (SAC)",
    "Southern Intercollegiate Athletic Conference (SIAC)",
  ],

  NCAA_D3: [
    "Allegheny Mountain Collegiate Conference (AMCC)",
    "American Rivers Conference (A-R-C)",
    "American Southwest Conference (ASC)",
    "Atlantic East Conference (AEC)",
    "Centennial Conference",
    "Coast to Coast Athletic Conference (C2C)",
    "College Conference of Illinois and Wisconsin (CCIW)",
    "Collegiate Conference of the South (CCS)",
    "Conference of New England (CNE)",
    "Great Northeast Athletic Conference (GNAC)",
    "Heartland Collegiate Athletic Conference (HCAC)",
    "Landmark Conference",
    "Little East Conference (LEC)",
    "Middle Atlantic Conferences (MAC)",
    "Midwest Conference",
    "Minnesota Intercollegiate Athletic Conference (MIAC)",
    "New England Women’s and Men’s Athletic Conference (NEWMAC)",
    "New Jersey Athletic Conference (NJAC)",
    "North Atlantic Conference (NAC)",
    "North Coast Athletic Conference (NCAC)",
    "Northern Athletics Collegiate Conference (NACC)",
    "Northwest Conference (NWC)",
    "Ohio Athletic Conference (OAC)",
    "Old Dominion Athletic Conference (ODAC)",
    "Presidents’ Athletic Conference (PAC)",
    "Skyline Conference",
    "Southern California Intercollegiate Athletic Conference (SCIAC)",
    "Southern Collegiate Athletic Conference (SCAC)",
    "St. Louis Intercollegiate Athletic Conference (SLIAC)",
    "State University of New York Athletic Conference (SUNYAC)",
    "United East Conference",
    "Upper Midwest Athletic Conference (UMAC)",
    "USA South Athletic Conference",
    "Wisconsin Intercollegiate Athletic Conference (WIAC)",
  ],

  NAIA: [
    "American Midwest Conference (AMC)",
    "Appalachian Athletic Conference (AAC)",
    "California Pacific Conference (CalPac)",
    "Cascade Collegiate Conference (CCC)",
    "Chicagoland Collegiate Athletic Conference (CCAC)",
    "Frontier Conference",
    "Great Plains Athletic Conference (GPAC)",
    "Gulf Coast Athletic Conference (GCAC)",
    "Golden State Athletic Conference (GSAC)",
    "Heart of America Athletic Conference (HAAC)",
    "Kansas Collegiate Athletic Conference (KCAC)",
    "Mid-South Conference",
    "Red River Athletic Conference (RRAC)",
    "River States Conference (RSC)",
    "Sooner Athletic Conference (SAC)",
    "Southern States Athletic Conference (SSAC)",
    "The Sun Conference",
    "Wolverine-Hoosier Athletic Conference (WHAC)",
  ],

  NJCAA_D1: [
    "NJCAA Region 1",
    "NJCAA Region 2",
    "NJCAA Region 3",
    "NJCAA Region 4",
    "NJCAA Region 5",
    "NJCAA Region 6",
    "NJCAA Region 7",
    "NJCAA Region 8",
    "NJCAA Region 9",
    "NJCAA Region 10",
    "NJCAA Region 11",
    "NJCAA Region 14",
    "NJCAA Region 16",
    "NJCAA Region 17",
    "NJCAA Region 22",
    "NJCAA Region 23",
    "NJCAA Region 24",
  ],

  NJCAA_D2: [
    "NJCAA Region 2",
    "NJCAA Region 3",
    "NJCAA Region 4",
    "NJCAA Region 7",
    "NJCAA Region 8",
    "NJCAA Region 10",
    "NJCAA Region 12",
    "NJCAA Region 16",
    "NJCAA Region 19",
    "NJCAA Region 20",
    "NJCAA Region 24",
  ],

  NJCAA_D3: [
    "NJCAA Region 3",
    "NJCAA Region 4",
    "NJCAA Region 10",
    "NJCAA Region 12",
    "NJCAA Region 15",
    "NJCAA Region 19",
    "NJCAA Region 20",
    "NJCAA Region 21",
  ],
};

const ALL_CONFERENCES = Array.from(
  new Set(Object.values(CONFERENCES_BY_DIVISION).flat())
).sort((a, b) => a.localeCompare(b));

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
  truthFit?: {
    score: number;
    label: string;
    benchmarkSource?: {
      metrics?: {
        label: string;
      };
    };
  } | null;
};

function pretty(value?: string | null) {
  if (!value) return "—";
  const raw = value.replace(/_/g, " ").toUpperCase();
  return raw
    .split(" ")
    .map((word) => {
      if (["NCAA", "NAIA", "NJCAA", "SEC", "ACC"].includes(word)) return word;
      if (/^D[123]$/.test(word)) return word;
      return word.charAt(0) + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function money(value?: number | null) {
  if (value == null) return "—";
  return `$${value.toLocaleString()}`;
}

function addUnique(list: string[], value: string) {
  if (!value || list.includes(value)) return list;
  return [...list, value];
}

function getFitColor(label: string) {
  if (label === "Strong Fit") return "#15803d";
  if (label === "Match") return "#0369a1";
  if (label === "Possible Match") return "#b45309";
  if (label === "Reach / Not Yet") return "#b91c1c";
  return "#b91c1c";
}

function getFitBackground(label: string) {
  if (label === "Strong Fit") return "#f0fdf4";
  if (label === "Match") return "#e0f2fe";
  if (label === "Possible Match") return "#fffbeb";
  if (label === "Reach / Not Yet") return "#fef2f2";
  return "#fef2f2";
}

function getFitBorderColor(label: string) {
  if (label === "Strong Fit") return "#bbf7d0";
  if (label === "Match") return "#bae6fd";
  if (label === "Possible Match") return "#fde68a";
  if (label === "Reach / Not Yet") return "#fecaca";
  return "#fecaca";
}

export default function CollegeSearchPage() {
  const [q, setQ] = useState("");
  const [states, setStates] = useState<string[]>([]);
  const [stateInput, setStateInput] = useState("");
  const [regions, setRegions] = useState<string[]>([]);
  const [regionInput, setRegionInput] = useState("");
  const [divisions, setDivisions] = useState<string[]>([]);
  const [divisionInput, setDivisionInput] = useState("");
  const [conferences, setConferences] = useState<string[]>([]);
  const [conferenceInput, setConferenceInput] = useState("");
  const [control, setControl] = useState("");
  const [maxTuition, setMaxTuition] = useState(TUITION_MAX);

  const [results, setResults] = useState<CollegeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [savedCollegeIds, setSavedCollegeIds] = useState<string[]>([]);
  const [savedCollegeResults, setSavedCollegeResults] = useState<CollegeResult[]>([]);
  const [savedCollegeStatuses, setSavedCollegeStatuses] = useState<Record<string, string>>({});
  const [savedCollegePriorities, setSavedCollegePriorities] = useState<Record<string, string>>({});
  const [savingCollegeId, setSavingCollegeId] = useState("");

  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [sortBy, setSortBy] = useState("TRUTH_FIT");

  const [authChecked, setAuthChecked] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

const hasAdvancedSearch =
  isLoggedIn &&
  (states.length > 0 ||
    regions.length > 0 ||
    divisions.length > 0 ||
    conferences.length > 0 ||
    !!control ||
    maxTuition < TUITION_MAX);

const shouldSearch =
  q.trim().length >= 2 || hasAdvancedSearch;

useEffect(() => {
  let cancelled = false;

  async function checkAuth() {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json().catch(() => null);

      const email =
        data?.email ||
        data?.user?.email ||
        data?.data?.email ||
        "";

      if (!cancelled) {
        setIsLoggedIn(res.ok && !!email);
      }
    } catch {
      if (!cancelled) {
        setIsLoggedIn(false);
      }
    } finally {
      if (!cancelled) {
        setAuthChecked(true);
      }
    }
  }

  checkAuth();

  return () => {
    cancelled = true;
  };
}, []);

useEffect(() => {
  let cancelled = false;

  async function loadSavedPrograms() {
    if (!isLoggedIn) {
setSavedCollegeIds([]);
setSavedCollegeResults([]);
setSavedCollegeStatuses({});
setSavedCollegePriorities({});
return;
    }

    try {
      const res = await fetch("/api/player/target-programs", {
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);

      if (!cancelled && res.ok && data?.ok) {
const savedItems = data.saved || [];

const ids = savedItems
  .map((item: any) => item?.collegeId)
  .filter(Boolean);

const colleges = savedItems
  .map((item: any) => item?.college)
  .filter(Boolean);

const statuses = savedItems.reduce((acc: Record<string, string>, item: any) => {
  if (item?.collegeId) acc[item.collegeId] = item?.status || "SAVED";
  return acc;
}, {});

const priorities = savedItems.reduce((acc: Record<string, string>, item: any) => {
  if (item?.collegeId) acc[item.collegeId] = item?.priority || "";
  return acc;
}, {});

setSavedCollegeIds(ids);
setSavedCollegeResults(colleges);
setSavedCollegeStatuses(statuses);
setSavedCollegePriorities(priorities);
      }
    } catch {
      if (!cancelled) {
setSavedCollegeIds([]);
setSavedCollegeResults([]);
setSavedCollegeStatuses({});
setSavedCollegePriorities({});
}
    }
  }

  loadSavedPrograms();

  return () => {
    cancelled = true;
  };
}, [isLoggedIn]);

  useEffect(() => {
    let cancelled = false;

    async function runSearch() {
      setError("");

      if (!shouldSearch) {
        setResults([]);
        return;
      }

      try {
        setLoading(true);

        const params = new URLSearchParams();
if (q.trim().length >= 2) params.set("q", q.trim());

if (isLoggedIn) {
  if (states.length) params.set("state", states.join(","));
  if (regions.length) params.set("region", regions.join(","));
  if (divisions.length) params.set("division", divisions.join(","));
  if (conferences.length) params.set("conference", conferences.join(","));
  if (control) params.set("control", control);
  if (maxTuition < TUITION_MAX) params.set("maxTuition", String(maxTuition));
}
        params.set("limit", "100");

        const res = await fetch(`/api/colleges/search?${params.toString()}`, {
          cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || "Search failed.");
        }

        if (!cancelled) setResults(data.results || []);
      } catch (err) {
        console.error("COLLEGE_SEARCH_PAGE_ERROR", err);
        if (!cancelled) {
          setError("Could not search colleges. Please try again.");
          setResults([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    const t = window.setTimeout(runSearch, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [q, states, regions, divisions, conferences, control, maxTuition, isLoggedIn, shouldSearch]);

  const stateMatches = useMemo(
    () =>
      STATES.filter((s) => s.startsWith(stateInput.toUpperCase()) && !states.includes(s)).slice(0, 10),
    [stateInput, states]
  );

  const regionMatches = useMemo(
    () =>
      REGIONS.filter(([value, label]) =>
        label.toLowerCase().startsWith(regionInput.toLowerCase()) && !regions.includes(value)
      ).slice(0, 10),
    [regionInput, regions]
  );

  const divisionMatches = useMemo(
    () =>
      DIVISIONS.filter(([value, label]) =>
        label.toLowerCase().startsWith(divisionInput.toLowerCase()) && !divisions.includes(value)
      ).slice(0, 10),
    [divisionInput, divisions]
  );

const availableConferences = useMemo(() => {
  if (!divisions.length) return ALL_CONFERENCES;

  return Array.from(
    new Set(
      divisions.flatMap((division) => CONFERENCES_BY_DIVISION[division] || [])
    )
  ).sort((a, b) => a.localeCompare(b));
}, [divisions]);

const conferenceMatches = useMemo(
  () =>
    availableConferences.filter((c) =>
      c.toLowerCase().startsWith(conferenceInput.toLowerCase()) &&
      !conferences.includes(c)
    ),
  [availableConferences, conferenceInput, conferences]
);

useEffect(() => {
  if (!divisions.length) return;

  setConferences((current) =>
    current.filter((conference) => availableConferences.includes(conference))
  );
}, [availableConferences, divisions.length]);

async function toggleSavedCollege(collegeId: string) {
  if (!isLoggedIn) return;

  const isSaved = savedCollegeIds.includes(collegeId);

  try {
    setSavingCollegeId(collegeId);

    const res = await fetch("/api/player/target-programs", {
      method: isSaved ? "DELETE" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ collegeId }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error || "Save failed.");
    }

setSavedCollegeIds((prev) =>
  isSaved ? prev.filter((id) => id !== collegeId) : addUnique(prev, collegeId)
);

if (isSaved) {
  setSavedCollegeResults((prev) => prev.filter((college) => college.id !== collegeId));
  setSavedCollegeStatuses((prev) => {
    const next = { ...prev };
    delete next[collegeId];
    return next;
  });
  setSavedCollegePriorities((prev) => {
  const next = { ...prev };
  delete next[collegeId];
  return next;
});
} else {
  const justSaved = results.find((college) => college.id === collegeId);
if (justSaved) {
  setSavedCollegeResults((prev) =>
    prev.some((college) => college.id === collegeId) ? prev : [justSaved, ...prev]
  );

  setSavedCollegeStatuses((prev) => ({
    ...prev,
    [collegeId]: "SAVED",
  }));
  setSavedCollegePriorities((prev) => ({
  ...prev,
  [collegeId]: "",
}));
}
}
  } catch (err) {
    console.error("TARGET_PROGRAM_TOGGLE_ERROR", err);
    setError("Could not update Target Programs.");
  } finally {
    setSavingCollegeId("");
  }
}

async function updateSavedStatus(collegeId: string, status: string) {
  if (!isLoggedIn || !savedCollegeIds.includes(collegeId)) return;

  const previous = savedCollegeStatuses[collegeId] || "SAVED";

  setSavedCollegeStatuses((prev) => ({
    ...prev,
    [collegeId]: status,
  }));

  try {
    const res = await fetch("/api/player/target-programs", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ collegeId, status }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error || "Status update failed.");
    }
  } catch (err) {
    console.error("TARGET_PROGRAM_STATUS_UPDATE_ERROR", err);
    setSavedCollegeStatuses((prev) => ({
      ...prev,
      [collegeId]: previous,
    }));
    setError("Could not update target program status.");
  }
}

async function updateSavedPriority(collegeId: string, priority: string) {
  if (!isLoggedIn || !savedCollegeIds.includes(collegeId)) return;

  const previous = savedCollegePriorities[collegeId] || "";

  setSavedCollegePriorities((prev) => ({
    ...prev,
    [collegeId]: priority,
  }));

  try {
    const res = await fetch("/api/player/target-programs", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ collegeId, priority }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error || "Priority update failed.");
    }
  } catch (err) {
    console.error("TARGET_PROGRAM_PRIORITY_UPDATE_ERROR", err);
    setSavedCollegePriorities((prev) => ({
      ...prev,
      [collegeId]: previous,
    }));
    setError("Could not update target program priority.");
  }
}

const visibleResults = [...(showSavedOnly ? savedCollegeResults : results)].sort((a, b) => {
  if (sortBy === "TRUTH_FIT") {
    return (b.truthFit?.score || 0) - (a.truthFit?.score || 0);
  }

  if (sortBy === "IN_STATE_TUITION") {
    return (a.tuitionInState ?? Number.MAX_SAFE_INTEGER) - (b.tuitionInState ?? Number.MAX_SAFE_INTEGER);
  }

  if (sortBy === "OUT_OF_STATE_TUITION") {
    return (a.tuitionOutOfState ?? Number.MAX_SAFE_INTEGER) - (b.tuitionOutOfState ?? Number.MAX_SAFE_INTEGER);
  }

  return a.name.localeCompare(b.name);
});

  function clearFilters() {
    setQ("");
    setStates([]);
    setRegions([]);
    setDivisions([]);
    setConferences([]);
    setControl("");
    setMaxTuition(TUITION_MAX);
    setStateInput("");
    setRegionInput("");
    setDivisionInput("");
    setConferenceInput("");
    setSortBy("TRUTH_FIT");
  }

  return (
    <main style={{ color: "#0f172a", fontFamily: "Arial, sans-serif" }}>
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "34px 16px 48px" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: "clamp(2rem, 5vw, 3.25rem)", fontWeight: 900 }}>
            College Search
          </h1>
<p style={{ margin: "10px auto 0", maxWidth: 760, color: "#475569", fontSize: "1.05rem" }}>
  Search college programs, save schools to Target Programs, and use Truth Fit to prioritize your recruiting plan.
</p>
        </div>

        <div style={panelStyle}>
          <Field label="Search by college name">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Type at least 2 characters to search by college name..."
              style={inputStyle}
            />
          </Field>

{isLoggedIn ? (
  <>
    <div style={{ marginTop: 16, fontWeight: 900 }}>Advanced Filters</div>

    <div style={filterGridStyle}>
      <AutoChipField
        label="State(s)"
        value={stateInput}
        setValue={setStateInput}
        selected={states}
        setSelected={setStates}
        matches={stateMatches.map((s) => [s, s])}
        allOptions={STATES.map((s) => [s, s])}
      />

      <AutoChipField
        label="Region(s)"
        value={regionInput}
        setValue={setRegionInput}
        selected={regions}
        setSelected={setRegions}
        matches={regionMatches.map(([v, l]) => [v, l])}
        allOptions={REGIONS.map(([v, l]) => [v, l])}
        labelFor={(v) => REGION_ABBR[v] || v}
      />

      <Field label="Public / Private">
        <select value={control} onChange={(e) => setControl(e.target.value)} style={inputStyle}>
          <option value="">Any</option>
          <option value="PUBLIC">Public</option>
          <option value="PRIVATE">Private</option>
        </select>
      </Field>

      <AutoChipField
        label="Division(s)"
        value={divisionInput}
        setValue={setDivisionInput}
        selected={divisions}
        setSelected={setDivisions}
        matches={divisionMatches.map(([v, l]) => [v, l])}
        allOptions={DIVISIONS.map(([v, l]) => [v, l])}
        labelFor={(v) => DIVISIONS.find(([x]) => x === v)?.[1] || v}
      />

      <AutoChipField
        label="Conference(s)"
        value={conferenceInput}
        setValue={setConferenceInput}
        selected={conferences}
        setSelected={setConferences}
        matches={conferenceMatches.map((c) => [c, c])}
        allOptions={availableConferences.map((c) => [c, c])}
      />

      <Field label={`Max: $${maxTuition.toLocaleString()}`}>
        <div style={{ width: "100%" }}>
          <input
            type="range"
            min={0}
            max={TUITION_MAX}
            step={1000}
            value={maxTuition}
            onChange={(e) => setMaxTuition(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>
      </Field>
    </div>
  </>
) : authChecked ? (
  <div
    style={{
      marginTop: 14,
      padding: "10px 12px",
      border: "1px solid #e5e7eb",
      background: "#f8fafc",
      borderRadius: 12,
      color: "#475569",
      fontWeight: 700,
      fontSize: 13,
    }}
  >
    Log in to unlock advanced filters like state, region, division, conference, and tuition.
  </div>
) : null}

          <button type="button" onClick={clearFilters} style={clearButtonStyle}>
            Clear Filters
          </button>

<div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
  <button
    type="button"
    onClick={() => setShowSavedOnly(false)}
    style={{
      ...toggleButtonStyle,
      background: !showSavedOnly ? "#0f172a" : "#f1f5f9",
      color: !showSavedOnly ? "#ffffff" : "#0f172a",
    }}
  >
    All Results
  </button>

  {isLoggedIn && (
    <button
      type="button"
      onClick={() => setShowSavedOnly(true)}
      style={{
        ...toggleButtonStyle,
        background: showSavedOnly ? "#0f172a" : "#f1f5f9",
        color: showSavedOnly ? "#ffffff" : "#0f172a",
      }}
    >
      Saved Programs
    </button>
  )}
  <select
    value={sortBy}
    onChange={(e) => setSortBy(e.target.value)}
    style={sortSelectStyle}
  >
    <option value="TRUTH_FIT">Sort: Truth Fit</option>
    <option value="SCHOOL_NAME">Sort: School Name</option>
    <option value="IN_STATE_TUITION">Sort: In-State Tuition</option>
    <option value="OUT_OF_STATE_TUITION">Sort: Out-of-State Tuition</option>
  </select>
</div>

          <div style={{ marginTop: 10, color: "#64748b", fontSize: 14 }}>
{!shouldSearch
  ? "Click on the school name in the results below to see more information."
  : loading
  ? "Searching colleges..."
: `${visibleResults.length} result${visibleResults.length === 1 ? "" : "s"} found.`}
          </div>
        </div>

        {error ? <div style={errorStyle}>{error}</div> : null}

<div style={{ display: "grid", gap: 14 }}>
  {visibleResults.map((college) => {
            const baseball = college.baseballProgram;

            return (
              <article key={college.id} style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                  <div>
<h2
  style={{
    margin: 0,
    fontSize: "1.35rem",
    fontWeight: 900,
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  }}
>
<Link
  href={`/college/${college.slug}`}
  style={{ color: "#0f172a", textDecorationColor: "#caa042" }}
>
  {college.name}
</Link>

  {isLoggedIn ? (
    <button
      type="button"
      title="Click the star icon and save this school to your Target Programs list."
      onClick={() => toggleSavedCollege(college.id)}
      disabled={savingCollegeId === college.id}
      style={{
        ...starButtonStyle,
        background: savedCollegeIds.includes(college.id) ? "#caa042" : "transparent",
        borderColor: savedCollegeIds.includes(college.id) ? "#caa042" : "#0ea5e9",
        color: savedCollegeIds.includes(college.id) ? "#0f172a" : "#0ea5e9",
        opacity: savingCollegeId === college.id ? 0.6 : 1,
      }}
      aria-label={
        savedCollegeIds.includes(college.id)
          ? "Remove from Target Programs"
          : "Save to Target Programs"
      }
    >
      ★
    </button>
  ) : null}
</h2>
                    <div style={{ marginTop: 6, color: "#475569", fontWeight: 700 }}>
                      {[college.city, college.state].filter(Boolean).join(", ") || "Location TBD"}
                    </div>
                  </div>

<div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
  {isLoggedIn && college.truthFit ? (
    <span
      style={{
        ...truthFitPillStyle,
        color: getFitColor(college.truthFit.label),
        background: getFitBackground(college.truthFit.label),
        borderColor: getFitBorderColor(college.truthFit.label),
      }}
      title={college.truthFit.benchmarkSource?.metrics?.label || "Truth Fit score"}
    >
      Truth Fit: {college.truthFit.label} • {college.truthFit.score}
    </span>
  ) : null}

  <span style={pillStyle}>{pretty(college.region)}</span>
                    <span style={pillStyle}>{pretty(college.control)}</span>
                    <span style={pillStyle}>{pretty(college.schoolType)}</span>
                  </div>
                </div>

<div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
  <Info label="Nickname" value={baseball?.nickname || "—"} />
  <Info label="Division" value={pretty(baseball?.division)} />
  <Info label="Conference" value={baseball?.conference || "—"} />
  <Info label="In-State Tuition" value={money(college.tuitionInState)} />
  <Info label="Out-of-State Tuition" value={money(college.tuitionOutOfState)} />

  {isLoggedIn && savedCollegeIds.includes(college.id) ? (
    <>
      <label style={statusFieldStyle}>
        <span style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>
          Target Status
        </span>
        <select
          value={savedCollegeStatuses[college.id] || "SAVED"}
          onChange={(e) => updateSavedStatus(college.id, e.target.value)}
          style={statusSelectStyle}
        >
          {TARGET_STATUS_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label style={statusFieldStyle}>
        <span style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>
          Target Priority
        </span>
        <select
          value={savedCollegePriorities[college.id] || ""}
          onChange={(e) => updateSavedPriority(college.id, e.target.value)}
          style={statusSelectStyle}
        >
          <option value="">No Priority</option>
          <option value="HIGH">High Priority</option>
          <option value="MEDIUM">Medium Priority</option>
          <option value="LOW">Low Priority</option>
        </select>
      </label>
    </>
  ) : null}
</div>

<div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
  {isLoggedIn && savedCollegeIds.includes(college.id) ? (
    <Link href="/dashboard/player/target-programs" style={secondaryButtonStyle}>
      Manage Target
    </Link>
  ) : null}

<Link
  href={`/dashboard/player/recruiting-tool?collegeId=${college.id}`}
  style={secondaryButtonStyle}
>
  {savedCollegeIds.includes(college.id)
    ? college.truthFit
      ? "View Truth Fit"
      : "Generate Truth Fit"
    : "Generate Truth Fit"}
</Link>

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

function AutoChipField({
  label,
  value,
  setValue,
  selected,
  setSelected,
  matches,
  allOptions,
  labelFor,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  selected: string[];
  setSelected: React.Dispatch<React.SetStateAction<string[]>>;
  matches: string[][];
  allOptions: string[][];
  labelFor?: (v: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const availableOptions = allOptions.filter(([raw]) => !selected.includes(raw));

  return (
    <Field label={label}>
      <div style={{ display: "grid", gap: 6, position: "relative" }}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {selected.map((item) => (
            <span key={item} style={chipStyle}>
              {labelFor ? labelFor(item) : item}
              <button
                type="button"
                onClick={() => setSelected((prev) => prev.filter((x) => x !== item))}
                style={chipXStyle}
                aria-label={`Remove ${item}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>

        <div style={comboWrapStyle}>
          <input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setOpen(false);
            }}
            placeholder="Type to search..."
            style={comboInputStyle}
          />

          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            style={comboArrowStyle}
            aria-label={`Open ${label} options`}
          >
            ▾
          </button>
        </div>

        {value ? (
          <div style={suggestionBoxStyle}>
            {matches.length ? (
              matches.map(([raw, display]) => (
                <button
                  key={raw}
                  type="button"
                  onClick={() => {
                    setSelected((prev) => addUnique(prev, raw));
                    setValue("");
                  }}
                  style={suggestionStyle}
                >
                  {display}
                </button>
              ))
            ) : (
              <div style={emptySuggestionStyle}>No matches</div>
            )}
          </div>
        ) : null}

        {open ? (
          <div style={suggestionBoxStyle}>
            {availableOptions.length ? (
              availableOptions.map(([raw, display]) => (
                <button
                  key={raw}
                  type="button"
                  onClick={() => {
                    setSelected((prev) => addUnique(prev, raw));
                  }}
                  style={suggestionStyle}
                >
                  {display}
                </button>
              ))
            ) : (
              <div style={emptySuggestionStyle}>All selected</div>
            )}
          </div>
        ) : null}
      </div>
    </Field>
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

const panelStyle: React.CSSProperties = { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 18, boxShadow: "0 10px 28px rgba(15,23,42,0.08)", padding: 18, marginBottom: 18 };
const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "8px 9px", borderRadius: 9, border: "1px solid #cbd5e1", fontSize: 13, outline: "none" };
const filterGridStyle: React.CSSProperties = { marginTop: 10, display: "grid", gridTemplateColumns: "repeat(5, minmax(145px, 1fr)) 130px", gap: 10, alignItems: "start" };
const clearButtonStyle: React.CSSProperties = { marginTop: 12, border: "1px solid #cbd5e1", background: "#f8fafc", borderRadius: 999, padding: "8px 12px", fontWeight: 900, cursor: "pointer" };
const errorStyle: React.CSSProperties = { border: "1px solid #fecaca", background: "#fff1f2", color: "#991b1b", borderRadius: 12, padding: 14, marginBottom: 16, fontWeight: 700 };
const cardStyle: React.CSSProperties = { border: "1px solid #e5e7eb", borderRadius: 18, background: "#ffffff", padding: 18, boxShadow: "0 8px 20px rgba(15,23,42,0.05)" };
const pillStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", border: "1px solid #e5e7eb", background: "#f8fafc", borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 900, color: "#334155" };
const truthFitPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  border: "1px solid",
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 900,
};
const buttonStyle: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 999, padding: "9px 13px", background: "#caa042", color: "#0f172a", textDecoration: "none", fontWeight: 900, border: "1px solid #caa042" };
const secondaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  padding: "9px 13px",
  background: "#ffffff",
  color: "#0f172a",
  textDecoration: "none",
  fontWeight: 900,
  border: "1px solid #cbd5e1",
};
const chipStyle: React.CSSProperties = { position: "relative", display: "inline-flex", alignItems: "center", minHeight: 18, borderRadius: 999, border: "1px solid #caa042", background: "#fffaf0", padding: "3px 15px 3px 7px", fontSize: 10, fontWeight: 900, lineHeight: 1 };
const chipXStyle: React.CSSProperties = { position: "absolute", top: -4, right: 1, border: "none", background: "transparent", cursor: "pointer", fontSize: 10, lineHeight: 1, fontWeight: 900, color: "#dc2626", padding: 0 };
const comboWrapStyle: React.CSSProperties = { position: "relative", width: "100%" };
const comboInputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "8px 28px 8px 9px", borderRadius: 9, border: "1px solid #cbd5e1", fontSize: 13, outline: "none" };
const comboArrowStyle: React.CSSProperties = { position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", width: 22, height: 22, border: "none", background: "transparent", cursor: "pointer", fontWeight: 900, color: "#334155" };
const suggestionBoxStyle: React.CSSProperties = { display: "grid", gap: 4, maxHeight: 170, overflowY: "auto", border: "1px solid #e5e7eb", background: "#ffffff", borderRadius: 10, padding: 6, boxShadow: "0 8px 18px rgba(15,23,42,0.10)", zIndex: 10 };
const suggestionStyle: React.CSSProperties = { textAlign: "left", border: "1px solid #e5e7eb", background: "#ffffff", borderRadius: 8, padding: "6px 8px", cursor: "pointer", fontWeight: 800, fontSize: 12 };
const emptySuggestionStyle: React.CSSProperties = { fontSize: 12, color: "#64748b", padding: "6px 8px", fontWeight: 700 };
const starButtonStyle: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: 999,
  border: "2px solid #0ea5e9",
  background: "transparent",
  color: "#0ea5e9",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 15,
  fontWeight: 900,
  lineHeight: 1,
  cursor: "pointer",
  padding: 0,
};

const toggleButtonStyle: React.CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 999,
  padding: "6px 12px",
  fontWeight: 800,
  cursor: "pointer",
  fontSize: 12,
};

const sortSelectStyle: React.CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 999,
  padding: "6px 12px",
  background: "#ffffff",
  color: "#0f172a",
  fontWeight: 800,
  cursor: "pointer",
  fontSize: 12,
};

const statusFieldStyle: React.CSSProperties = {
  border: "1px solid #eef2f7",
  background: "#f8fafc",
  borderRadius: 12,
  padding: "10px 12px",
  display: "grid",
  gap: 4,
};

const statusSelectStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "7px 8px",
  background: "#ffffff",
  color: "#0f172a",
  fontWeight: 800,
  outline: "none",
};
