// app/demo/metrics/page.tsx
"use client";

import React from "react";
import PublicPlayerMetrics from "@/app/components/metrics/PublicPlayerMetrics";

export default function DemoMetricsPage() {
  // Demo data: tweak freely
  const user = {
    dob: "03/14/2009", // mm/dd/yyyy
    primaryPos: "SS",
    secondaryPos: "P", // show pitcher charts too
    metrics: {
      homeToFirst: [
        { monthYear: "03/2024", value: 5.2, source: "Manual" },
        { monthYear: "06/2024", value: 5.05, source: "Manual" },
        { monthYear: "09/2024", value: 4.98, source: "Trackman" },
      ],
      sixtyYdDash: [
        { monthYear: "03/2024", value: 7.9, source: "Manual" },
        { monthYear: "09/2024", value: 7.6, source: "Manual" },
      ],
      exitVelo: [
        { monthYear: "02/2024", value: 78, source: "Rapsodo" },
        { monthYear: "07/2024", value: 83, source: "Trackman" },
      ],
      rawThrowVelo: [
        { monthYear: "02/2024", value: 75, source: "Manual" },
        { monthYear: "07/2024", value: 80, source: "Trackman" },
      ],
      popTime: [
        // leave empty; doesn't render unless catcher (we're SS/P)
      ],
      avgFbVelo: [
        { monthYear: "03/2024", value: 76, source: "Trackman" },
        { monthYear: "08/2024", value: 79, source: "Trackman" },
      ],
      avgChVelo: [
        { monthYear: "03/2024", value: 67, source: "Trackman" },
        { monthYear: "08/2024", value: 69, source: "Trackman" },
      ],
      avgBbVelo: [
        { monthYear: "03/2024", value: 66, source: "Trackman" },
        { monthYear: "08/2024", value: 68, source: "Trackman" },
      ],
      benchPress: [
        { monthYear: "01/2024", value: 145, source: "Manual" },
        { monthYear: "06/2024", value: 170, source: "Manual" },
        { monthYear: "12/2024", value: 185, source: "Manual" },
      ],
      squat: [
        { monthYear: "01/2024", value: 185, source: "Manual" },
        { monthYear: "06/2024", value: 225, source: "Manual" },
        { monthYear: "12/2024", value: 255, source: "Manual" },
      ],
    },
  };

  return (
    <main style={{ maxWidth: 1040, margin: "0 auto", padding: "24px 16px" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 900, margin: 0 }}>
        Metrics (Static Demo)
      </h1>
      <p style={{ color: "#64748b", marginTop: 4 }}>
        Example charts with age-based baseline lines.
      </p>

      <div style={{ marginTop: 16 }}>
        <PublicPlayerMetrics user={user as any} />
      </div>
    </main>
  );
}
