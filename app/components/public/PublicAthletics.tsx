"use client";

import * as React from "react";

export type StatValue = string | number | null | undefined;
export type StatMap = Record<string, StatValue>;

export type TeamEntry = {
  // Kind helps grouping (HS/Travel/Other)
  kind?: "High School" | "Travel" | "Other" | string | null;

  // Athletics tab (schedule upload/link + website)
  scheduleUrl?: string | null;
  websiteUrl?: string | null;

  // Stats tab (used for the header line)
  statsTeamName?: string | null;      // Actual Team (from Stats tab form)
  statsSeason?: string | null;        // e.g., Fall, Spring, Summer, Winter
  statsYear?: string | number | null; // e.g., 2024

  // Link to season stats (uploaded in Stats tab "Link to Stats (upload)") — not shown here
  statsUrl?: string | null;

  // Optional raw name/city/state (not rendered, but allowed)
  name?: string | null;
  city?: string | null;
  state?: string | null;

  // Per-team stat groups (from Stats tab) — not shown here
  stats?: {
    hitting?: StatMap | null;
    fielding?: StatMap | null;
    catching?: StatMap | null;
    pitching?: StatMap | null;
  } | null;
};

export type AthleticsData = {
  // Topline
  bio?: string | null;                    // Athletics tab → Player Bio
  eligibilityRegistered?: boolean | null; // NCAA/NAIA eligibility centers checkbox

  // Positions/handedness row (duplicated from header)
  primaryPos?: string | null;
  secondaryPos?: string[] | null;
  pitcher?: string | null; // e.g., RHP/LHP or R/L/S if you prefer
  bats?: string | null;    // R/L/S
  throws?: string | null;  // R/L/S

  // Teams (rows)
  teams?: TeamEntry[] | null;
};

type Props = {
  athletics: AthleticsData;
  title?: string;

  // Optional shared styles
  cardStyle?: React.CSSProperties;
  h2Style?: React.CSSProperties;
  pillStyle?: React.CSSProperties;
};

export default function PublicAthletics({
  athletics,
  title = "Athletics",
  cardStyle,
  h2Style,
  pillStyle,
}: Props) {
  const {
    bio,
    eligibilityRegistered,
    primaryPos,
    secondaryPos,
    pitcher,
    bats,
    throws,
    teams = [],
  } = athletics || {};

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

  const basePill: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 800,
    color: "#0f172a",
    background: "#f1f5f9",
    border: "1px solid #e2e8f0",
    borderRadius: 999,
    padding: "5px 10px",
    lineHeight: 1,
    whiteSpace: "nowrap",
    ...(pillStyle || {}),
  };

  const mutedPill: React.CSSProperties = {
    ...basePill,
    color: "#334155",
    background: "#f8fafc",
    borderColor: "#e2e8f0",
  };

  const regPillStyle: React.CSSProperties = eligibilityRegistered
    ? { background: "#0ea5e9", borderColor: "#0ea5e9", color: "#0f172a" }
    : { background: "#f1f5f9", borderColor: "#cbd5e1", color: "#334155" };

  const regLabel = eligibilityRegistered
    ? "Registered with NCAA and NAIA"
    : "Not Registered with NCAA or NAIA";

  const RowWrap = ({ children }: { children: React.ReactNode }) => (
    <div
      style={{
        marginTop: 8,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {children}
    </div>
  );

  const InlineRow = ({ children }: { children: React.ReactNode }) => (
    <div
      style={{
        marginTop: 8,
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      {children}
    </div>
  );

  const teamHeadingStyle: React.CSSProperties = {
    fontWeight: 800,
    color: "#0ea5e9",
    marginBottom: 0,
    fontSize: 14,
  };

  const teamHeadingLinkStyle: React.CSSProperties = {
    ...teamHeadingStyle,
    textDecoration: "none",
    cursor: "pointer",
  };

  const teamMetaStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: "#334155",
  };

  // ---- small helpers ----
  const LinkPill = ({
    href,
    children,
    title,
  }: {
    href: string;
    children: React.ReactNode;
    title?: string;
  }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        ...basePill,
        textDecoration: "none",
        display: "inline-block",
        background: "#0ea5e9",
        borderColor: "#0ea5e9",
        color: "#0f172a",
      }}
      title={title}
    >
      {children}
    </a>
  );

  // ---- recency logic: pick most recent per (kind, teamName) and sort blocks newest-first ----
  const norm = (s?: string | null) => (s ?? "").trim();
  const normKey = (s?: string | null) => norm(s).toLowerCase();

  const seasonRank = (s?: string | null) => {
    const m = normKey(s);
    if (m === "winter") return 1;
    if (m === "spring") return 2;
    if (m === "summer") return 3;
    if (m === "fall") return 4;
    return 0; // unknown
  };

  const yearNum = (y: string | number | null | undefined) => {
    if (y === null || y === undefined || y === "") return -Infinity;
    const n = Number(y);
    return Number.isFinite(n) ? n : -Infinity;
  };

  const recencyCmp = (a: TeamEntry, b: TeamEntry) => {
    const yb = yearNum(b.statsYear);
    const ya = yearNum(a.statsYear);
    if (yb !== ya) return yb - ya; // newer year first
    const sb = seasonRank(b.statsSeason);
    const sa = seasonRank(a.statsSeason);
    return sb - sa; // newer season first
  };

  type GroupKey = string; // `${kindLower}|${teamNameLower}`
  const groups = new Map<GroupKey, TeamEntry[]>();

  for (const t of teams) {
    const kindLower = normKey(t.kind);
    const teamName = norm(t.statsTeamName) || norm(t.name); // prefer Stats tab team name
    const teamLower = normKey(teamName);
    const key: GroupKey = `${kindLower}|${teamLower}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }

  const latestFromGroup = (arr: TeamEntry[]): TeamEntry =>
    arr.slice().sort(recencyCmp)[0];

  // Split latest entries into HS / Travel / Others
  let latestHS: TeamEntry[] = [];
  let latestTravel: TeamEntry[] = [];
  let latestOther: TeamEntry[] = [];

  for (const arr of groups.values()) {
    const latest = latestFromGroup(arr);
    const kindLower = normKey(latest.kind);
    if (kindLower === "high school") {
      latestHS.push(latest);
    } else if (kindLower === "travel") {
      latestTravel.push(latest);
    } else {
      latestOther.push(latest);
    }
  }

  // Sort each bucket by recency (newest first)
  latestHS = latestHS.slice().sort(recencyCmp);
  latestTravel = latestTravel.slice().sort(recencyCmp);
  latestOther = latestOther.slice().sort(recencyCmp);

  // Only render buckets that have real entries
  const hsBlocks = latestHS;
  const travelBlocks = latestTravel;
  const otherBlocks = latestOther;

  const TeamBlock = ({
    fallbackLabel,
    team,
  }: {
    fallbackLabel: string;
    team: TeamEntry;
  }) => {
    const teamNameRaw =
      (team.statsTeamName ?? team.name ?? "").trim() || fallbackLabel;
    const loc =
      [team.city, team.state].filter(Boolean).join(", ").trim() || null;

    // ✅ CLICKABLE NAME LOGIC (NEW):
    // - Prefer websiteUrl
    // - If websiteUrl is empty, fall back to scheduleUrl
    const websiteRaw = (team.websiteUrl ?? "").trim();
    const scheduleRaw = (team.scheduleUrl ?? "").trim();
    const clickableUrl = websiteRaw || scheduleRaw || null;
    const hasClickable = !!clickableUrl;

    // Schedule pill still uses the actual schedule URL
    const hasSchedule = !!scheduleRaw;

    const yearStr =
      team.statsYear != null && String(team.statsYear).trim() !== ""
        ? String(team.statsYear).trim()
        : null;

    return (
      <div
        style={{
          padding: "8px 10px",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          background: "#ffffff",
        }}
      >
        {/* Header row: Team (clickable if any URL) + optional meta + Schedule pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexWrap: "wrap",
              minWidth: 0,
            }}
          >
            {hasClickable ? (
              <a
                href={clickableUrl!}
                target="_blank"
                rel="noopener noreferrer"
                style={teamHeadingLinkStyle}
                title={clickableUrl || undefined}
              >
                {teamNameRaw}
              </a>
            ) : (
              <div style={teamHeadingStyle}>{teamNameRaw}</div>
            )}

            {loc && <span style={teamMetaStyle}>• {loc}</span>}

            {team.statsSeason && (
              <span style={teamMetaStyle}>• {team.statsSeason}</span>
            )}

            {yearStr && <span style={teamMetaStyle}>• {yearStr}</span>}
          </div>

          {hasSchedule ? (
            <LinkPill href={scheduleRaw} title="View Team Schedule">
              Link to Team Schedule
            </LinkPill>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <section style={safeCard}>
      {/* Title with eligibility pill inline to the RIGHT of "Athletics" */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <h2 style={safeH2}>{title}</h2>
        <span style={{ ...basePill, ...regPillStyle }} title={regLabel}>
          {regLabel}
        </span>
      </div>

      {/* Positions / Handedness pills */}
      <InlineRow>
        <span style={basePill}>Primary Pos: {primaryPos || "—"}</span>
        <span style={basePill}>
          Secondary Pos:{" "}
          {secondaryPos && secondaryPos.length > 0
            ? secondaryPos.join(", ")
            : "—"}
        </span>

        {/* Only show Pitcher pill when handedness is present & valid */}
        {(pitcher === "RHP" || pitcher === "LHP") && (
          <span style={basePill}>Pitcher: {pitcher}</span>
        )}

        <span style={basePill}>Bats: {bats || "—"}</span>
        <span style={basePill}>Throws: {throws || "—"}</span>
      </InlineRow>

      {/* Athletic Bio */}
      {bio ? (
        <div style={{ marginTop: 10 }}>
          <div
            style={{
              fontWeight: 800,
              color: "#334155",
              marginBottom: 4,
            }}
          >
            Athletic Bio:
          </div>
          <div style={{ color: "#334155", whiteSpace: "pre-wrap" }}>{bio}</div>
        </div>
      ) : null}

      {/* Teams — render only when present */}
      <RowWrap>
        {hsBlocks.map((t, i) => (
          <TeamBlock
            key={`hs-${i}-${t.statsTeamName || t.name || "hs"}`}
            fallbackLabel="High School Team"
            team={t}
          />
        ))}

        {travelBlocks.map((t, i) => (
          <TeamBlock
            key={`travel-${i}-${t.statsTeamName || t.name || "travel"}`}
            fallbackLabel="Travel Team"
            team={t}
          />
        ))}

        {otherBlocks.map((t, i) => (
          <TeamBlock
            key={`other-${i}-${t.statsTeamName || t.name || "other"}`}
            fallbackLabel="Other Team"
            team={t}
          />
        ))}
      </RowWrap>
    </section>
  );
}
