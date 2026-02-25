// app/components/public/PublicStats.tsx
"use client";

import * as React from "react";

export type StatValue = string | number | null | undefined;
export type StatMap = Record<string, StatValue>;

export type TeamEntry = {
  // Kind helps grouping (HS/Travel/Other)
  kind?: "High School" | "Travel" | "Other" | string | null;

  // Athletics tab (schedule upload/link) — not shown here
  scheduleUrl?: string | null;

  // Stats tab (used for the header line)
  statsTeamName?: string | null;

  // Actual Team (from Stats tab form)
  statsSeason?: string | null; // e.g., Fall, Spring, Summer, Winter
  statsYear?: string | number | null; // e.g., 2024

  // Link to season stats (uploaded in Stats tab "Link to Stats (upload)")
  statsUrl?: string | null;

  // Optional raw name/city/state (not rendered, but allowed)
  name?: string | null;
  city?: string | null;
  state?: string | null;

  // Per-team stat groups (from Stats tab)
  stats?:
    | {
        hitting?: StatMap | null;
        fielding?: StatMap | null;
        catching?: StatMap | null;
        pitching?: StatMap | null;
      }
    | null;

  /** pitch types selected for this season (may or may not be present here) */
  pitchTypes?: string[] | null;
};

/** Minimal shape of seasons coming from API (public endpoint) */
export type StatsSeasonLite = {
  team?: string | null;
  season?: string | null; // combined label (e.g., "Summer 2025")
  seasonTerm?: string | null; // e.g., "Summer"
  seasonYear?: number | null; // e.g., 2025

  // allow array or comma-separated to be safe
  pitchTypes?: string[] | string | null;

  // optional nested maps (some payloads use a nested "stats")
  stats?:
    | {
        hitting?: StatMap | null;
        fielding?: StatMap | null;
        catching?: StatMap | null;
        pitching?: StatMap | null;
        pitchTypes?: string[] | null;
      }
    | null;

  // optional file links
  statsFileUrls?: string[] | null;

  // sometimes "name", "kind" appear
  name?: string | null;
  kind?: string | null;

  // optionally flat maps
  hitting?: StatMap | null;
  fielding?: StatMap | null;
  catching?: StatMap | null;
  pitching?: StatMap | null;
};

export type StatsData = {
  teams?: TeamEntry[] | null;

  /** seasons from API (older shape or new TabStats payload) */
  seasons?: StatsSeasonLite[] | null;

  /** some payloads nest seasons under profile */
  profile?: {
    seasons?: StatsSeasonLite[] | null;
  } | null;

  /** optional visibility flag; not used here but tolerated */
  statsPublic?: boolean;
};

/**
 * NOTE:
 * - stats can be:
 * • StatsData (with teams/seasons/profile.seasons)
 * • { seasons: StatsSeasonLite[] }
 * • StatsSeasonLite[] (array only)
 */
type StatsLike = StatsData | { seasons?: StatsSeasonLite[] | null } | StatsSeasonLite[] | null;

type Props = {
  stats?: StatsLike;
  title?: string;

  // Optional shared styles
  cardStyle?: React.CSSProperties;
  h2Style?: React.CSSProperties;
  pillStyle?: React.CSSProperties; // currently unused but kept for future styling parity
};

/** ----------------------------------------------------------------
 * Default stat fields per section (kept for aliasing/reference)
 * ---------------------------------------------------------------- */
const DEFAULT_STATS: {
  hitting: { key: string; label: string }[];
  fielding: { key: string; label: string }[];
  catching: { key: string; label: string }[];
  pitching: { key: string; label: string }[];
} = {
  hitting: [
    { key: "battingAverage", label: "AVG" },
    { key: "onBasePercentage", label: "OBP" },
    { key: "sluggingPercentage", label: "SLG" },
    { key: "onBasePercentagePlusSluggingPercentage", label: "OPS" },
    { key: "plateAppearances", label: "PA" },
    { key: "atBats", label: "AB" },
    { key: "hits", label: "H" },
    { key: "runs", label: "R" },
    { key: "runsBattedIn", label: "RBI" },
    { key: "strikeouts", label: "SO" },
    { key: "walks", label: "BB" },
    { key: "stolen bases", label: "SB" },
    { key: "stolenBasePercentage", label: "SB%" },
  ],
  fielding: [
    { key: "fieldingPercentage", label: "FPCT" },
    { key: "totalChances", label: "TC" },
    { key: "putouts", label: "PO" },
    { key: "assists", label: "A" },
    { key: "errors", label: "E" },
  ],
  catching: [
    { key: "inningsCaught", label: "INN" },
    { key: "passedBalls", label: "PB" },
    { key: "caughtStealing", label: "CS" },
    { key: "stolenBasesAllowed", label: "SBA" },
  ],
  pitching: [
    { key: "earnedRunAverage", label: "ERA" },
    { key: "games played", label: "GP" },
    { key: "total pitch count", label: "TPC" },
    { key: "inningsPitched", label: "IP" },
    { key: "pitchesPerInningsPitched", label: "P/IP" },
    { key: "batters faced", label: "BF" },
    { key: "pitchesPerBattersFaced", label: "P/BF" },
    { key: "strikePercentage", label: "S%" },
    { key: "firstPitchStrikePercentage", label: "FPS%" },
    { key: "weakContactPercentage", label: "WEAK%" },
    { key: "battingAverageOnBallsInPlay", label: "BABIP" },
    { key: "battingAverageWithRunnersInScoringPosition", label: "BA/RISP" },
    { key: "wins", label: "W" },
    { key: "losses", label: "L" },
    { key: "saves", label: "SV" },
    { key: "hits", label: "H" },
    { key: "runs", label: "R" },
    { key: "earnedRuns", label: "ER" },
    { key: "strikeouts", label: "SO" },
    { key: "walks", label: "BB" },
    { key: "hitByPitch", label: "HBP" },
    { key: "wildPitches", label: "WP" },
  ],
};

/* ============================ */
/* Helpers / formatting / maps  */
/* ============================ */

const prettyLabel = (raw: string) => {
  const s = raw.replace(/[_\-]+/g, " ");
  const parts = s
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(" ")
    .filter(Boolean);

  return parts
    .map((w) => {
      if (w.length <= 3) return w.toUpperCase();
      return w[0].toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
};

const normalizeKey = (k: string) => k.replace(/[^a-z0-9]/gi, "").toLowerCase();

const Divider = () => (
  <div
    style={{
      height: 1,
      background: "#e5e7eb",
      marginTop: 10,
      marginBottom: 4,
    }}
  />
);

// === BEGIN: alias + blocklist + formatting helpers ===

/** Labels to hide if they show up as "extras" from the raw maps */
const BLOCKLIST: Record<"hitting" | "fielding" | "catching" | "pitching", string[]> = {
  hitting: [
    "gp",
    "hbp",
    "hr",
    "one b",
    "1b",
    "two b",
    "2b",
    "three b",
    "3b",
    "sb pct",
    "sb pct.",
    "sb pct %",
  ],
  fielding: [],
  catching: ["sb"], // suppress SB in Catching extras; show SBA only
  pitching: [
    "ba risp",
    "fps pct",
    "gs",
    "p per bf",
    "p per ip",
    "pitches",
    "s pct",
    "so",
    "weak pct",
  ],
};

/** For each target pill/label, list likely raw keys to read from. Order matters (first hit wins). */
const PILL_ALIASES: Record<string, string[]> = {
  // Hitting
  AVG: ["avg", "battingaverage", "batting_average"],
  OBP: ["obp", "onbasepercentage", "on_base_percentage"],
  SLG: ["slg", "sluggingpercentage", "slugging_percentage"],
  OPS: [
    "ops",
    "onbasepercentageplussluggingpercentage",
    "on_base_plus_slugging",
    "on_base_plus_slugging_percentage",
  ],
  PA: ["pa", "plateappearances", "plate_appearances"],
  AB: ["ab", "atbats", "at_bats"],
  H: ["h", "hits"],
  R: ["r", "runs"],
  RBI: ["rbi", "runsbattedin", "runs_batted_in"],
  SO: ["so", "strikeouts"],
  BB: ["bb", "walks"],
  SB: ["sb", "stolenbases", "stolen_bases"],
  "SB%": ["sbpct", "sb_pct", "sb percent", "sb%", "sbPct"],

  // Fielding
  FPCT: ["fpct", "fieldingpercentage", "fielding_percentage"],
  TC: ["tc", "totalchances", "total_chances"],
  PO: ["po", "putouts", "put_outs"],
  A: ["a", "assists"],
  E: ["e", "errors"],

  // Pitching
  ERA: ["era"],
  GP: ["gp", "gamesplayed", "games_played"],
  TPC: ["pitches", "#p", "totalpitchcount", "total_pitch_count"],
  IP: ["ip", "inningspitched", "innings_pitched"],
  "P/IP": [
    "pperip",
    "p_per_ip",
    "pitchesperinningspitched",
    "pitches_per_innings_pitched",
    "pPerIp",
  ],
  BF: ["bf", "battersfaced", "batters_faced"],
  "P/BF": [
    "pperbf",
    "p_per_bf",
    "pitchesperbattersfaced",
    "pitches_per_batters_faced",
    "pPerBf",
  ],
  "S%": ["spct", "s_pct", "strikepercentage", "strike_percentage", "sPct"],
  "FPS%": [
    "fpspct",
    "fps_pct",
    "firstpitchstrikepercentage",
    "first_pitch_strike_percentage",
    "fpsPct",
  ],
  "WEAK%": [
    "weakpct",
    "weak_pct",
    "weakcontactpercentage",
    "weak_contact_percentage",
    "weakPct",
  ],
  BABIP: ["babip"],
  "BA/RISP": [
    "barisp",
    "ba_risp",
    "battingaveragewithrunnersinscoringposition",
    "batting_average_with_runners_in_scoring_position",
    "baRisp",
  ],
  W: ["w", "wins"],
  L: ["l", "losses"],
  SV: ["sv", "saves"],
  ER: ["er", "earnedruns", "earned_runs"],
  HBP: ["hbp", "hitbypitch", "hit_by_pitch"],
  WP: ["wp", "wildpitches", "wild_pitches"],

  // Catching
  INN: ["inn", "inningscaught", "innings_caught"],
  PB: ["pb", "passedballs", "passed_balls"],
  CS: ["cs", "caughtstealing", "caught_stealing"],
  SBA: ["sb", "sba", "stolenbasesallowed", "stolen_bases_allowed"],
};

/** Human-friendly full names for each pill label (used for hover tooltips). */
const FULL_PILL_NAMES: Record<string, string> = {
  // Hitting
  AVG: "Batting Average",
  OBP: "On-Base Percentage",
  SLG: "Slugging Percentage",
  OPS: "On-Base + Slugging",
  "SB%": "Stolen Base Percentage",
  PA: "Plate Appearances",
  AB: "At Bats",
  H: "Hits",
  R: "Runs",
  RBI: "Runs Batted In",
  SO: "Strikeouts",
  BB: "Walks",
  SB: "Stolen Bases",

  // Fielding
  FPCT: "Fielding Percentage",
  TC: "Total Chances",
  PO: "Putouts",
  A: "Assists",
  E: "Errors",

  // Pitching
  ERA: "Earned Run Average",
  GP: "Games Played",
  TPC: "Total Pitch Count",
  IP: "Innings Pitched",
  "P/IP": "Pitches per Innings Pitched",
  BF: "Batters Faced",
  "P/BF": "Pitches per Batters Faced",
  "S%": "Strike Percentage",
  "FPS%": "First-Pitch Strike Percentage",
  "WEAK%": "Weak Contact Percentage",
  BABIP: "Batting Average on Balls in Play",
  "BA/RISP": "Batting Average with Runners in Scoring Position",
  W: "Wins",
  L: "Losses",
  SV: "Saves",
  ER: "Earned Runs",
  HBP: "Hit By Pitch",
  WP: "Wild Pitches",

  // Catching
  INN: "Innings Caught",
  PB: "Passed Balls",
  CS: "Caught Stealing",
  SBA: "Stolen Bases Allowed",
};

/** Locate a value in the map for a given pill label with aliases. */
function resolveValueForLabel(
  map: StatMap | null | undefined,
  label: string,
  fallbackKey?: string
): StatValue {
  if (!map) return null;

  const index = new Map<string, string>();
  for (const k of Object.keys(map)) {
    index.set(normalizeKey(k), k);
  }

  // 1) Direct hit by canonical key (if provided)
  if (fallbackKey) {
    if (map[fallbackKey] != null && map[fallbackKey] !== "") return map[fallbackKey];

    const normFall = normalizeKey(fallbackKey);
    if (index.has(normFall)) {
      const orig = index.get(normFall)!;
      const v = map[orig];
      if (v != null && v !== "") return v;
    }
  }

  // 2) Try alias list
  const aliases = PILL_ALIASES[label] || [];
  for (const rawKey of aliases) {
    const probes = [
      rawKey,
      rawKey.replace(/\s+/g, ""),
      rawKey.replace(/[\s_]+/g, ""),
    ];
    for (const probe of probes) {
      if (map[probe] != null && map[probe] !== "") return map[probe];

      const norm = normalizeKey(probe);
      if (index.has(norm)) {
        const orig = index.get(norm)!;
        const v = map[orig];
        if (v != null && v !== "") return v;
      }
    }
  }

  // 3) Pretty-name equality as last resort
  const target = label.toLowerCase();
  for (const k of Object.keys(map)) {
    if (prettyLabel(k).toLowerCase() === target) {
      const v = map[k];
      if (v != null && v !== "") return v;
    }
  }

  return null;
}

/** Custom format rules by pill label (string in, string out) */
function formatStatValue(label: string, value: StatValue): string {
  if (value == null || value === "") return "—";

  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);

  const L = label.toUpperCase();

  if (L === "FPCT") return n.toFixed(3);
  if (["AVG", "OBP", "SLG", "OPS", "BABIP", "BA/RISP"].includes(L)) return n.toFixed(3);
  if (L === "ERA") return n.toFixed(3);

  if (["S%", "FPS%", "WEAK%", "SB%"].includes(L)) {
    if (n <= 1) return (n * 100).toFixed(2);
    return n.toFixed(2);
  }

  if (Number.isInteger(n)) return String(n);
  return String(Math.round(n * 1000) / 1000);
}

/** Should a raw key be hidden if it appears as an extra? */
function isBlocked(
  section: "hitting" | "fielding" | "catching" | "pitching",
  rawKey: string
): boolean {
  const name = prettyLabel(rawKey).toLowerCase();
  return BLOCKLIST[section].includes(name);
}

// === END: alias + blocklist + formatting helpers ===

export default function PublicStats({
  stats,
  title = "Stats",
  cardStyle,
  h2Style,
  pillStyle, // currently unused but kept for future styling parity
}: Props) {
  // Normalize "stats" to a flexible base object/array
  const base = (stats || {}) as any;

  // Teams from older shape (if provided)
  const teamsFromBase: TeamEntry[] = Array.isArray(base.teams)
    ? (base.teams as TeamEntry[])
    : [];

  // Seasons from various shapes:
  const seasonsFromBase: StatsSeasonLite[] = Array.isArray(base.seasons)
    ? (base.seasons as StatsSeasonLite[])
    : [];
  const seasonsFromProfile: StatsSeasonLite[] = Array.isArray(base.profile?.seasons)
    ? (base.profile.seasons as StatsSeasonLite[])
    : [];
  const seasonsFromArray: StatsSeasonLite[] = Array.isArray(stats)
    ? (stats as StatsSeasonLite[])
    : [];

  const seasons: StatsSeasonLite[] =
    seasonsFromBase.length > 0
      ? seasonsFromBase
      : seasonsFromProfile.length > 0
      ? seasonsFromProfile
      : seasonsFromArray;

  const { teams = teamsFromBase } = (base as StatsData) || {};

  const derivedTeams: TeamEntry[] = seasons.map((s) => {
    const hitting = s.hitting ?? s.stats?.hitting ?? null;
    const fielding = s.fielding ?? s.stats?.fielding ?? null;
    const catching = s.catching ?? s.stats?.catching ?? null;
    const pitching = s.pitching ?? s.stats?.pitching ?? null;

    const toList = (val: unknown): string[] => {
      if (Array.isArray(val))
        return val
          .map((x) => String(x ?? "").trim())
          .filter(Boolean);
      if (typeof val === "string")
        return val
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean);
      return [];
    };

    const pitchTypes =
      toList(s.pitchTypes) || toList(s.stats?.pitchTypes) || [];

    const statsSeason = s.seasonTerm ?? s.season ?? null;
    const statsYear =
      s.seasonYear ??
      (typeof s.season === "string"
        ? Number((s.season.match(/\b(\d{4})\b/) || [])[1]) || null
        : null);

    const statsFileUrlsArr = Array.isArray(s.statsFileUrls)
      ? s.statsFileUrls
          .map((u) => (u == null ? "" : String(u)))
          .map((u) => u.trim())
          .filter(Boolean)
      : [];

    return {
      kind: s.kind ?? null,
      statsTeamName: s.team ?? s.name ?? null,
      statsSeason,
      statsYear,
      statsUrl:
        statsFileUrlsArr.length > 0
          ? statsFileUrlsArr[statsFileUrlsArr.length - 1]
          : null,
      stats: { hitting, fielding, catching, pitching },
      pitchTypes,
    } as TeamEntry;
  });

  const teamsInput: TeamEntry[] =
    teams && teams.length > 0 ? teams : derivedTeams;

  // ---- styles ----
  const safeCard: React.CSSProperties = {
    marginTop: 16,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 16,
    ...(cardStyle || {}),
  };

  const safeH2: React.CSSProperties = {
    margin: 0,
    fontSize: 18,
    fontWeight: 900,
    ...(h2Style || {}),
  };

  const SectionHeader = ({
    children,
    rightContent,
  }: {
    children: React.ReactNode;
    rightContent?: React.ReactNode;
  }) => (
    <div
      style={{
        marginTop: 8,
        marginBottom: 4,
        fontSize: 14,
        fontWeight: 800,
        color: "#334155",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      <span>{children}</span>
      {rightContent ? (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {rightContent}
        </div>
      ) : null}
    </div>
  );

  /** Get full name for a pill label (fallback to prettified label). */
  const getFullName = (label: string) =>
    FULL_PILL_NAMES[label] || prettyLabel(label);

  // --- small helpers for the table-based layout ---
const hasStatsMap = (m?: StatMap | null) => {
  if (!m || typeof m !== "object") return false;

  const keys = Object.keys(m);
  if (keys.length === 0) return false;

  // meaningful if at least one value is non-empty / non-NaN
  return keys.some((k) => {
    const v = (m as any)[k];
    if (v === null || v === undefined || v === "") return false;
    if (typeof v === "number" && Number.isNaN(v)) return false;
    return true; // 0 counts as meaningful
  });
};

  type SectionKey = "hitting" | "pitching" | "fielding" | "catching";

  const sectionLabels: Record<SectionKey, string> = {
    hitting: "Hitting",
    fielding: "Fielding",
    pitching: "Pitching",
    catching: "Catching",
  };

  const norm = (s?: string | null) => (s ?? "").trim();
  const normKey = (s?: string | null) => norm(s).toLowerCase();

  const seasonRank = (s?: string | null) => {
    const m = normKey(s);
    if (m === "winter") return 1;
    if (m === "spring") return 2;
    if (m === "summer") return 3;
    if (m === "fall") return 4;
    return 0;
  };

  const yearNum = (y: string | number | null | undefined) => {
    if (y === null || y === undefined || y === "") return -Infinity;
    const n = Number(y);
    return Number.isFinite(n) ? n : -Infinity;
  };

  const recencyCmp = (a: TeamEntry, b: TeamEntry) => {
    const yb = yearNum(b.statsYear);
    const ya = yearNum(a.statsYear);
    if (yb !== ya) return yb - ya;

    const sb = seasonRank(b.statsSeason || null);
    const sa = seasonRank(a.statsSeason || null);
    return sb - sa;
  };

  // Keep only rows that have at least one stats section populated
  const rowsWithStats: TeamEntry[] = teamsInput.filter((t) => {
    const s = t.stats;
    if (!s) return false;
    return (
      hasStatsMap(s.hitting) ||
      hasStatsMap(s.fielding) ||
      hasStatsMap(s.catching) ||
      hasStatsMap(s.pitching)
    );
  });

  const sortedRows: TeamEntry[] = rowsWithStats.slice().sort(recencyCmp);

  const hasHitting = sortedRows.some((t) => hasStatsMap(t.stats?.hitting));
  const hasFielding = sortedRows.some((t) => hasStatsMap(t.stats?.fielding));
  const hasPitching = sortedRows.some((t) => hasStatsMap(t.stats?.pitching));
  const hasCatching = sortedRows.some((t) => hasStatsMap(t.stats?.catching));

  const sectionOrder: SectionKey[] = [
    "hitting",
    "fielding",
    "pitching",
    "catching",
  ];

const availableSections: SectionKey[] = sectionOrder.filter((sec) => {
  if (sec === "hitting") return hasHitting;
  if (sec === "fielding") return hasFielding;
  if (sec === "pitching") return hasPitching;
  if (sec === "catching") return hasCatching;
  return false;
});

const [activeSection, setActiveSection] = React.useState<SectionKey>(
  (availableSections[0] as SectionKey) || "hitting"
);
const [selectedYear, setSelectedYear] = React.useState<string>("all");

React.useEffect(() => {
  if (!availableSections.includes(activeSection)) {
    setActiveSection((availableSections[0] as SectionKey) || "hitting");
  }
}, [activeSection, availableSections]);

  // Year options from rows that have a valid statsYear
const yearOptions: number[] = Array.from(
  new Set(
    sortedRows
      .map((t) => {
        const y = t.statsYear;
        if (y === null || y === undefined || y === "") return null;
        const n = Number(y);
        return Number.isFinite(n) ? n : null;
      })
      .filter((y): y is number => y !== null)
  )
).sort((a, b) => b - a);

  /** Build an index from API seasons for backfilling pitch types
   * key = ${team}|${term}|${year} in lower-case
   */
  const buildPitchTypeIndex = (arr?: StatsSeasonLite[] | null) => {
    const idx = new Map<string, string[]>();
    if (!Array.isArray(arr)) return idx;

    const toList = (val: unknown): string[] => {
      if (Array.isArray(val))
        return val
          .map((x) => String(x ?? "").trim())
          .filter(Boolean);
      if (typeof val === "string")
        return val
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean);
      return [];
    };

    for (const s of arr) {
      const team = normKey(s?.team || s?.name || "");
      const term = normKey(s?.seasonTerm || "");
      const year =
        s?.seasonYear == null ? "" : String(s.seasonYear).trim();
      if (!team || !year) continue;

      const key = `${team}|${term}|${year}`;
      const list =
        toList(s?.pitchTypes) || toList(s?.stats?.pitchTypes);

      if (list.length) idx.set(key, list);
    }

    return idx;
  };

  const pitchTypeIndex = buildPitchTypeIndex(seasons);

  const getPitchTypesForTeam = (team: TeamEntry): string[] => {
    let list: string[] = Array.isArray(team.pitchTypes)
      ? team.pitchTypes.filter(Boolean)
      : [];
    if (list.length) return list;

    const teamName = norm(team.statsTeamName) || norm(team.name);
    if (!teamName) return [];

    const teamKey = normKey(teamName);
    const termKey = normKey(team.statsSeason);
    const yearKey =
      team.statsYear != null && team.statsYear !== ""
        ? String(team.statsYear).trim()
        : "";

    const exactKey = `${teamKey}|${termKey}|${yearKey}`;
    const looseKey = `${teamKey}||${yearKey}`;

    const fromExact = pitchTypeIndex.get(exactKey) || [];
    const fromLoose = pitchTypeIndex.get(looseKey) || [];

    list = (fromExact.length ? fromExact : fromLoose).filter(Boolean);
    return list;
  };

  const hasAnyStats =
    sortedRows.length > 0 && availableSections.length > 0;

  const renderSectionTable = (section: SectionKey) => {
    const rowsForSection = sortedRows.filter((row) => {
      const s = row.stats;
      if (!s) return false;

      if (section === "hitting") return hasStatsMap(s.hitting);
      if (section === "pitching") return hasStatsMap(s.pitching);
      if (section === "fielding") return hasStatsMap(s.fielding);
      if (section === "catching") return hasStatsMap(s.catching);
      return false;
    });

    const filteredRows =
      selectedYear === "all"
        ? rowsForSection
        : rowsForSection.filter(
            (r) =>
              r.statsYear != null &&
              String(r.statsYear).trim() === selectedYear
          );

    if (filteredRows.length === 0) {
      return (
        <div
          style={{
            marginTop: 8,
            fontSize: 14,
            color: "#64748b",
            fontWeight: 500,
          }}
        >
          No {sectionLabels[section]} stats available yet.
        </div>
      );
    }

    type ColumnConfig = {
      header: string;
      label: string;
      align?: "left" | "right";
    };

    let columns: ColumnConfig[] = [];

    if (section === "hitting") {
      columns = [
        { header: "GP", label: "GP", align: "right" },
        { header: "PA", label: "PA", align: "right" },
        { header: "AB", label: "AB", align: "right" },
        { header: "R", label: "R", align: "right" },
        { header: "H", label: "H", align: "right" },
        { header: "RBI", label: "RBI", align: "right" },
        { header: "BB", label: "BB", align: "right" },
        { header: "SO", label: "SO", align: "right" },
        { header: "SB", label: "SB", align: "right" },
        { header: "AVG", label: "AVG", align: "right" },
        { header: "OBP", label: "OBP", align: "right" },
        { header: "SLG", label: "SLG", align: "right" },
        { header: "OPS", label: "OPS", align: "right" },
        { header: "SB%", label: "SB%", align: "right" },
      ];
    } else if (section === "pitching") {
      columns = [
        { header: "GP", label: "GP", align: "right" },
        { header: "GS", label: "GS", align: "right" },
        { header: "IP", label: "IP", align: "right" },
        { header: "BF", label: "BF", align: "right" },
        { header: "H", label: "H", align: "right" },
        { header: "R", label: "R", align: "right" },
        { header: "ER", label: "ER", align: "right" },
        { header: "BB", label: "BB", align: "right" },
        { header: "SO", label: "SO", align: "right" },
        { header: "HBP", label: "HBP", align: "right" },
        { header: "WP", label: "WP", align: "right" },
        { header: "ERA", label: "ERA", align: "right" },
        { header: "P/IP", label: "P/IP", align: "right" },
        { header: "P/BF", label: "P/BF", align: "right" },
        { header: "S%", label: "S%", align: "right" },
        { header: "FPS%", label: "FPS%", align: "right" },
        { header: "WEAK%", label: "WEAK%", align: "right" },
        { header: "BABIP", label: "BABIP", align: "right" },
        { header: "BA/RISP", label: "BA/RISP", align: "right" },
        { header: "W", label: "W", align: "right" },
        { header: "L", label: "L", align: "right" },
        { header: "SV", label: "SV", align: "right" },
      ];
    } else if (section === "fielding") {
      columns = [
        { header: "TC", label: "TC", align: "right" },
        { header: "PO", label: "PO", align: "right" },
        { header: "A", label: "A", align: "right" },
        { header: "E", label: "E", align: "right" },
        { header: "FPCT", label: "FPCT", align: "right" },
      ];
    } else if (section === "catching") {
      columns = [
        { header: "INN", label: "INN", align: "right" },
        { header: "PB", label: "PB", align: "right" },
        { header: "SBA", label: "SBA", align: "right" },
        { header: "CS", label: "CS", align: "right" },
      ];
    }

    return (
      <div
        style={{
          marginTop: 12,
          borderRadius: 8,
          border: "1px solid #e5e7eb",
          overflowX: "auto",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: 720,
          }}
        >
          <thead>
            <tr
              style={{
                background: "#f8fafc",
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <th
                style={{
                  textAlign: "left",
                  padding: "8px 10px",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#475569",
                  whiteSpace: "nowrap",
                }}
              >
                Season
              </th>
              <th
                style={{
                  textAlign: "left",
                  padding: "8px 10px",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#475569",
                  whiteSpace: "nowrap",
                }}
              >
                Team
              </th>

              {section === "pitching" && (
                <th
                  style={{
                    textAlign: "left",
                    padding: "8px 10px",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#475569",
                    whiteSpace: "nowrap",
                  }}
                >
                  Pitch Types
                </th>
              )}

              {columns.map((col) => (
                <th
                  key={col.header}
                  title={getFullName(col.label)}
                  style={{
                    textAlign:
                      col.align === "right" ? "right" : "left",
                    padding: "8px 10px",
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#475569",
                    whiteSpace: "nowrap",
                  }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, idx) => {
              const seasonLabelParts: string[] = [];
              if (row.statsSeason) seasonLabelParts.push(row.statsSeason);
              if (row.statsYear != null && row.statsYear !== "") {
                seasonLabelParts.push(String(row.statsYear));
              }
              const seasonLabel =
                seasonLabelParts.length > 0
                  ? seasonLabelParts.join(" ")
                  : "—";

              const teamName =
                norm(row.statsTeamName) || norm(row.name) || "—";

              const statMap =
                section === "hitting"
                  ? row.stats?.hitting
                  : section === "pitching"
                  ? row.stats?.pitching
                  : section === "fielding"
                  ? row.stats?.fielding
                  : row.stats?.catching;

              const pitchTypesList =
                section === "pitching"
                  ? getPitchTypesForTeam(row)
                  : [];

              return (
                <tr
                  key={`${section}-${idx}-${teamName}-${seasonLabel}`}
                  style={{
                    borderBottom: "1px solid #e5e7eb",
                    backgroundColor:
                      idx % 2 === 0 ? "#ffffff" : "#f9fafb",
                  }}
                >
                  <td
                    style={{
                      padding: "6px 10px",
                      fontSize: 12,
                      color: "#0f172a",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {seasonLabel}
                  </td>
                  <td
                    style={{
                      padding: "6px 10px",
                      fontSize: 12,
                      color: "#0f172a",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {teamName}
                  </td>

                  {section === "pitching" && (
                    <td
                      style={{
                        padding: "6px 10px",
                        fontSize: 12,
                        color: "#0f172a",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {pitchTypesList.length > 0
                        ? pitchTypesList.join(", ")
                        : "—"}
                    </td>
                  )}

                  {columns.map((col) => {
                    const rawValue = resolveValueForLabel(
                      statMap,
                      col.label
                    );
                    const display = formatStatValue(
                      col.label,
                      rawValue
                    );

                    return (
                      <td
                        key={col.header}
                        style={{
                          padding: "6px 10px",
                          fontSize: 12,
                          color: "#0f172a",
                          textAlign:
                            col.align === "right"
                              ? "right"
                              : "left",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {display}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <section style={safeCard}>
      <h2 style={safeH2}>{title}</h2>

      {!hasAnyStats ? (
        <div
          style={{
            marginTop: 8,
            fontSize: 14,
            color: "#475569",
            fontWeight: 600,
          }}
        >
          No Stats data available, yet.
        </div>
      ) : (
        <>
          {/* Tabs + Season filter row */}
          <div
            style={{
              marginTop: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            {/* Section tabs */}
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {availableSections.map((sec) => {
                const isActive = sec === activeSection;
                return (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setActiveSection(sec)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: "1px solid",
                      borderColor: isActive
                        ? "#0ea5e9"
                        : "#e2e8f0",
                      background: isActive
                        ? "#e0f2fe"
                        : "#ffffff",
                      color: isActive
                        ? "#0f172a"
                        : "#475569",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {sectionLabels[sec]}
                  </button>
                );
              })}
            </div>

            {/* Season / Year filter */}
            {yearOptions.length > 0 && (
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  color: "#475569",
                  fontWeight: 600,
                }}
              >
                Season:
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  style={{
                    fontSize: 12,
                    padding: "4px 8px",
                    borderRadius: 999,
                    border: "1px solid #cbd5f5",
                    background: "#ffffff",
                    color: "#0f172a",
                    cursor: "pointer",
                  }}
                >
                  <option value="all">Career (All Seasons)</option>
                  {yearOptions.map((y) => (
                    <option key={y} value={String(y)}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <Divider />

          {/* Active section table */}
          {renderSectionTable(activeSection)}
        </>
      )}
    </section>
  );
}
