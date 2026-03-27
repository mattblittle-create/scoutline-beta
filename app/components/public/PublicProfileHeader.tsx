// app/components/public/PublicProfileHeader.tsx
"use client";

import * as React from "react";
import PublicAvatar from "@/app/components/shared/PublicAvatar";
import CommittedBadge from "@/app/components/profile/CommittedBadge";
import { BASELINES } from "@/app/lib/metrics-baselines";

export type HeaderProfile = {
  firstName?: string | null;
  lastName?: string | null;
  primaryPhotoUrl?: string | null;

  gradYear?: number | string | null;
  gpa?: number | string | null;
  heightFt?: number | null;
  heightIn?: number | null;
  weightLb?: number | null;
  age?: number | null;
  dob?: string | null;

  committed?: { isCommitted: boolean; program?: string | null } | null;
  positions?: { primary?: string | null; secondary?: string[] | null } | null;

  pitcherHand?: string | null;
  bats?: string | null;
  throws?: string | null;

  // Preferred locations if available:
  ncaaId?: string | number | null;
  naiaEcid?: string | number | null;

  athletics?: {
    ncaaId?: string | number | null;
    naiaEcid?: string | number | null;
  } | null;

  eligibility?: {
    ncaaId?: string | number | null;
    naiaEcid?: string | number | null;
    ncaaEligibilityId?: string | number | null;
    naiaEcId?: string | number | null;
  } | null;

  [key: string]: any;
};

type MetricValue = number | string | null;
type Latest = { value: MetricValue; date?: string | null; source?: string | null };

type Props = {
  profile: HeaderProfile;
  metrics?: Record<string, unknown> | null;
  demoMode?: "global" | "allowlist" | "query" | null;
  cardStyle?: React.CSSProperties;
  h1Style?: React.CSSProperties;
  pillStyle?: React.CSSProperties;
};

// --- helpers -------------------------------------------------------------

const coerceId = (v: unknown): string | null => {
  if (v == null) return null;
  if (typeof v === "number") return String(v);
  if (typeof v === "string") {
    const s = v.trim();
    return s ? s : null;
  }
  return null;
};

const pickFirst = (...vals: Array<unknown>): string | null => {
  for (const v of vals) {
    const s = coerceId(v);
    if (s) return s;
  }
  return null;
};

// Deep, case-insensitive scan for likely keys (e.g., "NCAAEligibilityId", "naia_ec_id")
const deepFindId = (
  root: unknown,
  keyRegex: RegExp,
  maxDepth = 4
): string | null => {
  if (root == null || typeof root !== "object" || maxDepth < 0) return null;

  const queue: any[] = [root];
  let depth = 0;

  while (queue.length && depth <= maxDepth) {
    const nextLevelCount = queue.length;
    for (let i = 0; i < nextLevelCount; i++) {
      const obj = queue.shift();
      if (obj && typeof obj === "object") {
        for (const [k, v] of Object.entries(obj)) {
          if (keyRegex.test(k)) {
            const s = coerceId(v);
            if (s) return s;
          }
          if (v && typeof v === "object") queue.push(v);
        }
      }
    }
    depth++;
  }
  return null;
};

// Reusable clipboard helper (with small fallback)
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export default function PublicProfileHeader({
  profile,
  metrics,
  demoMode,
  cardStyle,
  h1Style,
  pillStyle,
}: Props) {
  const firstName = profile.firstName || "";
  const lastName = profile.lastName || "";
  const primaryPhotoUrl = profile.primaryPhotoUrl || undefined;

  const committedForHeader = {
    isCommitted: !!profile.committed?.isCommitted,
    college: profile.committed?.program || undefined,
  };

  const positions = profile.positions || {};
  const primaryPos = positions.primary || null;
  const secondaryPos = Array.isArray(positions.secondary) ? positions.secondary : [];

  // --- Position-based flags for metrics -----------------------------------
  const hasPPosition = primaryPos === "P" || secondaryPos.includes("P");
  const isPitcherYes =
    String((profile as any)?.isPitcher ?? "").trim().toLowerCase() === "yes";

  const INF_POS = new Set(["1B", "2B", "SS", "3B"]);
  const OF_POS = new Set(["LF", "CF", "RF"]);

  const hasInfPosition =
    (primaryPos && INF_POS.has(primaryPos)) ||
    secondaryPos.some((p) => INF_POS.has(p));

  const hasOfPosition =
    (primaryPos && OF_POS.has(primaryPos)) ||
    secondaryPos.some((p) => OF_POS.has(p));

  const hasUtilityPosition =
    primaryPos === "Utility" || secondaryPos.includes("Utility");

  let pitcherHandNorm: "RHP" | "LHP" | null = null;
  const rawPitcherHand = (profile as any)?.pitcherHand ?? null;
  if (rawPitcherHand) {
    const s = String(rawPitcherHand).trim().toUpperCase();
    if (s === "RHP" || s === "R") pitcherHandNorm = "RHP";
    else if (s === "LHP" || s === "L") pitcherHandNorm = "LHP";
  }
  const showPitcherPill = !!pitcherHandNorm && (hasPPosition || isPitcherYes);

  const hasCPosition = primaryPos === "C" || secondaryPos.includes("C");
  const showCatcherMetrics = hasCPosition;
  const showPitchingMetrics = hasPPosition || showPitcherPill;

  // --- ID resolution (explicit paths -> deep scan fallback) --------------
  const ncaaIdExplicit = pickFirst(
    (profile as any)?.ncaaId,
    (profile as any)?.NCAAId,
    (profile as any)?.eligibility?.ncaaId,
    (profile as any)?.eligibility?.NCAAId,
    (profile as any)?.eligibility?.ncaaEligibilityId,
    (profile as any)?.athletics?.ncaaId
  );

  const naiaEcidExplicit = pickFirst(
    (profile as any)?.naiaEcid,
    (profile as any)?.NAIAEcid,
    (profile as any)?.naiaEcId,
    (profile as any)?.eligibility?.naiaEcid,
    (profile as any)?.eligibility?.NAIAEcid,
    (profile as any)?.eligibility?.naiaEcId,
    (profile as any)?.athletics?.naiaEcid
  );

  // Fallbacks: scan anywhere on the object for likely keys.
  const ncaaIdDisplay =
    ncaaIdExplicit ??
    deepFindId(profile, /ncaa.*(eligibility)?\s*id$/i) ??
    deepFindId(profile, /^ncaaid$/i);

  const naiaEcidDisplay =
    naiaEcidExplicit ??
    deepFindId(profile, /naia.*(ec)?\s*id$/i) ??
    deepFindId(profile, /^naiaecid$/i);

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.debug("[PublicProfileHeader] IDs resolved:", {
      ncaaIdExplicit,
      naiaEcidExplicit,
      ncaaIdDisplay,
      naiaEcidDisplay,
    });
  }

  // ---- UI tokens ---------------------------------------------------------
  const safePill: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 700,
    color: "#475569",
    background: "#f1f5f9",
    border: "1px solid #e2e8f0",
    borderRadius: 999,
    padding: "3px 10px",
    ...(pillStyle || {}),
  };
  const safeCard: React.CSSProperties = {
    marginTop: 16,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 16,
    ...(cardStyle || {}),
  };
  const safeH1: React.CSSProperties = {
    fontSize: "1.75rem",
    fontWeight: 900,
    margin: 0,
    ...(h1Style || {}),
  };

  const normalizeHand = (hand?: string | null) => {
    if (!hand) return "—";
    const s = String(hand).trim().toLowerCase();
    if (["r", "right", "rh", "rhp"].includes(s)) return "R";
    if (["l", "left", "lh", "lhp"].includes(s)) return "L";
    if (["s", "switch", "both"].includes(s)) return "S";
    return hand;
  };

  const batsDisplay = normalizeHand(profile.bats ?? null);
  const throwsDisplay = normalizeHand(profile.throws ?? null);

  const formatGPA = (g: HeaderProfile["gpa"]) => {
    if (g === null || g === undefined || g === "") return "—";
    const n = Number(g);
    if (Number.isFinite(n)) return n.toFixed(2);
    return String(g).trim();
  };

  const calcAgeFromDob = (dob?: string | null) => {
    if (!dob) return null;
    const d = new Date(dob);
    if (isNaN(d.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
    return age;
  };

  const displayAge = profile.age ?? calcAgeFromDob(profile.dob) ?? null;

  // --- Hometown (from Core tab) -------------------------------------------
  const hometownCity =
    ((profile as any).hometown as string | null | undefined) ??
    ((profile as any).hometownCity as string | null | undefined) ??
    null;

  const hometownState =
    ((profile as any).state as string | null | undefined) ??
    ((profile as any).hometownState as string | null | undefined) ??
    null;

  const hometownLabel = [hometownCity, hometownState]
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean)
    .join(", ");

  const formatHeight = (ft?: number | null, inches?: number | null) => {
    const f = typeof ft === "number" ? ft : null;
    const i = typeof inches === "number" ? inches : null;
    if (f === null && i === null) return "—";
    if (f !== null && i !== null) return `${f}' ${i}"`;
    if (f !== null) return `${f}'`;
    if (i !== null) return `${i}"`;
    return "—";
  };

  const formatWeight = (lb?: number | null) => {
    if (typeof lb !== "number") return "—";
    return `${Math.round(lb)} lb`;
  };

  const parseMmYyyy = (s?: string | null): Date | null => {
    if (!s) return null;
    const m = String(s).trim().match(/^(\d{1,2})\/(\d{4})$/);
    if (!m) return null;
    const mm = Number(m[1]);
    const yy = Number(m[2]);
    if (mm < 1 || mm > 12) return null;
    return new Date(yy, mm - 1, 1);
  };

  const fmtDate = (d?: string | null) => {
    if (!d) return "";
    const m = parseMmYyyy(d);
    if (m) return m.toLocaleDateString(undefined, { year: "numeric", month: "short" });
    const n = new Date(d);
    if (isNaN(n.getTime())) return String(d);
    return n.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const ageOnDate = (dob?: string | null, on?: string | null): number | null => {
    if (!dob || !on) return null;
    const A = parseMmYyyy(on) ?? new Date(on);
    const B = new Date(dob);
    if (isNaN(A.getTime()) || isNaN(B.getTime())) return null;
    let years = A.getFullYear() - B.getFullYear();
    const m = A.getMonth() - B.getMonth();
    if (m < 0 || (m === 0 && A.getDate() < B.getDate())) years--;
    return years;
  };

const baselineKeyFor = (key: string): string | null => {
  const map: Record<string, string> = {
    homeToFirst: "homeToFirst",
    sixtyYdDash: "sixtyYdDash",
    sixtyYd: "sixtyYdDash",
    exitVelo: "exitVelo",
    rawThrowVelo: "rawThrowVelo",
    benchPress: "benchPress",
    squat: "squat",
    deadLift: "deadLift",
    popTime: "popTime",
    avgFbVelo: "avgFbVelo",
    avgChVelo: "avgChVelo",
    avgBbVelo: "avgBbVelo",
    fbVelo: "avgFbVelo",
    chVelo: "avgChVelo",
    bbVelo: "avgBbVelo",
    infieldVelo: "rawThrowVelo",
    outfieldVelo: "rawThrowVelo",
    catcherVelo: "rawThrowVelo",
  };
  return map[key] ?? null;
};

  const unitForKey = (key: string): "sec" | "mph" | "lb" => {
    const secs = new Set(["homeToFirst", "sixtyYdDash", "sixtyYd", "popTime"]);
    const mphs = new Set([
      "exitVelo",
      "rawThrowVelo",
      "avgFbVelo",
      "avgChVelo",
      "avgBbVelo",
      "fbVelo",
      "chVelo",
      "bbVelo",
      "infieldVelo",
      "outfieldVelo",
      "catcherVelo",
    ]);
    if (secs.has(key)) return "sec";
    if (mphs.has(key)) return "mph";
    return "lb";
  };

  const fmtWithUnit = (n: number | null | undefined, unit: "sec" | "mph" | "lb") => {
    if (n == null || Number.isNaN(n)) return "—";
    if (unit === "sec") return `${Number(n).toFixed(2).replace(/\.00$/, "")} sec`;
    if (unit === "mph") return `${Number(n).toFixed(1).replace(/\.0$/, "")} mph`;
    return `${Math.round(Number(n))} lb`;
  };

  const avgAtAgeFromBaselines = (key: string, age: number | null): number | null => {
    if (age == null) return null;
    const bKey = baselineKeyFor(key);
    if (!bKey) return null;
    const tbl = (BASELINES as any)[bKey] as Record<number, number> | undefined;
    if (!tbl) return null;
    const ages = Object.keys(tbl)
      .map(Number)
      .sort((a, b) => a - b);
    if (!ages.length) return null;
    let nearest = ages[0],
      diff = Math.abs(age - nearest);
    for (let i = 1; i < ages.length; i++) {
      const dd = Math.abs(age - ages[i]);
      if (dd < diff || (dd === diff && ages[i] < nearest)) {
        nearest = ages[i];
        diff = dd;
      }
    }
    return tbl[nearest] ?? null;
  };

  const buildTooltip = (key: string, latest: Latest): string | undefined => {
    if (!latest) return undefined;
    const row1 = latest.date ? `As of ${fmtDate(latest.date)}` : undefined;
    const age = ageOnDate(profile.dob ?? null, latest.date ?? null);
    const unit = unitForKey(key);
    const avg = avgAtAgeFromBaselines(key, age);
    const row2 = age != null ? `Avg at Age ${age}: ${fmtWithUnit(avg, unit)}` : undefined;
    const src = (latest.source && String(latest.source).trim()) || "";
    const row3 = src ? `Source: ${src}` : undefined;
    const rows = [row1, row2, row3].filter(Boolean) as string[];
    return rows.length ? rows.join("\n") : undefined;
  };

  const asArray = (x: any): any[] => (Array.isArray(x) ? x : x == null ? [] : [x]);

  const tsFromEntry = (entry: any): number => {
    const raw =
      entry?.monthYear ??
      entry?.date ??
      entry?.recordedAt ??
      entry?.takenAt ??
      entry?.measuredAt ??
      entry?.ts ??
      null;

    if (!raw) return -Infinity;
    const mmYy = parseMmYyyy(raw);
    if (mmYy) return mmYy.getTime();
    const n = new Date(raw).getTime();
    return isNaN(n) ? -Infinity : n;
  };

  const pickLatestFromArray = (arr: any[]): Latest => {
    if (!arr || arr.length === 0)
      return { value: null, date: null, source: null };
    let best: Latest = { value: null, date: null, source: null };
    let bestTs = -Infinity;
    for (const it of arr) {
      if (it && typeof it === "object") {
        const v = ("value" in it ? (it as any).value : null) as MetricValue;
        const d =
          (it as any).monthYear ??
          (it as any).date ??
          (it as any).recordedAt ??
          (it as any).takenAt ??
          (it as any).measuredAt ??
          (it as any).ts ??
          null;
        const s = (it as any).source ?? null;
        const ts = tsFromEntry(it);
        if (ts > bestTs && v !== null && v !== undefined) {
          best = { value: v, date: d ?? null, source: s };
          bestTs = ts;
        }
      }
    }
    return best;
  };

  const pickLatestByKey = (all: any, key: string): Latest => {
    if (!all) return { value: null, date: null, source: null };

    const seriesArr = Array.isArray((all as any).series)
      ? (all as any).series
      : null;
    if (seriesArr) {
      const found = seriesArr.find((s: any) => s?.key === key);
      if (found && Array.isArray(found.points)) return pickLatestFromArray(found.points);
    }

    const flat = (all as any)[key];
    if (Array.isArray(flat)) return pickLatestFromArray(flat);

    const alias: Record<string, string[]> = {
      sixtyYdDash: ["sixtyYd", "sixty", "_60yd"],
      rawThrowVelo: ["rawVelo", "rawVelocity", "armVelo", "armVelocity"],
      exitVelo: ["exitVelocity", "maxEV"],
      benchPress: ["bench", "maxBench"],
      squat: ["backSquat", "maxSquat"],
      avgFbVelo: [
        "avgFBVelo",
        "fbVelo",
        "fastballAvg",
        "fbAvg",
        "fastballVelocityAvg",
        "fbVeloAvg",
      ],
      avgChVelo: [
        "chVelo",
        "changeupAvg",
        "chAvg",
        "changeupVelocityAvg",
        "chVeloAvg",
      ],
      avgBbVelo: [
        "bbVelo",
        "breakingBallAvg",
        "bbAvg",
        "sliderAvg",
        "curveballAvg",
        "cbAvg",
        "slAvg",
        "brkVeloAvg",
      ],
      popTime: ["catcherPop", "pop_time", "ctPop"],
      homeToFirst: ["home_to_first", "ht1", "homeTo1st"],
      infieldVelo: ["infieldThrowVelo", "ifVelo", "infieldVelocity"],
      outfieldVelo: ["outfieldThrowVelo", "ofVelo", "outfieldVelocity"],
      catcherVelo: ["catcherThrowVelo", "cVelo", "catcherVelocity"],
    };
    const alts = alias[key] || [];
    for (const k of alts) {
      const alt = (all as any)[k];
      if (Array.isArray(alt)) return pickLatestFromArray(alt);
    }

    const val = (all as any)[key];
    if (typeof val === "number" || typeof val === "string")
      return { value: val, date: null, source: null };
    if (val && typeof val === "object" && "value" in val) {
      const d =
        (val as any).monthYear ??
        (val as any).date ??
        (val as any).recordedAt ??
        (val as any).takenAt ??
        (val as any).measuredAt ??
        (val as any).ts ??
        null;
      const s = (val as any).source ?? null;
      return {
        value: (val as any).value ?? null,
        date: d ?? null,
        source: s,
      };
    }

    return { value: null, date: null, source: null };
  };

  const m = (metrics ?? {}) as any;
  const latestHomeToFirst = pickLatestByKey(m, "homeToFirst");
  const latestSixty = pickLatestByKey(m, "sixtyYdDash");
  const latestExitVelo = pickLatestByKey(m, "exitVelo");
  const latestRawVelo = pickLatestByKey(m, "rawThrowVelo");
  const latestBench = pickLatestByKey(m, "benchPress");
  const latestSquat = pickLatestByKey(m, "squat");
  const latestDeadLift = pickLatestByKey(m, "deadLift");
  const latestPopTime = pickLatestByKey(m, "popTime");
  const latestAvgFB = pickLatestByKey(m, "avgFbVelo");
  const latestAvgCH = pickLatestByKey(m, "avgChVelo");
  const latestAvgBB = pickLatestByKey(m, "avgBbVelo");
  const latestInfieldVelo = pickLatestByKey(m, "infieldVelo");
  const latestOutfieldVelo = pickLatestByKey(m, "outfieldVelo");
  const latestCatcherVelo = pickLatestByKey(m, "catcherVelo");

  const asNumber = (x: MetricValue): number | null => {
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
  };
  const fmtSec = (x: MetricValue) => {
    const n = asNumber(x);
    if (n == null) return "—";
    return n.toFixed(2).replace(/\.00$/, "");
  };
  const fmtMph = (x: MetricValue) => {
    const n = asNumber(x);
    if (n == null) return "—";
    return `${n.toFixed(1).replace(/\.0$/, "")} mph`;
  };
  const fmtLb = (x: MetricValue) => {
    const n = asNumber(x);
    if (n == null) return "—";
    return `${Math.round(n)} lb`;
  };

  // --- Copy-to-clipboard state for ID pills --------------------------------
  const [copiedNcaa, setCopiedNcaa] = React.useState(false);
  const [copiedNaia, setCopiedNaia] = React.useState(false);

  const pillInteractive: React.CSSProperties = {
    ...safePill,
    color: "#0369a1",
    borderColor: "#bae6fd",
    background: "#e0f2fe",
    cursor: "pointer",
    userSelect: "none",
  };

  const handleCopy = React.useCallback(
    async (text: string, kind: "ncaa" | "naia") => {
      const ok = await copyToClipboard(text);
      if (kind === "ncaa") {
        setCopiedNcaa(true);
        setTimeout(() => setCopiedNcaa(false), 1500);
      } else {
        setCopiedNaia(true);
        setTimeout(() => setCopiedNaia(false), 1500);
      }
      return ok;
    },
    []
  );

  // --- Position-gated visibility for throwing metrics ----------------------
  const hasInfieldMetric =
    hasInfPosition && asNumber(latestInfieldVelo.value) != null;
  const hasOutfieldMetric =
    hasOfPosition && asNumber(latestOutfieldVelo.value) != null;
  const hasCatcherMetric =
    hasCPosition && asNumber(latestCatcherVelo.value) != null;
  const hasRawMetric =
    hasUtilityPosition && asNumber(latestRawVelo.value) != null;

  return (
    <section
      style={{
        ...safeCard,
        position: "relative",
        display: "flex",
        gap: 0,
        alignItems: "center",
        paddingLeft: 0,
        paddingRight: 0,
      }}
    >
      {demoMode ? (
        <div style={{ position: "absolute", top: 12, right: 12 }}>
          <span
            style={{
              ...safePill,
              background: "#0ea5e9",
              color: "#0f172a",
              borderColor: "#0ea5e9",
            }}
          >
            Demo: {demoMode}
          </span>
        </div>
      ) : null}

      <div style={{ marginLeft: -12 }}>
        <PublicAvatar
          firstName={firstName}
          lastName={lastName}
          photoUrl={primaryPhotoUrl}
          size={(() => {
            let rows = 3;
            rows += 1;
            rows += 1;
            if (hasCPosition || showPitchingMetrics) rows += 1;
            return rows >= 6 ? 200 : rows >= 5 ? 150 : 180;
          })()}
        />
      </div>

      <div style={{ minWidth: 0 }}>
        {/* Committed + ID pills */}
        <div
          style={{
            marginBottom: 6,
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <CommittedBadge
            committed={committedForHeader}
            size="md"
            variant="solid"
            showCollege
            accentHex="#ca9a3f"
          />

          {ncaaIdDisplay && (
            <span
              role="button"
              aria-label="Copy NCAA Eligibility Center ID"
              onClick={() => handleCopy(ncaaIdDisplay, "ncaa")}
              style={pillInteractive}
              title={copiedNcaa ? "Copied!" : "Click to copy NCAA ID"}
            >
              NCAA ID#: {ncaaIdDisplay}
            </span>
          )}

          {naiaEcidDisplay && (
            <span
              role="button"
              aria-label="Copy NAIA Eligibility Center ID"
              onClick={() => handleCopy(naiaEcidDisplay, "naia")}
              style={pillInteractive}
              title={copiedNaia ? "Copied!" : "Click to copy NAIA EC ID"}
            >
              NAIA EC ID#: {naiaEcidDisplay}
            </span>
          )}
        </div>

        {/* Row 1: Name + Hometown */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <h1 style={{ ...safeH1, lineHeight: 1 }}>
            {firstName || "—"} {lastName || ""}
          </h1>

          {hometownLabel && (
            <span
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#6b7280",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {hometownLabel}
            </span>
          )}
        </div>

        {/* Row 2 */}
        <div
          style={{
            marginTop: 6,
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span style={safePill}>Grad Year: {profile.gradYear ?? "—"}</span>
          <span style={safePill}>GPA: {formatGPA(profile.gpa)}</span>
          <span style={safePill}>Age: {displayAge ?? "—"}</span>
          <span style={safePill}>
            Height: {formatHeight(profile.heightFt, profile.heightIn)}
          </span>
          <span style={safePill}>Weight: {formatWeight(profile.weightLb)}</span>
          {profile.dob ? <span style={safePill}>DOB: {profile.dob}</span> : null}
        </div>

        {/* Row 3 */}
        <div
          style={{
            marginTop: 6,
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span style={safePill}>Primary Pos: {primaryPos || "—"}</span>
          <span style={safePill}>
            Secondary Pos:{" "}
            {secondaryPos && secondaryPos.length > 0
              ? secondaryPos.join(", ")
              : "—"}
          </span>
          {showPitcherPill && (
            <span style={safePill}>Pitcher: {pitcherHandNorm}</span>
          )}
          <span style={safePill}>Bats: {batsDisplay}</span>
          <span style={safePill}>Throws: {throwsDisplay}</span>
        </div>

        {/* Row 4 – speed + exit + position-aware throwing metrics */}
        <div
          style={{
            marginTop: 6,
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span
            style={safePill}
            title={buildTooltip("homeToFirst", latestHomeToFirst)}
          >
            Home to 1st: {fmtSec(latestHomeToFirst.value)}s
          </span>
          <span
            style={safePill}
            title={buildTooltip("sixtyYdDash", latestSixty)}
          >
            60 Yards: {fmtSec(latestSixty.value)}s
          </span>
          <span
            style={safePill}
            title={buildTooltip("exitVelo", latestExitVelo)}
          >
            Exit Velo: {fmtMph(latestExitVelo.value)}
          </span>

          {hasInfieldMetric && (
            <span
              style={safePill}
              title={buildTooltip("infieldVelo", latestInfieldVelo)}
            >
              Infield Velo: {fmtMph(latestInfieldVelo.value)}
            </span>
          )}

          {hasOutfieldMetric && (
            <span
              style={safePill}
              title={buildTooltip("outfieldVelo", latestOutfieldVelo)}
            >
              Outfield Velo: {fmtMph(latestOutfieldVelo.value)}
            </span>
          )}

          {hasCatcherMetric && (
            <span
              style={safePill}
              title={buildTooltip("catcherVelo", latestCatcherVelo)}
            >
              Catcher Velo: {fmtMph(latestCatcherVelo.value)}
            </span>
          )}

          {hasRawMetric && (
            <span
              style={safePill}
              title={buildTooltip("rawThrowVelo", latestRawVelo)}
            >
              Raw Velo: {fmtMph(latestRawVelo.value)}
            </span>
          )}
        </div>

{/* Row 5 – strength */}
<div
  style={{
    marginTop: 6,
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  }}
>
  <span
    style={safePill}
    title={buildTooltip("benchPress", latestBench)}
  >
    Bench: {fmtLb(latestBench.value)}
  </span>

  <span
    style={safePill}
    title={buildTooltip("squat", latestSquat)}
  >
    Squat: {fmtLb(latestSquat.value)}
  </span>

  <span
    style={safePill}
    title={buildTooltip("deadLift", latestDeadLift)}
  >
    Dead Lift: {fmtLb(latestDeadLift.value)}
  </span>
</div>

        {/* Row 6 – catcher + pitching metrics */}
        {(showCatcherMetrics || showPitchingMetrics) && (
          <div
            style={{
              marginTop: 6,
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {showCatcherMetrics && (
              <span
                style={safePill}
                title={buildTooltip("popTime", latestPopTime)}
              >
                Pop Time: {fmtSec(latestPopTime.value)}s
              </span>
            )}
            {showPitchingMetrics && (
              <>
                <span
                  style={safePill}
                  title={buildTooltip("avgFbVelo", latestAvgFB)}
                >
                  Avg Fastball: {fmtMph(latestAvgFB.value)}
                </span>
                <span
                  style={safePill}
                  title={buildTooltip("avgChVelo", latestAvgCH)}
                >
                  Avg Changeup: {fmtMph(latestAvgCH.value)}
                </span>
                <span
                  style={safePill}
                  title={buildTooltip("avgBbVelo", latestAvgBB)}
                >
                  Avg Breaking Ball: {fmtMph(latestAvgBB.value)}
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
