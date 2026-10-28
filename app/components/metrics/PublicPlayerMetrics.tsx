// app/components/metrics/PublicPlayerMetrics.tsx

"use client";

import React from "react";
import MetricChart from "./MetricChart";
import type { MetricEntry, MetricKey } from "@/app/lib/metrics-baselines";

type UserWithMetrics = {
  dob?: string | null;
  primaryPos?: string | null;
  secondaryPos?: string | null;
  isPitcher?: "Yes" | "No" | "" | null;
  metrics?: Partial<Record<MetricKey, MetricEntry[]>>;
};

function hasAnyMetrics(m?: Partial<Record<MetricKey, MetricEntry[]>>): boolean {
  if (!m) return false;
  for (const k of Object.keys(m) as MetricKey[]) {
    if (Array.isArray(m[k]) && m[k]!.length > 0) return true;
  }
  return false;
}

export default function PublicPlayerMetrics({ user }: { user: UserWithMetrics }) {
  const dob = user?.dob ?? "";
  const mp = (k: MetricKey): MetricEntry[] => user?.metrics?.[k] ?? [];

  // ✅ Hooks must be called unconditionally (before any early return)
  const [cols, setCols] = React.useState(2);
  React.useEffect(() => {
    const set = () => setCols(window.innerWidth < 900 ? 1 : 2);
    set();
    window.addEventListener("resize", set);
    return () => window.removeEventListener("resize", set);
  }, []);

  // Determine positional extras
  const primary = String(user?.primaryPos ?? "").trim().toUpperCase();
  const secondary = String(user?.secondaryPos ?? "").trim().toUpperCase();

  const isPitcher =
    String(user?.isPitcher ?? "").toLowerCase() === "yes" || primary === "P" || secondary === "P";

  const isCatcher = primary === "C" || secondary === "C";

  // ✅ Use INTERNAL MetricKey values (camelCase)
  const cards: Array<{
    key: MetricKey;
    title: string;
    unit: string;
    show: boolean;
  }> = [
    { key: "homeToFirst", title: "Home to 1st", unit: "sec", show: true },
    { key: "sixtyYdDash", title: "60 Yard Dash", unit: "sec", show: true },
    { key: "exitVelo", title: "Exit Velocity", unit: "mph", show: true },

    // Arm velo (always show if there are entries)
    { key: "rawThrowVelo", title: "Raw Throwing Velo", unit: "mph", show: true },
    { key: "infieldThrowVelo", title: "Infield Throw Velo", unit: "mph", show: true },
    { key: "outfieldThrowVelo", title: "Outfield Throw Velo", unit: "mph", show: true },
    { key: "catcherThrowVelo", title: "Catcher Throw Velo", unit: "mph", show: true },

    // Catching / pitching
    { key: "popTime", title: "Pop Time", unit: "sec", show: isCatcher },
    { key: "avgFbVelo", title: "Fastball Velo", unit: "mph", show: isPitcher },
    { key: "avgChVelo", title: "Changeup Velo", unit: "mph", show: isPitcher },
    { key: "avgBbVelo", title: "Breaking Ball Velo", unit: "mph", show: isPitcher },

    // Strength
    { key: "benchPress", title: "Bench Press", unit: "lbs", show: true },
    { key: "squat", title: "Squat", unit: "lbs", show: true },
  ];

  // Only render charts that actually have entries
  const visible = cards.filter((c) => c.show && mp(c.key).length > 0);

  if (!hasAnyMetrics(user?.metrics)) {
    return <p style={{ color: "#64748b", margin: 0 }}>No metrics to display yet.</p>;
  }

  if (visible.length === 0) {
    return <p style={{ color: "#64748b", margin: 0 }}>No chartable metrics yet.</p>;
  }

  return (
    <div
      style={{
        display: "grid",
        gap: 16,
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        alignItems: "start",
      }}
    >
      {visible.map(({ key, title, unit }) => (
        <MetricChart key={key} title={title} unit={unit} entries={mp(key)} metricKey={key} dob={dob || ""} />
      ))}
    </div>
  );
}