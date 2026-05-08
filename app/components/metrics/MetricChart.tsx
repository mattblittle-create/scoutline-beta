// app/components/metrics/MetricChart.tsx
"use client";

import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

import {
  buildBaselineSeries,
  parseMonthYearToDate,
  type MetricEntry,
  type MetricKey,
} from "@/app/lib/metrics-baselines";

type Props = {
  title: string;
  unit: string; // "sec" | "mph" | "lbs"
  entries: MetricEntry[];
  metricKey: MetricKey;
  dob: string; // mm/dd/yyyy
};

// Keep chart & legend colors in sync
const PLAYER_COLOR = "#0ea5e9";
const BASELINE_COLOR = "#94a3b8";

// Small padding for y-domain
function padDomain(values: number[]): [number, number] | ["auto", "auto"] {
  const nums = values.filter((v) => Number.isFinite(v)) as number[];
  if (nums.length === 0) return ["auto", "auto"];
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const span = Math.max(1, max - min);
  const pad = span * 0.05; // 5%
  return [Math.max(0, min - pad), max + pad];
}

// Compute age at a specific date
function computeAgeAt(dobStr: string | null | undefined, at: Date): number | null {
  if (!dobStr) return null;
  const m = dobStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const month = Number(m[1]);
  const day = Number(m[2]);
  const year = Number(m[3]);
  const dob = new Date(year, month - 1, day);
  if (
    dob.getFullYear() !== year ||
    dob.getMonth() !== month - 1 ||
    dob.getDate() !== day
  ) {
    return null;
  }
  let age = at.getFullYear() - dob.getFullYear();
  const hadBirthday =
    at.getMonth() > dob.getMonth() ||
    (at.getMonth() === dob.getMonth() && at.getDate() >= dob.getDate());
  if (!hadBirthday) age--;
  return age;
}

// Custom X-axis tick: first line = mm/yyyy, second line = (age N)
function XTick({
  x,
  y,
  payload,
  dob,
}: {
  x?: number;
  y?: number;
  payload?: any;
  dob: string;
}) {
  const label: string = payload?.value ?? "";
  const atDate = parseMonthYearToDate(label);
  const age = atDate ? computeAgeAt(dob, atDate) : null;
  const ageText = age != null ? `(age ${age})` : "";

  const tx = x ?? 0;
  const ty = y ?? 0;

  return (
    <g transform={`translate(${tx},${ty})`}>
      <text dy={12} textAnchor="middle" fontSize={12} fill="#334155">
        {label}
      </text>
      {ageText && (
        <text dy={26} textAnchor="middle" fontSize={11} fill="#64748b">
          {ageText}
        </text>
      )}
    </g>
  );
}

export default function MetricChart({
  title,
  unit,
  entries,
  metricKey,
  dob,
}: Props) {
  // Build chart rows: value + baseline aligned by month
  const data = useMemo(() => {
    const withDate = entries
      .map((e) => ({
        ...e,
        _date: parseMonthYearToDate(e.monthYear),
      }))
      .filter((e) => e._date != null)
      .sort((a, b) => a._date!.getTime() - b._date!.getTime());

    const baseline = buildBaselineSeries(withDate, metricKey, dob);

    return withDate.map((e, idx) => ({
      monthYear: e.monthYear, // shown on x-axis
      value: e.value, // player value
      baseline: baseline[idx]?.y ?? null, // age-based baseline
      source: e.source ?? "",
    }));
  }, [entries, metricKey, dob]);

  const yDomain = useMemo(() => {
    const vals = data.map((d) => d.value);
    const bls = data.map((d) => (d.baseline == null ? NaN : d.baseline));
    return padDomain([...vals, ...bls]);
  }, [data]);

  // Most recent value + date (top-right display)
  const latest = data.length ? data[data.length - 1] : null;

  function fmt(value: number) {
    const u = unit.toLowerCase();
    if (u === "sec" || u === "seconds") return value.toFixed(3); // 3 decimals for seconds
    if (u === "mph" || u === "lbs") return Math.round(value).toString(); // no decimals
    return String(value);
  }

  // Average for horizontal reference line
  const avg =
    entries.length > 0
      ? entries.reduce((sum, e) => sum + (Number(e.value) || 0), 0) / entries.length
      : null;

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 12,
        background: "#fff",
      }}
    >
      {/* Header: title + unit (left), latest value (right) */}
      <div
        style={{
          marginBottom: 8,
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <div style={{ fontWeight: 800, color: "#0f172a" }}>
          <span>{title}</span>
          <span
            style={{
              color: "#64748b",
              fontSize: 12,
              fontWeight: 800,
              marginLeft: 8,
            }}
          >
            ({unit})
          </span>
        </div>

        {latest && (
          <div style={{ textAlign: "right", lineHeight: 1.2 }}>
            <div style={{ color: "#94a3b8", fontSize: 12, fontWeight: 800 }}>
              Most recent...
            </div>
            <div style={{ color: "#0ea5e9", fontSize: 12, fontWeight: 800 }}>
              {latest.monthYear} ~ {fmt(latest.value)} {unit}
            </div>
          </div>
        )}
      </div>

      {/* Chart */}
        <div
          style={{
            width: "100%",
            minWidth: 280,
            height: 260,
            minHeight: 260,
          }}
        >
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={280}
        >
          <LineChart
            data={data}
            margin={{ top: 10, right: 16, bottom: 28, left: 0 }} // extra bottom for 2-line ticks
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="monthYear"
              tick={<XTick dob={dob} />}
              interval={0}
              height={40} // room for two-line ticks
            />
            <YAxis domain={yDomain as any} tick={{ fontSize: 12 }} width={46} />
<Tooltip
  formatter={(value: any, name: string | number | undefined) => {
    const safeName = name == null ? "" : String(name);
    const safeValue =
      typeof value === "number" ? `${fmt(value)} ${unit}` : String(value ?? "");
    return [safeValue, safeName];
  }}
  labelFormatter={(label) => `${label}`}
/>

            {/* Horizontal average of player's values */}
            {avg != null && (
              <ReferenceLine
                y={avg}
                strokeDasharray="4 4"
                strokeOpacity={0.65}
              />
            )}

            {/* Player series (solid) */}
            <Line
              type="monotone"
              dataKey="value"
              name="Player"
              stroke={PLAYER_COLOR}
              strokeWidth={2}
              dot={{ r: 3 }}
              isAnimationActive={false}
            />

            {/* Baseline series (dashed) */}
            <Line
              type="monotone"
              dataKey="baseline"
              name="Average"
              stroke={BASELINE_COLOR}
              strokeDasharray="5 5"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Inline legend aligned with the x-axis */}
      <div
        style={{
          marginTop: 0,
          display: "flex",
          gap: 24,
          alignItems: "center",
          justifyContent: "center",
          color: "#475569",
          fontSize: 16, // doubled
          fontWeight: 800,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            color: PLAYER_COLOR, // text matches solid line
          }}
        >
          <span
            style={{
              width: 22,
              height: 0,
              borderTop: `3px solid ${PLAYER_COLOR}`,
            }}
          />
          Player at Age
        </span>

        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            color: BASELINE_COLOR, // text matches dashed line
          }}
        >
          <span
            style={{
              width: 22,
              height: 0,
              borderTop: `3px dashed ${BASELINE_COLOR}`,
            }}
          />
          Avg for Age
        </span>
      </div>
    </div>
  );
}
