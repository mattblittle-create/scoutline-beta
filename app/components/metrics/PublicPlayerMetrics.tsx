// app/components/metrics/PublicPlayerMetrics.tsx
"use client";

import React from "react";
import MetricChart from "./MetricChart";
import type {
  MetricEntry,
  MetricKey,
} from "@/app/lib/metrics-baselines";

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
  const mp = (k: MetricKey): MetricEntry[] => (user?.metrics?.[k] ?? []);

  // Determine positional extras
  const isPitcher =
    (user?.isPitcher === "Yes") ||
    (user?.primaryPos === "P") ||
    (user?.secondaryPos === "P");

  const isCatcher =
    (user?.primaryPos === "C") ||
    (user?.secondaryPos === "C");

  // Order is chosen for good flow
  // (Pop Time appears right after Raw Throwing Velo when catcher)
  const cards: Array<{
    key: MetricKey;
    title: string;
    unit: string;
    show: boolean;
  }> = [
    { key: "Home to 1B",  title: "Home to 1st",         unit: "sec", show: true },
    { key: "60 Yd Dash",  title: "60 Yard Dash",        unit: "sec", show: true },
    { key: "Exit Velo",     title: "Exit Velocity",       unit: "mph", show: true },
    { key: "Raw Velo", title: "Raw Velocity",        unit: "mph", show: true },
    { key: "Pop Time",      title: "Pop Time",            unit: "sec", show: isCatcher },
    { key: "FB Velo",    title: "Fastball Velo",       unit: "mph", show: isPitcher },
    { key: "CH Velo",    title: "Changeup Velo",       unit: "mph", show: isPitcher },
    { key: "BreakingBall Velo",    title: "Breaking Ball Velo",  unit: "mph", show: isPitcher },
    { key: "Bench Press",   title: "Bench Press",         unit: "lbs", show: true },
    { key: "Squat",        title: "Squat",               unit: "lbs", show: true },
  ];

  // Only render charts that actually have entries
  const visible = cards.filter(c => c.show && mp(c.key).length > 0);

  if (!hasAnyMetrics(user?.metrics)) {
    return (
      <p style={{ color: "#64748b", margin: 0 }}>
        No metrics to display yet.
      </p>
    );
  }

  // above return()
const [cols, setCols] = React.useState(2);
React.useEffect(() => {
  const set = () => setCols(window.innerWidth < 900 ? 1 : 2);
  set(); 
  window.addEventListener("resize", set);
  return () => window.removeEventListener("resize", set);
}, []);

  return (
    <div
      style={{
        display: "grid",
        gap: 16,
        // 1 column on narrow screens; 2 columns once there’s room
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        alignItems: "start",
      }}
    >
      {visible.map(({ key, title, unit }) => (
        <MetricChart
          key={key}
          title={title}
          unit={unit}
          entries={mp(key)}
          metricKey={key}
          dob={dob || ""}
        />
      ))}
    </div>
  );
}
