// app/lib/stats/gamechangerMapping.ts
// Maps GameChanger export headers to ScoutLine Stats objects.
// Works for the Excel export you shared (with duplicate header suffixes like `.1`, `.2`).

export type HittingStats = {
  battingAverage?: number | null;
  gamesPlayed?: number | null;
  plateAppearances?: number | null;
  atBats?: number | null;
  onBasePercentage?: number | null;
  sluggingPercentage?: number | null;
  hits?: number | null;
  singles?: number | null;
  doubles?: number | null;
  triples?: number | null;
  homeRuns?: number | null;
  runsBattedIn?: number | null;
  runsScored?: number | null;
  walks?: number | null;
  strikeOutsH?: number | null;
  hitByPitchH?: number | null;
  stolenBases?: number | null;
  stolenBasePercentage?: number | null;
};

export type FieldingStats = {
  fieldingPercentage?: number | null;
  totalChances?: number | null;
  assists?: number | null;
  putOuts?: number | null;
};

export type CatchingStats = {
  innings?: number | null;
  passedBalls?: number | null;
  stolenBasesAllowed?: number | null;
  /** total CS by defense (GameChanger "CS"); if you track C-specific CS, adjust here */
  caughtStealing?: number | null;
};

export type PitchingStats = {
  earnedRunAverage?: number | null;
  inningsPitched?: number | null;
  gamesPlayed?: number | null;
  gamesStarted?: number | null;
  battersFaced?: number | null;
  numberOfPitches?: number | null;
  wins?: number | null;
  losses?: number | null;
  saves?: number | null;
  hitsAllowed?: number | null;
  runsAllowed?: number | null;
  earnedRuns?: number | null;
  walksAllowed?: number | null;
  strikeOuts?: number | null;
  hitByPitch?: number | null;
  wildPitches?: number | null;
  pitchesPerInningsPitched?: number | null;
  pitchesPerBattersFaced?: number | null;
  strikePercentage?: number | null;
  firstPitchStrikePercentage?: number | null;
  weakContactPercentage?: number | null;
  BattingAverageOnBallsInPlay?: number | null;
  battingAverageWithRunnersInScoringPosition?: number | null;
};

export type GameChangerRow = Record<string, unknown>;

export type ScoutLineStatsBundle = {
  hitting: HittingStats;
  fielding: FieldingStats;
  catching: CatchingStats;
  pitching: PitchingStats;
};

// ---------- helpers ----------
const toNum = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  if (!s) return null;
  // handle "12.3%", "45%" => 0.123, 0.45 only where caller wants that; otherwise parseFloat
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};

const toPct = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  if (s.endsWith("%")) {
    const n = Number(s.slice(0, -1));
    return Number.isFinite(n) ? n / 100 : null;
  }
  const num = Number(s);
  // If sheet already stores decimals (e.g., 0.456), keep it
  if (num <= 1 && num >= 0) return Number.isFinite(num) ? num : null;
  // If sheet stores percent as whole (e.g., 45.6), normalize to 0.456
  return Number.isFinite(num) ? num / 100 : null;
};

// Choose a column safely; supports alternates (e.g., "H.1" vs "H")
const pick = (row: GameChangerRow, ...candidates: string[]) => {
  for (const key of candidates) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      return (row as any)[key];
    }
  }
  return undefined;
};

// ---------- mapping ----------
export function mapGameChangerRowToScoutLine(row: GameChangerRow): ScoutLineStatsBundle {
  // HITTING
  const hitting: HittingStats = {
    battingAverage: toNum(pick(row, "AVG")),
    gamesPlayed: toNum(pick(row, "GP.1")),
    plateAppearances: toNum(pick(row, "PA")),
    atBats: toNum(pick(row, "AB")),
    onBasePercentage: toNum(pick(row, "OBP")),
    sluggingPercentage: toNum(pick(row, "SLG")),
    hits: toNum(pick(row, "H.1", "H")), // prefer the hitting column if the sheet duplicates
    singles: toNum(pick(row, "1B")),
    doubles: toNum(pick(row, "2B")),
    triples: toNum(pick(row, "3B")),
    homeRuns: toNum(pick(row, "HR")),
    runsBattedIn: toNum(pick(row, "RBI")),
    runsScored: toNum(pick(row, "R.1", "R")),
    walks: toNum(pick(row, "BB.1", "BB")),
    strikeOutsH: toNum(pick(row, "SO.1", "SO")),
    hitByPitchH: toNum(pick(row, "HBP.1", "HBP")),
    stolenBases: toNum(pick(row, "SB.1", "SB")),
    stolenBasePercentage: toPct(pick(row, "SB%", "SB%/ATT", "SB% ")), // accept slight header variants
  };

  // FIELDING
  const fielding: FieldingStats = {
    fieldingPercentage: toNum(pick(row, "FPCT")),
    totalChances: toNum(pick(row, "TC")),
    assists: toNum(pick(row, "A")),
    putOuts: toNum(pick(row, "PO")),
  };

  // CATCHING
  const catching: CatchingStats = {
    innings: toNum(pick(row, "INN")),
    passedBalls: toNum(pick(row, "PB")),
    stolenBasesAllowed: toNum(pick(row, "SB.2", "SBA", "SB-ATT")), // prefer SB.2, fallbacks if sheet differs
    caughtStealing: toNum(pick(row, "CS", "CS.2")), // you specified "CS -> Caught Stealing"
  };

  // PITCHING
  const pitching: PitchingStats = {
    earnedRunAverage: toNum(pick(row, "ERA")),
    inningsPitched: toNum(pick(row, "IP")),
    gamesPlayed: toNum(pick(row, "GP.2", "G")),
    gamesStarted: toNum(pick(row, "GS")),
    battersFaced: toNum(pick(row, "BF")),
    numberOfPitches: toNum(pick(row, "#P", "P")),
    wins: toNum(pick(row, "W")),
    losses: toNum(pick(row, "L")),
    saves: toNum(pick(row, "SV")),
    hitsAllowed: toNum(pick(row, "H.2", "H")),
    runsAllowed: toNum(pick(row, "R.2", "R")),
    earnedRuns: toNum(pick(row, "ER")),
    walksAllowed: toNum(pick(row, "BB.2", "BB")),
    strikeOuts: toNum(pick(row, "SO.2", "K", "SO")),
    hitByPitch: toNum(pick(row, "HBP.2", "HBP")),
    wildPitches: toNum(pick(row, "WP")),
    pitchesPerInningsPitched: toNum(pick(row, "P/IP")),
    pitchesPerBattersFaced: toNum(pick(row, "P/BF")),
    strikePercentage: toPct(pick(row, "S%")),
    firstPitchStrikePercentage: toPct(pick(row, "FPS%")),
    weakContactPercentage: toPct(pick(row, "WEAK%")),
    BattingAverageOnBallsInPlay: toNum(pick(row, "BABIP")),
    battingAverageWithRunnersInScoringPosition: toNum(pick(row, "BA/RISP")),
  };

  return { hitting, fielding, catching, pitching };
}

// Optional convenience if your parsed sheet has multiple rows
export function mapFirstPlayer(rows: GameChangerRow[]): ScoutLineStatsBundle | null {
  if (!rows || !rows.length) return null;
  // heuristics: first non-empty "First"/"Last" row that isn't a "Glossary" line
  const idx = rows.findIndex((r) => {
    const first = (r as any)?.First?.toString()?.trim() || "";
    const last = (r as any)?.Last?.toString()?.trim() || "";
    if (!first && !last) return false;
    const label = (r as any)?.Number?.toString()?.trim() || "";
    return first.toLowerCase() !== "glossary" && label.toLowerCase() !== "glossary";
  });
  return mapGameChangerRowToScoutLine(rows[idx >= 0 ? idx : 0]);
}
