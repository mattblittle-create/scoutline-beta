// /lib/metrics.ts

// Subscription plan (reserved for future gating/automation features)
export type Plan = "Walk-On" | "All-American" | "Team";

// Every metric we'll track (canonical internal ids)
export type MetricId =
  | "homeToFirst"      // time (sec)
  | "sixtyYdDash"      // time (sec)
  | "exitVelo"         // mph
  | "rawThrowVelo"     // mph
  | "avgFbVelo"        // mph (pitcher only)
  | "topFbVelo"        // mph (pitcher only)
  | "avgChVelo"        // mph (pitcher only)
  | "avgBbVelo"        // mph (pitcher only)
  | "popTime";         // time (sec, catcher only)

// Basic metadata for labeling and gating
export const METRIC_META: Record<
  MetricId,
  { label: string; unit: "sec" | "mph"; isPitcherOnly?: boolean; isCatcherOnly?: boolean }
> = {
  homeToFirst: { label: "Home to 1st", unit: "sec" },
  sixtyYdDash: { label: "60 Yard Dash", unit: "sec" },
  exitVelo: { label: "Exit Velocity", unit: "mph" },
  rawThrowVelo: { label: "Raw Throwing Velocity", unit: "mph" },
  avgFbVelo: { label: "Average Fastball Velocity", unit: "mph", isPitcherOnly: true },
  topFbVelo: { label: "Top Fastball Velocity", unit: "mph", isPitcherOnly: true },
  avgChVelo: { label: "Average Changeup Velocity", unit: "mph", isPitcherOnly: true },
  avgBbVelo: { label: "Average Breaking Ball Velocity", unit: "mph", isPitcherOnly: true },
  popTime: { label: "Pop Time", unit: "sec", isCatcherOnly: true },
};

export type MetricEntry = {
  value: number;       // numeric value (sec or mph depending on the metric)
  source: string;      // e.g., "Manual", "Trackman", "Rapsodo"
  date: string;        // "mm/yyyy"
  automated?: boolean; // optional flag if populated via integration
};

// Per-metric series (with privacy toggle)
export type MetricSeries = {
  private?: boolean;      // default: public
  entries: MetricEntry[]; // stored ASC by date (earliest -> latest)
};

// Bag of all metrics keyed by id
export type MetricsBag = Partial<Record<MetricId, MetricSeries>>;

/** Validate "mm/yyyy" with reasonable bounds. */
export function isValidMonthYear(s: string): boolean {
  if (!/^(\d{1,2})\/(\d{4})$/.test(s)) return false;
  const [mStr, yStr] = s.split("/");
  const m = Number(mStr);
  const y = Number(yStr);
  if (!Number.isInteger(m) || !Number.isInteger(y)) return false;
  if (m < 1 || m > 12) return false;
  return y >= 1900 && y <= 2100;
}

/** Convert "mm/yyyy" -> comparable key like 202501 for Jan 2025. */
export function ymKey(s: string): number {
  const [mStr, yStr] = s.split("/");
  const m = Number(mStr);
  const y = Number(yStr);
  return y * 100 + m;
}

/** Sort entries ascending by date (earliest -> latest). */
export function sortEntriesAsc(entries: MetricEntry[]): MetricEntry[] {
  return [...entries].sort((a, b) => ymKey(a.date) - ymKey(b.date));
}

/** Sort entries descending by date (latest -> earliest). */
export function sortEntriesDesc(entries: MetricEntry[]): MetricEntry[] {
  return [...entries].sort((a, b) => ymKey(b.date) - ymKey(a.date));
}

/** Coerce a loose object into a MetricEntry or return null if invalid. */
export function sanitizeEntry(obj: any): MetricEntry | null {
  if (!obj) return null;
  const value = Number(obj.value);
  const source = String(obj.source ?? "").trim();
  const date = String(obj.date ?? "").trim();
  const automated = Boolean(obj.automated ?? false);

  if (!Number.isFinite(value)) return null;
  if (!source) return null;
  if (!isValidMonthYear(date)) return null;

  return { value, source, date, automated };
}

/**
 * Upsert a single entry into a series:
 * - keeps only one entry per month/year (replaces existing same-month),
 * - always returns entries sorted ASC by date.
 */
export function upsertEntry(series: MetricSeries | undefined, entry: MetricEntry): MetricSeries {
  const existing = series?.entries ?? [];
  const key = ymKey(entry.date);
  const filtered = existing.filter((e) => ymKey(e.date) !== key);
  return {
    private: series?.private ?? false,
    entries: sortEntriesAsc([...filtered, entry]),
  };
}

/** Ensure incoming "metrics" payload is shaped correctly. */
export function coerceMetrics(input: any): MetricsBag {
  const out: MetricsBag = {};
  if (!input || typeof input !== "object") return out;

  (Object.keys(METRIC_META) as MetricId[]).forEach((id) => {
    const rawSeries = input[id];
    if (!rawSeries) return;

    const priv = Boolean(rawSeries.private ?? false);
    const rawEntries = Array.isArray(rawSeries.entries) ? rawSeries.entries : [];
    const cleanEntries = rawEntries
      .map(sanitizeEntry)
      .filter((e: MetricEntry | null): e is MetricEntry => e !== null);

    out[id] = { private: priv, entries: sortEntriesAsc(cleanEntries) };
  });

  return out;
}

/** Convenience: is pitcher based on profile fields already in your app. */
export function isPitcherFromProfile(p: any): boolean {
  const pp = String(p?.primaryPos ?? "").toUpperCase();
  const sp = String(p?.secondaryPos ?? "").toUpperCase();
  const ip = String(p?.isPitcher ?? "").toLowerCase();
  return pp === "P" || sp === "P" || ip === "yes";
}

/** Convenience: is catcher based on profile fields already in your app. */
export function isCatcherFromProfile(p: any): boolean {
  const pp = String(p?.primaryPos ?? "").toUpperCase();
  const sp = String(p?.secondaryPos ?? "").toUpperCase();
  return pp === "C" || sp === "C";
}