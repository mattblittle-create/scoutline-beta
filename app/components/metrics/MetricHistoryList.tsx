"use client";

import * as React from "react";
import { parseMonthYearToDate, type MetricEntry } from "@/app/lib/metrics-baselines";

type Props = {
  entries: MetricEntry[];      // [{ monthYear:"mm/yyyy", value:number, source?:string }]
  units: "sec" | "mph";
};

function fmtMonth(d: Date) {
  return d.toLocaleString(undefined, { month: "short", year: "numeric" });
}

export default function MetricHistoryList({ entries, units }: Props) {
  // Most recent first (descending dates)
  const items = React.useMemo(() => {
    const parsed = entries
      .map((e) => {
        const d = parseMonthYearToDate(e.monthYear);
        return d ? { ...e, _date: d } : null;
      })
      .filter(Boolean) as Array<MetricEntry & { _date: Date }>;

    parsed.sort((a, b) => b._date.getTime() - a._date.getTime());
    return parsed;
  }, [entries]);

  if (items.length === 0) return null;

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>History</div>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
        {items.map((e, idx) => (
          <li
            key={`${e.monthYear}-${idx}`}
            style={{
              display: "grid",
              gridTemplateColumns: "120px 1fr auto",
              gap: 8,
              alignItems: "center",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: "6px 10px",
              background: "#fff",
            }}
            title={e.source ? `Verified by ${e.source}` : undefined}
          >
            <span style={{ color: "#0f172a", fontWeight: 700 }}>
              {fmtMonth((e as any)._date)}
            </span>
            <span style={{ color: "#0f172a" }}>
              {units === "mph" ? `${Math.round(e.value)} mph` : `${e.value.toFixed(2)} sec`}
            </span>
            <span style={{ color: "#64748b", fontSize: 12 }}>
              {e.source ? e.source : "Manual"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
