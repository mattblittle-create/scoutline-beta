// app/components/public/PublicMetrics.tsx
"use client";

import * as React from "react";
import {
  BASELINES,
  COLLEGE_BENCHMARKS,
  type MetricKey,
} from "@/app/lib/metrics-baselines";

/** ---------- Types ---------- */
export type MetricPoint = {
  date?: string; // supports "MM/YYYY", "YYYY-MM", "YYYY-MM-DD", "MM/DD/YYYY", ISO
  monthYear?: string; // some payloads use this instead of `date`
  value: number | null;
  /** optional verification source on the individual entry (e.g., Trackman, Rapsodo) */
  source?: string | null;
};

export type MetricSeries = {
  // Accept correct internal keys *and* legacy aliases arriving from older payloads
  key: MetricKey | string; // e.g., "homeToFirst", "sixtyYdDash", "exitVelo", "fbVelo" (alias)
  label: string;
  unit?: string | null; // "sec" | "mph" | "lbs" (may also arrive as "seconds")
  points: MetricPoint[];
  ageAverages?: Record<number, number> | null;
};

export type MetricsData = {
  dob?: string | null; // "MM/DD/YYYY" | "YYYY-MM-DD" | ISO
  /** Optional position/role hints (if present, we’ll match header rules exactly) */
  positions?: { primary?: string | null; secondary?: string[] | null } | null;
  isPitcher?: string | boolean | null; // "Yes"/"No" or boolean
  pitcherHand?: string | null; // RHP/LHP/R/L
  series: MetricSeries[];
};

export type PlanTier = "Redshirt" | "Walk-On" | "All-American" | "Teams";

type Props = {
  metrics: MetricsData;
  title?: string;

  /** Plan gating: charts/growth tracking should be enabled only for All-American + Teams */
  planTier?: PlanTier | null;
  canShowCharts?: boolean;

  cardStyle?: React.CSSProperties;
  h2Style?: React.CSSProperties;
  pillStyle?: React.CSSProperties;
};

/** Colors to keep consistent with chart lines */
const PLAYER_COLOR = "#0ea5e9";
const AVG_COLOR = "#94a3b8";

/** ---------- Date helpers ---------- */
function parseFlexibleDate(d?: string | null): Date | null {
  if (!d) return null;
  const s = String(d).trim();
  if (!s) return null;

  // MM/YYYY
  let m = s.match(/^(\d{1,2})\/(\d{4})$/);
  if (m) {
    const mm = Number(m[1]);
    const yyyy = Number(m[2]);
    if (mm >= 1 && mm <= 12) return new Date(yyyy, mm - 1, 1);
    return null;
  }

  // YYYY-MM
  m = s.match(/^(\d{4})-(\d{1,2})$/);
  if (m) {
    const yyyy = Number(m[1]);
    const mm = Number(m[2]);
    if (mm >= 1 && mm <= 12) return new Date(yyyy, mm - 1, 1);
    return null;
  }

  // MM/DD/YYYY
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const mm = Number(m[1]);
    const dd = Number(m[2]);
    const yyyy = Number(m[3]);
    const dt = new Date(yyyy, mm - 1, dd);
    if (dt.getFullYear() === yyyy && dt.getMonth() === mm - 1 && dt.getDate() === dd) return dt;
    return null;
  }

  const t = Date.parse(s);
  return Number.isFinite(t) ? new Date(t) : null;
}

function monthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function formatMMYYYY(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}/${yyyy}`;
}

function ageOnDate(dobStr?: string | null, at?: string | null): number | null {
  const dob = parseFlexibleDate(dobStr);
  const dt = parseFlexibleDate(at);
  if (!dob || !dt) return null;
  let years = dt.getFullYear() - dob.getFullYear();
  const m = dt.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && dt.getDate() < dob.getDate())) years -= 1;
  return years;
}

/** ---------- Unit helpers ---------- */
function displayUnit(unit?: string | null): string | null {
  if (!unit) return null;
  const u = unit.toLowerCase();
  if (u === "seconds" || u === "second") return "sec";
  return unit; // mph, lbs, sec, etc.
}

function fmt(value: number | null | undefined, unit?: string | null): string {
  if (value == null || Number.isNaN(value)) return "—";
  const v =
    Math.abs(value) >= 100
      ? value.toFixed(0)
      : Math.abs(value) >= 10
      ? value.toFixed(1)
      : value.toFixed(2);
  const u = displayUnit(unit);
  return u ? `${v} ${u}` : v;
}

/** ---------- Baseline mapping ---------- */
const BASELINE_ALIASES: Record<string, MetricKey> = {
  // direct
  homeToFirst: "homeToFirst",
  sixtyYdDash: "sixtyYdDash",
  exitVelo: "exitVelo",
  rawThrowVelo: "rawThrowVelo",
  infieldThrowVelo: "infieldThrowVelo",
  outfieldThrowVelo: "outfieldThrowVelo",
  catcherThrowVelo: "catcherThrowVelo",
  avgFbVelo: "avgFbVelo",
  avgChVelo: "avgChVelo",
  avgBbVelo: "avgBbVelo",
  popTime: "popTime",
  benchPress: "benchPress",
  squat: "squat",
  deadLift: "deadLift",

  // common legacy/alt keys
  sixtyYd: "sixtyYdDash",
  rawVelo: "rawThrowVelo",

  fbVelo: "avgFbVelo",
  avgFBVelo: "avgFbVelo",
  chVelo: "avgChVelo",
  bbVelo: "avgBbVelo",
};

function toMetricKey(k: string): MetricKey | null {
  const key = String(k || "").trim();
  if (!key) return null;

  // If it exists as-is in BASELINES, it is a valid MetricKey
  if ((BASELINES as any)[key]) return key as MetricKey;

  const mapped = BASELINE_ALIASES[key];
  return mapped ?? null;
}

function baselineTableFor(seriesKey: string): Record<number, number> | null {
  const mk = toMetricKey(seriesKey);
  if (!mk) return null;
  return BASELINES[mk] ?? null;
}

/** Normalize incoming points so we accept either `date` or `monthYear`, and carry `source`. */
function normalizePoints(
  points: MetricPoint[]
): Array<{ date: string; value: number | null; source?: string | null }> {
  return (Array.isArray(points) ? points : [])
    .map((p) => {
      const dateStr = String((p.date ?? p.monthYear ?? "") || "").trim();
      if (!dateStr) return null;
      return {
        date: dateStr,
        value: p.value ?? null,
        source: (p as any).source ?? null,
      };
    })
    .filter(Boolean) as Array<{ date: string; value: number | null; source?: string | null }>;
}

function avgSeriesFor(series: MetricSeries, dob: string | null | undefined): { date: string; value: number | null }[] {
  const normalized = normalizePoints(series.points);

  if (series.ageAverages && Object.keys(series.ageAverages).length > 0) {
    return normalized.map((p) => {
      const age = ageOnDate(dob, p.date);
      const v = age != null ? series.ageAverages![age] ?? null : null;
      return { date: p.date, value: v ?? null };
    });
  }

  const table = baselineTableFor(String(series.key));
  if (!table) return [];

  return normalized.map((p) => {
    const age = ageOnDate(dob, p.date);
    if (age == null) return { date: p.date, value: null };

    const ages = Object.keys(table).map(Number).sort((a, b) => a - b);
    if (!ages.length) return { date: p.date, value: null };

    let nearest = ages[0];
    let minDelta = Math.abs(age - nearest);
    for (let i = 1; i < ages.length; i++) {
      const a = ages[i];
      const d = Math.abs(age - a);
      if (d < minDelta || (d === minDelta && a < nearest)) {
        nearest = a;
        minDelta = d;
      }
    }
    return { date: p.date, value: table[nearest] ?? null };
  });
}

/** Y-axis step rules */
function roundDownStep(v: number, step: number) {
  return Math.floor(v / step) * step;
}
function roundUpStep(v: number, step: number) {
  return Math.ceil(v / step) * step;
}
function yStepForUnit(unit?: string | null): number {
  const u = String(unit || "").toLowerCase();
  if (u === "lbs" || u === "lb") return 25;
  if (u === "sec" || u.includes("second")) return 0.5;
  if (u === "mph") return 5;
  return 1;
}

function metricImprovesWhenLower(seriesKey: string): boolean {
  const k = String(seriesKey || "").trim();
  return k === "homeToFirst" || k === "sixtyYdDash" || k === "popTime";
}

function getTrendInfo(
  seriesKey: string,
  pts: Array<{ date: string; value: number | null; source?: string | null }>
): {
  arrow: "↑" | "↓" | "→";
  color: string;
  label: "Improving" | "Declining" | "Steady";
} {
  const valid = pts.filter((p) => p.value != null && Number.isFinite(p.value as any));
  if (valid.length < 2) {
    return { arrow: "→", color: "#64748b", label: "Steady" };
  }

  const sorted = [...valid].sort((a, b) => {
    const ad = parseFlexibleDate(a.date)?.getTime() ?? 0;
    const bd = parseFlexibleDate(b.date)?.getTime() ?? 0;
    return ad - bd;
  });

  const prev = sorted[sorted.length - 2]?.value ?? null;
  const latest = sorted[sorted.length - 1]?.value ?? null;

  if (prev == null || latest == null) {
    return { arrow: "→", color: "#64748b", label: "Steady" };
  }

  const delta = latest - prev;
  const lowerIsBetter = metricImprovesWhenLower(seriesKey);

  if (Math.abs(delta) < 0.0001) {
    return { arrow: "→", color: "#64748b", label: "Steady" };
  }

  const improving = lowerIsBetter ? delta < 0 : delta > 0;

  return improving
    ? { arrow: "↑", color: "#15803d", label: "Improving" }
    : { arrow: "↓", color: "#b91c1c", label: "Declining" };
}

function getTrajectoryLabel(
  seriesKey: string,
  dob: string | null | undefined,
  pts: Array<{ date: string; value: number | null; source?: string | null }>
): "Strong" | "Rising" | "Steady" | "Early" | "Watch" {
  const valid = pts.filter((p) => p.value != null && Number.isFinite(p.value as any));
  if (valid.length < 2) return "Early";

  const sorted = [...valid].sort((a, b) => {
    const ad = parseFlexibleDate(a.date)?.getTime() ?? 0;
    const bd = parseFlexibleDate(b.date)?.getTime() ?? 0;
    return ad - bd;
  });

  const first = sorted[0];
  const latest = sorted[sorted.length - 1];
  if (!first || !latest || first.value == null || latest.value == null) return "Early";

  const lowerIsBetter = metricImprovesWhenLower(seriesKey);
  const netDelta = latest.value - first.value;
  const improving = lowerIsBetter ? netDelta < 0 : netDelta > 0;
  const flat = Math.abs(netDelta) < 0.0001;

  const latestAge = ageOnDate(dob, latest.date);
  const baselineTable = baselineTableFor(seriesKey);
  const baselineLatest =
    latestAge != null && baselineTable ? baselineTable[latestAge] ?? null : null;

  const aheadOfAverage =
    baselineLatest != null
      ? lowerIsBetter
        ? latest.value < baselineLatest
        : latest.value > baselineLatest
      : false;

  if (improving && aheadOfAverage) return "Strong";
  if (improving) return "Rising";
  if (flat) return "Steady";
  return "Watch";
}

/** Helper: latest (by date) non-null value's source */
function latestSourceFrom(
  pts: Array<{ date: string; value: number | null; source?: string | null }>
): string | null {
  let bestTs = -Infinity;
  let bestSrc: string | null = null;
  for (const p of pts) {
    if (p.value == null || !Number.isFinite(p.value as any)) continue;
    const d = parseFlexibleDate(p.date);
    if (!d) continue;
    const ts = monthStart(d).getTime();
    if (ts > bestTs) {
      bestTs = ts;
      const s = (p.source && String(p.source).trim()) || "";
      bestSrc = s || null;
    }
  }
  return bestSrc;
}

/** which metrics should be hidden if empty */
function requiresDataToShow(key: string) {
  const k = key.trim();
  const hideIfEmpty = new Set([
    "popTime",
    "catcherThrowVelo",
    "avgFbVelo",
    "avgFBVelo",
    "fbVelo",
    "avgChVelo",
    "chVelo",
    "avgBbVelo",
    "bbVelo",
    "infieldThrowVelo",
    "outfieldThrowVelo",
  ]);
  return hideIfEmpty.has(k);
}

function isCatcherMetric(key: string) {
  const k = key.trim();
  return k === "popTime" || k === "catcherThrowVelo";
}
function isPitchingMetric(key: string) {
  const k = key.trim();
  return new Set(["avgFbVelo", "avgFBVelo", "fbVelo", "avgChVelo", "chVelo", "avgBbVelo", "bbVelo"]).has(k);
}
function isInfieldMetric(key: string) {
  return key.trim() === "infieldThrowVelo";
}
function isOutfieldMetric(key: string) {
  return key.trim() === "outfieldThrowVelo";
}
function isRawThrowMetric(key: string) {
  const k = key.trim();
  return k === "rawThrowVelo" || k === "rawVelo";
}

/** ---------- Metric Card (has hooks, so it must be its own component) ---------- */
type MetricCardProps = {
  series: MetricSeries & { _display: string };
  dob?: string | null;

  showCharts: boolean;

  // visibility gating (position/pitcher/catcher enforcement)
  hasAnyHints: boolean;
  allowCatcher: boolean;
  allowPitching: boolean;
  allowInfield: boolean;
  allowOutfield: boolean;
  allowRawThrow: boolean;

  pill: React.CSSProperties;
  cardInner: React.CSSProperties;
};

function MetricCard({
  series,
  dob,
  showCharts,

  hasAnyHints,
  allowCatcher,
  allowPitching,
  allowInfield,
  allowOutfield,
  allowRawThrow,

  pill,
  cardInner,
}: MetricCardProps) {
  const seriesKey = String(series.key);

  // If hints exist, enforce eligibility right away
  if (isCatcherMetric(seriesKey) && hasAnyHints && !allowCatcher) return null;
  if (isPitchingMetric(seriesKey) && hasAnyHints && !allowPitching) return null;
  if (isInfieldMetric(seriesKey) && hasAnyHints && !allowInfield) return null;
  if (isOutfieldMetric(seriesKey) && hasAnyHints && !allowOutfield) return null;
  if (isRawThrowMetric(seriesKey) && hasAnyHints && !allowRawThrow) return null;

  const ptsRaw = normalizePoints(series.points);
  const pts = ptsRaw.filter((p) => p && p.date);
  const latest = [...pts].reverse().find((p) => p.value != null) || null;

  const latestSource = latestSourceFrom(pts);
  const avgPts = avgSeriesFor(series, dob);
  const trend = getTrendInfo(seriesKey, pts);
  const trajectory = getTrajectoryLabel(seriesKey, dob, pts);
  const benchmarks = COLLEGE_BENCHMARKS[toMetricKey(seriesKey) ?? (seriesKey as MetricKey)] ?? null;

  // If we require data to show (pos-specific metrics), hide if empty
  const hasAnyPoint = pts.some((p) => p.value != null && Number.isFinite(p.value as any));
  if (!hasAnyPoint && requiresDataToShow(seriesKey)) return null;

  // ---- If plan does NOT allow growth tracking, show ONLY header/pills (no chart) ----
  if (!showCharts) {
    return (
      <div style={cardInner}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontWeight: 800, color: "#0f172a" }}>
              {series._display}
            </div>
<span
  title={trend.label}
  style={{
    color: trend.color,
    fontWeight: 1200,
    fontSize: 20,          // ⬅️ bigger
    lineHeight: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    height: 24,
    borderRadius: 999,
    background: "#f1f5f9", // subtle badge background
    border: `1px solid ${trend.color}30`, // soft tinted border
    marginLeft: 4,
  }}
>
  {trend.arrow}
</span>
          </div>

          {benchmarks ? (
            <div
              style={{
                color: "#caa042",
                fontSize: 12,
                fontWeight: 800,
                lineHeight: 1.35,
              }}
            >
              {benchmarks.D1 != null ? <div>D1 - {fmt(benchmarks.D1, series.unit)}</div> : null}
              {benchmarks.D2 != null ? <div>D2 - {fmt(benchmarks.D2, series.unit)}</div> : null}
              {benchmarks.D3 != null ? <div>D3 - {fmt(benchmarks.D3, series.unit)}</div> : null}
              {benchmarks.JUCO != null ? <div>JUCO - {fmt(benchmarks.JUCO, series.unit)}</div> : null}
            </div>
          ) : null}
        </div>

        <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
          <span style={pill}>Most Recent: {fmt(latest?.value ?? null, series.unit)}</span>
          <span style={pill}>Source: {latestSource || "—"}</span>
          <span style={pill}>Trajectory: {trajectory}</span>
        </div>
      </div>

        {!hasAnyPoint && <div style={{ color: "#94a3b8", fontStyle: "italic" }}>No Metrics available.</div>}
      </div>
    );
  }

  // ---- Chart mode ----
  /** Chart dimensions + margins */
  const chartW = 420;
  const chartH = 160;
  const padLeft = 50;
  const padRight = 0;
  const padTop = 16;
  const padBottom = padTop;
  const innerW = chartW - padLeft - padRight;
  const innerH = chartH - padTop - padBottom;

  type Hover =
    | {
        x: number;
        y: number;
        dateLabel: string;
        playerLabel: string;
        avgAgeLabel: string;
        sourceLabel?: string | null;
      }
    | null;

  const [hover, setHover] = React.useState<Hover>(null);

  const values: number[] = [];
  pts.forEach((p) => {
    if (p.value != null && Number.isFinite(p.value)) values.push(p.value);
  });
  avgPts.forEach((p) => {
    if (p.value != null && Number.isFinite(p.value)) values.push(p.value);
  });

  const step = yStepForUnit(series.unit);
  let yMin = values.length ? Math.min(...values) : 0;
  let yMax = values.length ? Math.max(...values) : 1;
  if (yMin === yMax) {
    yMin = yMin - step;
    yMax = yMax + step;
  }

  const tickStart = roundDownStep(yMin, step) - step;
  const tickEnd = roundUpStep(yMax, step);

  const y0 = Number((tickStart - 0.2 * step).toFixed(10));
  const y1 = Number((tickEnd + 0.25 * step).toFixed(10));

  const yTicks: number[] = [];
  for (let v = tickStart; v <= tickEnd + 1e-9; v = Number((v + step).toFixed(10))) {
    yTicks.push(v);
  }

  const allDates = [...pts.map((p) => parseFlexibleDate(p.date)), ...avgPts.map((p) => parseFlexibleDate(p.date))]
    .filter(Boolean) as Date[];

  if (allDates.length === 0) {
    return (
      <div style={cardInner}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontWeight: 800, color: "#0f172a" }}>
              {series._display}
            </div>
<span
  title={trend.label}
  style={{
    color: trend.color,
    fontWeight: 1200,
    fontSize: 20,          // ⬅️ bigger
    lineHeight: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    height: 24,
    borderRadius: 999,
    background: "#f1f5f9", // subtle badge background
    border: `1px solid ${trend.color}30`, // soft tinted border
    marginLeft: 4,
  }}
>
  {trend.arrow}
</span>
          </div>

          {benchmarks ? (
            <div
              style={{
                color: "#caa042",
                fontSize: 12,
                fontWeight: 800,
                lineHeight: 1.35,
              }}
            >
              {benchmarks.D1 != null ? <div>D1 - {fmt(benchmarks.D1, series.unit)}</div> : null}
              {benchmarks.D2 != null ? <div>D2 - {fmt(benchmarks.D2, series.unit)}</div> : null}
              {benchmarks.D3 != null ? <div>D3 - {fmt(benchmarks.D3, series.unit)}</div> : null}
              {benchmarks.JUCO != null ? <div>JUCO - {fmt(benchmarks.JUCO, series.unit)}</div> : null}
            </div>
          ) : null}
        </div>

        <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
          <span style={pill}>Most Recent: {fmt(latest?.value ?? null, series.unit)}</span>
          <span style={pill}>Source: {latestSource || "—"}</span>
          <span style={pill}>Trajectory: {trajectory}</span>
        </div>
      </div>
        <div style={{ color: "#94a3b8", fontStyle: "italic" }}>No Metrics available.</div>
      </div>
    );
  }

  const minDate = monthStart(new Date(Math.min(...allDates.map((d) => d.getTime()))));
  const maxDate = monthStart(new Date(Math.max(...allDates.map((d) => d.getTime()))));

  const paddedMin = addMonths(minDate, -1);
  const paddedMax = addMonths(maxDate, +1);

  const xTickDates: Date[] = [];
  for (let d = new Date(minDate); d.getTime() <= maxDate.getTime(); d = addMonths(d, 6)) {
    xTickDates.push(new Date(d.getFullYear(), d.getMonth(), 1));
  }

  const x0 = paddedMin.getTime();
  const x1 = paddedMax.getTime();

  const xToSvg = (d: Date) => {
    const t = d.getTime();
    const nx = (t - x0) / (x1 - x0 || 1);
    return padLeft + nx * innerW;
  };
  const yToSvg = (v: number) => {
    const ny = (v - y0) / (y1 - y0 || 1);
    return padTop + (1 - ny) * innerH;
  };

  const toXY = (p: { date: string; value: number | null; source?: string | null }) => {
    const d = parseFlexibleDate(p.date);
    if (!d || p.value == null || !Number.isFinite(p.value)) return null;
    return {
      x: xToSvg(monthStart(d)),
      y: yToSvg(p.value),
      date: monthStart(d),
      value: p.value,
      source: p.source ?? null,
    };
  };

  const playerXY = pts.map(toXY).filter(Boolean) as Array<{
    x: number;
    y: number;
    date: Date;
    value: number;
    source?: string | null;
  }>;
  const avgXY = avgPts.map(toXY).filter(Boolean) as Array<{
    x: number;
    y: number;
    date: Date;
    value: number;
  }>;

  const pathFrom = (arr: { x: number; y: number }[]) => {
    if (arr.length === 0) return "";
    const [first, ...rest] = arr;
    return `M ${first.x} ${first.y}` + rest.map((p) => ` L ${p.x} ${p.y}`).join("");
  };

  const playerPath = pathFrom(playerXY);
  const avgPath = pathFrom(avgXY);

  function nearestPoint(mx: number, my: number) {
    if (!playerXY.length) return null;
    let best = playerXY[0];
    let bd = Math.hypot(mx - best.x, my - best.y);
    for (let i = 1; i < playerXY.length; i++) {
      const d = Math.hypot(mx - playerXY[i].x, my - playerXY[i].y);
      if (d < bd) {
        bd = d;
        best = playerXY[i];
      }
    }

    const dateLabel = formatMMYYYY(best.date);
    const playerLabel = `Player: ${fmt(best.value, series.unit)}`;

    const age = ageOnDate(dob, best.date.toISOString());
    let avgAtAge: number | null = null;

    if (age != null) {
      if (series.ageAverages && typeof series.ageAverages[age] !== "undefined") {
        avgAtAge = series.ageAverages[age] as number | null;
      } else {
        const tbl = baselineTableFor(seriesKey);
        if (tbl) {
          const ages = Object.keys(tbl).map(Number).sort((a, b) => a - b);
          if (ages.length) {
            let nearest = ages[0];
            let min = Math.abs(age - nearest);
            for (let i = 1; i < ages.length; i++) {
              const a2 = ages[i];
              const diff = Math.abs(age - a2);
              if (diff < min || (diff === min && a2 < nearest)) {
                nearest = a2;
                min = diff;
              }
            }
            avgAtAge = tbl[nearest] ?? null;
          }
        }
      }
    }

    const avgAgeLabel = `Avg at Age ${age ?? "—"}: ${fmt(avgAtAge, series.unit)}`;

    const src = (best.source && String(best.source).trim()) || "";
    const sourceLabel = src ? `Source: ${src}` : undefined;

    return { x: best.x, y: best.y, dateLabel, playerLabel, avgAgeLabel, sourceLabel };
  }

  const unitLabel = displayUnit(series.unit);

  return (
    <div style={cardInner}>
      {/* Header pills */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontWeight: 800, color: "#0f172a" }}>
              {series._display}
            </div>
<span
  title={trend.label}
  style={{
    color: trend.color,
    fontWeight: 1200,
    fontSize: 20,          // ⬅️ bigger
    lineHeight: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    height: 24,
    borderRadius: 999,
    background: "#f1f5f9", // subtle badge background
    border: `1px solid ${trend.color}30`, // soft tinted border
    marginLeft: 4,
  }}
>
  {trend.arrow}
</span>
          </div>

          {benchmarks ? (
            <div
              style={{
                color: "#caa042",
                fontSize: 12,
                fontWeight: 800,
                lineHeight: 1.35,
              }}
            >
              {benchmarks.D1 != null ? <div>D1 - {fmt(benchmarks.D1, series.unit)}</div> : null}
              {benchmarks.D2 != null ? <div>D2 - {fmt(benchmarks.D2, series.unit)}</div> : null}
              {benchmarks.D3 != null ? <div>D3 - {fmt(benchmarks.D3, series.unit)}</div> : null}
              {benchmarks.JUCO != null ? <div>JUCO - {fmt(benchmarks.JUCO, series.unit)}</div> : null}
            </div>
          ) : null}
        </div>

        <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
          <span style={pill}>Most Recent: {fmt(latest?.value ?? null, series.unit)}</span>
          <span style={pill}>Source: {latestSource || "—"}</span>
          <span style={pill}>Trajectory: {trajectory}</span>
        </div>
      </div>

      {/* Chart */}
      <div style={{ width: "100%", overflow: "hidden" }}>
        <svg
          viewBox={`0 0 ${chartW} ${chartH}`}
          role="img"
          aria-label={`${series._display} over time`}
          style={{ width: "100%", height: "auto", display: "block" }}
        >
          <defs>
            <clipPath id={`clip-${seriesKey}`}>
              <rect x={padLeft} y={padTop} width={innerW} height={innerH} />
            </clipPath>
          </defs>

          {/* Y grid + labels */}
          {yTicks.map((yv, i) => {
            const y = yToSvg(yv);
            return (
              <g key={`y-${i}`}>
                <line x1={padLeft} y1={y} x2={padLeft + innerW} y2={y} stroke="#e5e7eb" strokeWidth="1" />
                <text x={padLeft - 6} y={y + 4} textAnchor="end" fontSize={11} fill="#64748b">
                  {unitLabel ? `${yv} ${unitLabel}` : `${yv}`}
                </text>
              </g>
            );
          })}

          {/* X grid + labels */}
          {xTickDates.map((d, i) => {
            const x = xToSvg(d);
            return (
              <g key={`x-${i}`}>
                <line x1={x} y1={padTop} x2={x} y2={padTop + innerH} stroke="#f1f5f9" strokeWidth="1" />
                <text x={x} y={padTop + innerH + 16} textAnchor="middle" fontSize={11} fill="#64748b">
                  {formatMMYYYY(d)}
                </text>
              </g>
            );
          })}

          {/* Axes */}
          <line x1={padLeft} y1={padTop + innerH} x2={padLeft + innerW} y2={padTop + innerH} stroke="#cbd5e1" />
          <line x1={padLeft} y1={padTop} x2={padLeft} y2={padTop + innerH} stroke="#cbd5e1" />

          {/* Lines + dots */}
          <g clipPath={`url(#clip-${seriesKey})`}>
            {avgXY.length > 0 && avgPath && (
              <path d={avgPath} fill="none" stroke={AVG_COLOR} strokeWidth="2" strokeDasharray="4 4" />
            )}
            {playerXY.length > 0 && playerPath && <path d={playerPath} fill="none" stroke={PLAYER_COLOR} strokeWidth="2.5" />}
            {playerXY.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r={4.5} fill={PLAYER_COLOR} />
            ))}
          </g>

          {/* Hover layer */}
          <rect
            x={padLeft}
            y={padTop}
            width={innerW}
            height={innerH}
            fill="transparent"
            onMouseMove={(e) => {
              const rect = (e.target as SVGRectElement).ownerSVGElement!.getBoundingClientRect();
              const mx = e.clientX - rect.left;
              const my = e.clientY - rect.top;
              setHover(nearestPoint(mx, my));
            }}
            onMouseLeave={() => setHover(null)}
            style={{ cursor: playerXY.length ? "crosshair" : "default" }}
          />

          {hover && (
            <>
              <line x1={hover.x} y1={padTop} x2={hover.x} y2={padTop + innerH} stroke={PLAYER_COLOR} strokeDasharray="3 3" />
              <circle cx={hover.x} cy={hover.y} r={5} fill={PLAYER_COLOR} />
              {(() => {
                const baseRows = 3;
                const hasSource = !!hover.sourceLabel;
                const rows = baseRows + (hasSource ? 1 : 0);
                const rowHeight = 18;
                const topPad = 12;
                const boxH = topPad + rows * rowHeight + 8;
                const boxW = 240;

                const tx = Math.min(padLeft + innerW - boxW, Math.max(padLeft, hover.x + 8));
                const ty = Math.max(padTop + 8, Math.min(padTop + innerH - boxH - 4, hover.y - boxH + 6));

                return (
                  <g transform={`translate(${tx}, ${ty})`}>
                    <rect width={boxW} height={boxH} rx="6" fill="white" stroke="#cbd5e1" />
                    <text x={8} y={topPad} fontSize={12} fill="#0f172a" style={{ fontWeight: 800 }}>
                      {hover.dateLabel}
                    </text>
                    <text x={8} y={topPad + rowHeight} fontSize={12} fill={PLAYER_COLOR} style={{ fontWeight: 800 }}>
                      {hover.playerLabel}
                    </text>
                    <text x={8} y={topPad + rowHeight * 2} fontSize={12} fill={AVG_COLOR} style={{ fontWeight: 800 }}>
                      {hover.avgAgeLabel}
                    </text>
                    {hasSource && (
                      <text x={8} y={topPad + rowHeight * 3} fontSize={12} fill="#64748b" style={{ fontWeight: 700 }}>
                        {hover.sourceLabel}
                      </text>
                    )}
                  </g>
                );
              })()}
            </>
          )}
        </svg>
      </div>

      {pts.length === 0 && <div style={{ color: "#94a3b8", fontStyle: "italic" }}>No data yet for this metric.</div>}
    </div>
  );
}

/** ---------- Component ---------- */
export default function PublicMetrics({
  metrics,
  title = "Metrics",
  planTier = null,
  canShowCharts,
  cardStyle,
  h2Style,
  pillStyle,
}: Props) {
  const { series = [], dob } = metrics || {};

  // Plan gating: only All-American + Teams show growth tracking charts
  const showCharts =
    typeof canShowCharts === "boolean" ? canShowCharts : planTier === "All-American" || planTier === "Teams";

  /** ---- enforce requested order & display names ---- */
  const slotOrder: Array<{ keys: string[]; display: string }> = [
    { keys: ["homeToFirst"], display: "Home to 1B" },
    { keys: ["sixtyYdDash", "sixtyYd"], display: "60 Yard Dash" },

    { keys: ["exitVelo"], display: "Exit Velo" },
    { keys: ["rawThrowVelo", "rawVelo"], display: "Raw Throwing Velo" },

    { keys: ["infieldThrowVelo"], display: "Infield Throwing Velo" },
    { keys: ["outfieldThrowVelo"], display: "Outfield Throwing Velo" },

    { keys: ["benchPress"], display: "Bench Press" },
    { keys: ["squat"], display: "Squat" },
    { keys: ["deadLift"], display: "Dead Lift" },

    { keys: ["popTime"], display: "Catcher Pop Time" },
    { keys: ["catcherThrowVelo"], display: "Catcher Throwing Veloc" },

    { keys: ["avgFbVelo", "avgFBVelo", "fbVelo"], display: "Avg Fastball Velo" },
    { keys: ["avgChVelo", "chVelo"], display: "Avg Changeup Velo" },

    { keys: ["avgBbVelo", "bbVelo"], display: "Avg Breaking Ball Velo" },
  ];

  const byKey = new Map(series.map((s) => [String(s.key), s]));
  const orderedSeries: Array<MetricSeries & { _display: string }> = [];

  for (const slot of slotOrder) {
    let found: MetricSeries | undefined;
    for (const k of slot.keys) {
      const s = byKey.get(k);
      if (s) {
        found = s;
        break;
      }
    }
    if (found) orderedSeries.push({ ...found, _display: slot.display });
  }

  // append any remaining series not explicitly slotted
  for (const s of series) {
    if (!orderedSeries.find((os) => String(os.key) === String(s.key))) {
      orderedSeries.push({ ...s, _display: s.label });
    }
  }

  /** ---- derive catcher/pitcher/position visibility to match header rules when hints exist ---- */
  const rawPositions =
    (metrics as any)?.positions ?? {
      primary: (metrics as any)?.primaryPos ?? (metrics as any)?.primaryPosition ?? null,
      secondary: (metrics as any)?.secondaryPos ?? (metrics as any)?.secondaryPosition ?? null,
    };

  const primaryPos: string | null = rawPositions?.primary ?? null;

  const secondaryRaw = rawPositions?.secondary ?? null;
  const secondaryPos: string[] = Array.isArray(secondaryRaw) ? secondaryRaw : secondaryRaw ? [secondaryRaw] : [];

  const hasPosHints = !!primaryPos || secondaryPos.length > 0;

  const rawIsPitcher =
    (metrics as any)?.isPitcher ?? (metrics as any)?.athletics?.isPitcher ?? (metrics as any)?.isPitcherFlag ?? null;

  const hasPitcherHint = rawIsPitcher != null || (metrics as any)?.pitcherHand != null;
  const hasAnyHints = hasPosHints || hasPitcherHint;

  const hasCatcher = primaryPos === "C" || secondaryPos.includes("C");
  const hasPitcherPos = primaryPos === "P" || secondaryPos.includes("P");

  const isPitcherYes = String(rawIsPitcher ?? "").trim().toLowerCase() === "yes" || rawIsPitcher === true;

  const hasInfieldPos =
    primaryPos === "1B" ||
    primaryPos === "2B" ||
    primaryPos === "SS" ||
    primaryPos === "3B" ||
    secondaryPos.includes("1B") ||
    secondaryPos.includes("2B") ||
    secondaryPos.includes("SS") ||
    secondaryPos.includes("3B");

  const hasOutfieldPos =
    primaryPos === "LF" ||
    primaryPos === "CF" ||
    primaryPos === "RF" ||
    secondaryPos.includes("LF") ||
    secondaryPos.includes("CF") ||
    secondaryPos.includes("RF");

  const hasUtilityPos = primaryPos === "Utility" || secondaryPos.includes("Utility");

  const allowCatcherCharts = hasAnyHints ? hasCatcher : true;
  const allowPitchingCharts = hasAnyHints ? hasPitcherPos || isPitcherYes : true;
  const allowInfieldVelo = hasAnyHints ? hasInfieldPos : true;
  const allowOutfieldVelo = hasAnyHints ? hasOutfieldPos : true;

  // 🔧 Raw throwing velo is useful for basically any position with hints (IF/OF/C/Utility),
  // not just Utility.
  const allowRawThrowVelo = hasAnyHints ? (hasUtilityPos || hasInfieldPos || hasOutfieldPos || hasCatcher) : true;

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

  const pill: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 800,
    color: "#0f172a",
    background: "#f1f5f9",
    border: "1px solid #e2e8f0",
    borderRadius: 999,
    padding: "4px 10px",
    lineHeight: 1,
    whiteSpace: "nowrap",
    ...(pillStyle || {}),
  };

  const grid: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
    marginTop: 8,
  };

  const cardInner: React.CSSProperties = {
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: 12,
    background: "#ffffff",
    display: "grid",
    gap: 8,
  };

  return (
    <section style={safeCard}>
      {/* Title + legend (legend only when charts are enabled) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <h2 style={safeH2}>{title}</h2>

        {showCharts && (
          <div style={{ display: "flex", gap: 20, alignItems: "center", color: "#475569", fontWeight: 800 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: PLAYER_COLOR }}>
              <span style={{ width: 22, height: 0, borderTop: `3px solid ${PLAYER_COLOR}` }} />
              Player
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: AVG_COLOR }}>
              <span style={{ width: 22, height: 0, borderTop: `3px dashed ${AVG_COLOR}` }} />
              Avg at Age
            </span>
          </div>
        )}
      </div>

      {orderedSeries.length === 0 ? (
        <p style={{ marginTop: 8, color: "#94a3b8", fontStyle: "italic" }}>No metrics yet.</p>
      ) : (
        <div style={grid}>
          {orderedSeries.map((s) => (
            <MetricCard
              key={String(s.key)}
              series={s}
              dob={dob ?? null}
              showCharts={showCharts}
              hasAnyHints={hasAnyHints}
              allowCatcher={allowCatcherCharts}
              allowPitching={allowPitchingCharts}
              allowInfield={allowInfieldVelo}
              allowOutfield={allowOutfieldVelo}
              allowRawThrow={allowRawThrowVelo}
              pill={pill}
              cardInner={cardInner}
            />
          ))}
        </div>
      )}

      {!showCharts && (
        <div style={{ marginTop: 10, color: "#94a3b8", fontStyle: "italic" }}>
          Growth tracking charts are available on All-American and Teams plans.
        </div>
      )}
    </section>
  );
}