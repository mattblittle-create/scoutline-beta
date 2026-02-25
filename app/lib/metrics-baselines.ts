// app/lib/metrics-baselines.ts

// ===== Metric keys we chart (NO top fastball) =====
// NOTE: These are *internal* metric keys (camelCase).
// Your UI can map them to display labels like "Home to 1B", etc.
export type MetricKey =
  | "homeToFirst"        // "Home to 1B" — seconds
  | "sixtyYdDash"        // "60 Yd Dash" — seconds
  | "exitVelo"           // "Exit Velo" — mph
  | "rawThrowVelo"       // "Raw Velo" — mph (utility)
  | "infieldThrowVelo"   // "Infield Throw Velocity" — mph
  | "outfieldThrowVelo"  // "Outfield Throw Velocity" — mph
  | "catcherThrowVelo"   // "Catcher Throw Velocity" — mph
  | "avgFbVelo"          // "FB Velo" — mph (pitchers)
  | "avgChVelo"          // "CH Velo" — mph (pitchers)
  | "avgBbVelo"          // "BB Velo" — mph (pitchers)
  | "popTime"            // "Pop Time" — seconds (catchers)
  | "benchPress"         // "Bench Press" — lbs
  | "squat";             // "Squat" — lbs

export type BaselineTable = Record<number /* age */, number /* avg value */>;
export type BaselineData = Record<MetricKey, BaselineTable>;

/**
 * Placeholder baselines.
 * - Feel free to tune these with real data (or load dynamically later).
 * - Sparse ages are fine; `getBaselineValue(..., "nearest")` will fill gaps.
 */
export const BASELINES: BaselineData = {
  homeToFirst: {
    13: 5.40,
    14: 5.13,
    15: 4.95,
    16: 4.85,
    17: 4.80,
    18: 4.73,
  },

  sixtyYdDash: {
    13: 8.53,
    14: 8.01,
    15: 7.69,
    16: 7.52,
    17: 7.33,
    18: 6.90,
  },

  exitVelo: {
    13: 66,
    14: 71,
    15: 76,
    16: 79,
    17: 85,
    18: 89,
  },

  rawThrowVelo: {
    13: 65,
    14: 71,
    15: 75,
    16: 79,
    17: 82,
    18: 86,
  },

  // --- NEW: Infield / Outfield / Catcher arm velo (mph) ---
  // These are placeholders, roughly in line with rawThrowVelo,
  // OF slightly higher, C similar to IF.
  infieldThrowVelo: {
    13: 64,
    14: 70,
    15: 74,
    16: 78,
    17: 82,
    18: 85,
  },

  outfieldThrowVelo: {
    13: 67,
    14: 73,
    15: 78,
    16: 82,
    17: 85,
    18: 88,
  },

  catcherThrowVelo: {
    13: 64,
    14: 70,
    15: 74,
    16: 78,
    17: 81,
    18: 84,
  },

  avgFbVelo: {
    13: 64,
    14: 70,
    15: 74,
    16: 78,
    17: 82,
    18: 86,
  },

  avgChVelo: {
    13: 55,
    14: 58,
    15: 61,
    16: 64,
    17: 67,
    18: 69,
  },

  avgBbVelo: {
    13: 57,
    14: 60,
    15: 63,
    16: 66,
    17: 69,
    18: 71,
  },

  popTime: {
    13: 2.40,
    14: 2.25,
    15: 2.15,
    16: 2.05,
    17: 1.98,
    18: 1.95,
  },

  // --- Strength metrics (lbs) ---
  benchPress: {
    13: 85,
    14: 105,
    15: 130,
    16: 165,
    17: 185,
    18: 205,
  },

  squat: {
    13: 125,
    14: 155,
    15: 185,
    16: 215,
    17: 250,
    18: 285,
  },
};

// Reuse the mm/yyyy month input format you use in the UI
export function parseMonthYearToDate(mmYYYY: string): Date | null {
  if (!mmYYYY) return null;
  const m = mmYYYY.trim().match(/^(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const month = Number(m[1]);
  const year = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return new Date(year, month - 1, 1);
}

// Compute age at a specific date (so baselines match the month of the entry)
export function ageOn(dobMMDDYYYY: string, at: Date): number | null {
  const dob = parseDob(dobMMDDYYYY);
  if (!dob) return null;
  let age = at.getFullYear() - dob.getFullYear();
  const beforeBirthday =
    at.getMonth() < dob.getMonth() ||
    (at.getMonth() === dob.getMonth() && at.getDate() < dob.getDate());
  if (beforeBirthday) age--;
  return age;
}

function parseDob(dob: string): Date | null {
  const m = dob?.match?.(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  const year = Number(m[3]);
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d;
}

type NearestMode = "exact" | "nearest";

// Lookup baseline for a given metric + integer age.
// - "exact": returns null if exact age not present
// - "nearest": picks closest available age (downward if tie)
export function getBaselineValue(
  metric: MetricKey,
  age: number,
  mode: NearestMode = "nearest"
): number | null {
  const table = BASELINES[metric];
  if (!table) return null;
  if (table[age] != null) return table[age];

  if (mode === "exact") return null;

  // nearest neighbor (preferring lower age on ties)
  const ages = Object.keys(table).map(Number).sort((a, b) => a - b);
  if (ages.length === 0) return null;

  let nearest = ages[0];
  let minDelta = Math.abs(age - nearest);
  for (let i = 1; i < ages.length; i++) {
    const delta = Math.abs(age - ages[i]);
    if (delta < minDelta || (delta === minDelta && ages[i] < nearest)) {
      nearest = ages[i];
      minDelta = delta;
    }
  }
  return table[nearest] ?? null;
}

// Shape of metric entries that the UI/API use
export type MetricEntry = {
  monthYear: string;      // "mm/yyyy"
  value: number;          // seconds, mph, or lbs
  source?: string | null; // Trackman, Rapsodo, Manual, etc.
};

// Build a baseline series aligned with entries for a charting lib
export function buildBaselineSeries(
  entries: MetricEntry[],
  metric: MetricKey,
  dobMMDDYYYY: string
): Array<{ x: Date; y: number | null }> {
  const out: Array<{ x: Date; y: number | null }> = [];
  for (const e of entries) {
    const d = parseMonthYearToDate(e.monthYear);
    if (!d) continue;
    const age = ageOn(dobMMDDYYYY, d);
    const y = age != null ? getBaselineValue(metric, age, "nearest") : null;
    out.push({ x: d, y });
  }
  // chronological ascending (chart x-axis)
  out.sort((a, b) => a.x.getTime() - b.x.getTime());
  return out;
}
