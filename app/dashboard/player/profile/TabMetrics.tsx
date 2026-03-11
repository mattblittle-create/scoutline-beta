// app/dashboard/player/profile/TabMetrics.tsx
"use client";

import React, { useState } from "react";

/** ---------- Types for entries & handle ---------- */
export type MetricEntry = {
  monthYear: string;      // "MM/YYYY"
  value: number;          // numeric reading
  source?: string | null; // e.g., "Manual", "Rapsodo"
};

export type MetricsPayload = {
  metricsPublic: boolean;

  // entries
  homeToFirst: MetricEntry[];
  sixtyYdDash: MetricEntry[];
  exitVelo: MetricEntry[];

  rawThrowVelo: MetricEntry[];
  infieldThrowVelo: MetricEntry[];
  outfieldThrowVelo: MetricEntry[];
  catcherThrowVelo: MetricEntry[];

  benchPress: MetricEntry[];
  squat: MetricEntry[];
  popTime: MetricEntry[];
  avgFbVelo: MetricEntry[];
  avgChVelo: MetricEntry[];
  avgBbVelo: MetricEntry[];
};

export type MetricsHandle = { getPayload: () => MetricsPayload };

type Styles = {
  labelStyle: React.CSSProperties;
  labelText: React.CSSProperties;
  inputStyle: React.CSSProperties;
  hrStyle: React.CSSProperties;
  errText: React.CSSProperties;
  qMark: React.CSSProperties;
};

type TabMetricsProps = {
  metricsPublic: boolean;

  // position-based visibility (computed in parent / page.tsx)
  showCatcherMetrics: boolean;  // C: Pop Time + Catcher Throw Velo
  showPitcherMetrics: boolean;  // Pitcher: Velo metrics
  showInfieldVelo: boolean;     // 1B / 2B / SS / 3B
  showOutfieldVelo: boolean;    // LF / CF / RF
  showRawThrowVelo: boolean;    // Utility only

  metricPrivate: {
    homeToFirst: boolean;
    sixtyYdDash: boolean;
    exitVelo: boolean;
    rawThrowVelo: boolean;
    infieldThrowVelo: boolean;
    outfieldThrowVelo: boolean;
    catcherThrowVelo: boolean;
    avgFbVelo: boolean;
    avgChVelo: boolean;
    avgBbVelo: boolean;
    popTime: boolean;
    benchPress: boolean;
    squat: boolean;
  };
  setMetricPrivate: React.Dispatch<
    React.SetStateAction<{
      homeToFirst: boolean;
      sixtyYdDash: boolean;
      exitVelo: boolean;
      rawThrowVelo: boolean;
      infieldThrowVelo: boolean;
      outfieldThrowVelo: boolean;
      catcherThrowVelo: boolean;
      avgFbVelo: boolean;
      avgChVelo: boolean;
      avgBbVelo: boolean;
      popTime: boolean;
      benchPress: boolean;
      squat: boolean;
    }>
  >;

  homeToFirstEntries: MetricEntry[];
  setHomeToFirstEntries: React.Dispatch<React.SetStateAction<MetricEntry[]>>;
  sixtyYdDashEntries: MetricEntry[];
  setSixtyYdDashEntries: React.Dispatch<React.SetStateAction<MetricEntry[]>>;
  exitVeloEntries: MetricEntry[];
  setExitVeloEntries: React.Dispatch<React.SetStateAction<MetricEntry[]>>;

  rawThrowVeloEntries: MetricEntry[];
  setRawThrowVeloEntries: React.Dispatch<React.SetStateAction<MetricEntry[]>>;

  infieldThrowVeloEntries: MetricEntry[];
  setInfieldThrowVeloEntries: React.Dispatch<React.SetStateAction<MetricEntry[]>>;

  outfieldThrowVeloEntries: MetricEntry[];
  setOutfieldThrowVeloEntries: React.Dispatch<React.SetStateAction<MetricEntry[]>>;

  benchPressEntries: MetricEntry[];
  setBenchPressEntries: React.Dispatch<React.SetStateAction<MetricEntry[]>>;

  squatEntries: MetricEntry[];
  setSquatEntries: React.Dispatch<React.SetStateAction<MetricEntry[]>>;

  popTimeEntries: MetricEntry[];
  setPopTimeEntries: React.Dispatch<React.SetStateAction<MetricEntry[]>>;

  catcherThrowVeloEntries: MetricEntry[];
  setCatcherThrowVeloEntries: React.Dispatch<React.SetStateAction<MetricEntry[]>>;

  avgFbVeloEntries: MetricEntry[];
  setAvgFbVeloEntries: React.Dispatch<React.SetStateAction<MetricEntry[]>>;

  avgChVeloEntries: MetricEntry[];
  setAvgChVeloEntries: React.Dispatch<React.SetStateAction<MetricEntry[]>>;

  avgBbVeloEntries: MetricEntry[];
  setAvgBbVeloEntries: React.Dispatch<React.SetStateAction<MetricEntry[]>>;

  styles: Styles;
};

// ------- shared helpers (local to this file) -------
function decimalsForUnit(unitHint?: string): number | null {
  const u = (unitHint || "").toLowerCase();
  if (u === "seconds" || u === "sec" || u.includes("second")) return 3;
  if (u === "mph" || u === "lbs" || u === "lb") return 0;
  return null;
}
function roundForUnit(n: number, unitHint?: string): number {
  const d = decimalsForUnit(unitHint);
  if (d == null) return n;
  return Number(n.toFixed(d));
}
function displayForUnit(n: number, unitHint?: string): string {
  const d = decimalsForUnit(unitHint);
  if (d == null) return String(n);
  return n.toFixed(d);
}

// ---------- Reusable MetricSection ----------
function MetricSection(props: {
  title: string;
  unitHint?: string;
  entries: MetricEntry[];
  setEntries: React.Dispatch<React.SetStateAction<MetricEntry[]>>;
  placeholderValue?: string;
  idPrefix: string;
  styles: Styles;
}) {
  const {
    title,
    unitHint,
    entries,
    setEntries,
    placeholderValue,
    idPrefix,
    styles: { labelStyle, labelText, inputStyle },
  } = props;

  const [val, setVal] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [monthYear, setMonthYear] = useState<string>("");
  const [localErr, setLocalErr] = useState<string | null>(null);

  const unitSuffix = unitHint === "seconds" ? "sec" : (unitHint || "");

  function maskMonthYear(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, 6);
    const mm = digits.slice(0, 2);
    const yyyy = digits.slice(2, 6);
    let out = mm;
    if (yyyy) out += `/${yyyy}`;
    return out;
  }
  function normalizeMmYyyy(input: string): string | null {
    const s = (input || "").trim();
    if (!s) return null;
    let m = s.match(/^(\d{1,2})\/(\d{4})$/);
    if (m) {
      const mm = Number(m[1]), yyyy = Number(m[2]);
      if (mm >= 1 && mm <= 12 && yyyy >= 1900 && yyyy <= 3000) {
        return `${String(mm).padStart(2, "0")}/${String(yyyy)}`;
      }
      return null;
    }
    m = s.match(/^(\d{4})-(\d{1,2})$/);
    if (m) {
      const yyyy = Number(m[1]), mm = Number(m[2]);
      if (mm >= 1 && mm <= 12 && yyyy >= 1900 && yyyy <= 3000) {
        return `${String(mm).padStart(2, "0")}/${String(yyyy)}`;
      }
    }
    return null;
  }
  function sortAsc(a: MetricEntry, b: MetricEntry) {
    const [am, ay] = a.monthYear.split("/").map(Number);
    const [bm, by] = b.monthYear.split("/").map(Number);
    const ad = new Date(ay, am - 1, 1).getTime();
    const bd = new Date(by, bm - 1, 1).getTime();
    return ad - bd;
  }

  function doAdd() {
    setLocalErr(null);
    const raw = Number(val);
    if (!Number.isFinite(raw) || raw <= 0) {
      setLocalErr("Enter a valid numeric value.");
      return;
    }
    const norm = normalizeMmYyyy(monthYear);
    if (!norm) {
      setLocalErr("Enter a valid date as mm/yyyy.");
      return;
    }
    const rounded = roundForUnit(raw, unitHint);
    setEntries(prev => {
      const next = [...prev, { value: rounded, source: source.trim() || "Manual", monthYear: norm }];
      next.sort(sortAsc);
      return next;
    });
    setVal("");
    setSource("");
    setMonthYear("");
  }

  function removeAt(originalIndex: number) {
    setEntries(prev => prev.filter((_, idx) => idx !== originalIndex));
  }

  return (
    <section style={{ padding: "12px 0" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <h3 style={{ ...labelText, margin: 0 }}>{title}</h3>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10, alignItems: "end" }}>
        <label style={labelStyle}>
          <span style={labelText}>
            Value {unitHint ? <small style={{ color: "#64748b", fontWeight: 500 }}>({unitHint})</small> : null}
          </span>
          <input
            id={`${idPrefix}-value`}
            inputMode="decimal"
            value={val}
            onChange={(e) => {
              let v = e.target.value.replace(/[^\d.]/g, "");
              const parts = v.split(".");
              if (parts.length > 2) v = parts[0] + "." + parts.slice(1).join("");
              if (unitHint === "seconds" && parts[1]?.length > 3) v = parts[0] + "." + parts[1].slice(0, 3);
              setVal(v);
            }}
            onBlur={(e) => {
              if (unitHint === "seconds") {
                const n = parseFloat(e.target.value);
                if (Number.isFinite(n)) setVal(n.toFixed(3));
              }
            }}
            placeholder={placeholderValue || "e.g., 4.95"}
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          <span style={labelText}>Verification Source</span>
          <input
            id={`${idPrefix}-source`}
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Manual, Trackman, Rapsodo, Pocket Radar"
            style={inputStyle}
          />
        </label>

        <label style={labelStyle}>
          <span style={labelText}>Date (mm/yyyy)</span>
          <input
            id={`${idPrefix}-date`}
            inputMode="numeric"
            value={monthYear}
            onChange={(e) => setMonthYear(maskMonthYear(e.target.value))}
            onBlur={(e) => {
              const norm = normalizeMmYyyy(e.target.value);
              if (norm) setMonthYear(norm);
            }}
            placeholder="04/2025"
            style={inputStyle}
          />
        </label>

        <div>
          <button
            type="button"
            onClick={doAdd}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #0ea5e9",
              background: "#e0f2fe",
              color: "#0f172a",
              fontWeight: 800,
              cursor: "pointer",
              height: 40,
            }}
          >
            Add Metric
          </button>
          {localErr && (
            <div style={{ marginTop: 6, color: "#b91c1c", fontSize: 12, fontWeight: 600 }}>{localErr}</div>
          )}
        </div>
      </div>

      {entries.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ color: "#0f172a", fontWeight: 700, marginBottom: 6 }}>Entries</div>
          <div style={{ display: "grid", gap: 8 }}>
            {[...entries].slice().reverse().map((e, i) => {
              const originalIndex = entries.length - 1 - i;
              return (
                <div
                  key={`${e.monthYear}-${e.value}-${i}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "120px 1fr 120px auto",
                    gap: 8,
                    alignItems: "center",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: "6px 8px",
                    background: "#fff",
                  }}
                >
                  <div style={{ fontWeight: 700, color: "#0f172a" }}>{e.monthYear}</div>
                  <div style={{ color: "#0f172a", textAlign: "center" }}>{e.source || "Manual"}</div>
                  <div style={{ color: "#0f172a", textAlign: "right" }}>
                    {displayForUnit(e.value, unitHint)} {unitSuffix}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAt(originalIndex)}
                    title="Remove this entry"
                    style={{
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      color: "#64748b",
                      fontWeight: 800,
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

// ---------------------- Main Tab ----------------------
const TabMetrics = React.forwardRef<MetricsHandle, TabMetricsProps>(function TabMetrics(props, ref) {
  const {
    metricsPublic,
    showCatcherMetrics,
    showPitcherMetrics,
    showInfieldVelo,
    showOutfieldVelo,
    showRawThrowVelo,

    metricPrivate,
    setMetricPrivate,

    homeToFirstEntries,
    setHomeToFirstEntries,
    sixtyYdDashEntries,
    setSixtyYdDashEntries,
    exitVeloEntries,
    setExitVeloEntries,

    rawThrowVeloEntries,
    setRawThrowVeloEntries,
    infieldThrowVeloEntries,
    setInfieldThrowVeloEntries,
    outfieldThrowVeloEntries,
    setOutfieldThrowVeloEntries,

    benchPressEntries,
    setBenchPressEntries,
    squatEntries,
    setSquatEntries,
    popTimeEntries,
    setPopTimeEntries,
    catcherThrowVeloEntries,
    setCatcherThrowVeloEntries,
    avgFbVeloEntries,
    setAvgFbVeloEntries,
    avgChVeloEntries,
    setAvgChVeloEntries,
    avgBbVeloEntries,
    setAvgBbVeloEntries,

    styles: { labelStyle, labelText, inputStyle, hrStyle, errText, qMark },
  } = props;

  // ---- expose atomic payload to parent Save Profile button
  React.useImperativeHandle(
    ref,
    () => ({
      getPayload: (): MetricsPayload => ({
        metricsPublic,

        homeToFirst: homeToFirstEntries,
        sixtyYdDash: sixtyYdDashEntries,
        exitVelo: exitVeloEntries,

        rawThrowVelo: rawThrowVeloEntries,
        infieldThrowVelo: infieldThrowVeloEntries,
        outfieldThrowVelo: outfieldThrowVeloEntries,
        catcherThrowVelo: catcherThrowVeloEntries,

        benchPress: benchPressEntries,
        squat: squatEntries,
        popTime: popTimeEntries,
        avgFbVelo: avgFbVeloEntries,
        avgChVelo: avgChVeloEntries,
        avgBbVelo: avgBbVeloEntries,
      }),
    }),
    [
      metricsPublic,
      homeToFirstEntries,
      sixtyYdDashEntries,
      exitVeloEntries,
      rawThrowVeloEntries,
      infieldThrowVeloEntries,
      outfieldThrowVeloEntries,
      catcherThrowVeloEntries,
      benchPressEntries,
      squatEntries,
      popTimeEntries,
      avgFbVeloEntries,
      avgChVeloEntries,
      avgBbVeloEntries,
    ]
  );

  return (
    <>
      <div
        style={{
          padding: "10px 12px",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          background: "#f8fafc",
          color: "#334155",
          marginBottom: 12,
          lineHeight: 1.35,
        }}
      >
        <div>
          <strong>Who can edit?</strong>{" "}
          Player, Parent, and Team Admin can manually enter / edit / upload metrics for mapping.
        </div>

        <div style={{ marginTop: 6 }}>
          <strong>Plan Features:</strong>{" "}
          All plans can manually input metrics. Metrics are publicly visible with the Walk-On,
          All-American, and Teams plans only. Video upload of metric testing (e.g., exit velocity,
          60 yd dash, pop time) is available with Walk-On, All-American, and Teams plans via Video / Social Media tab. Quick-add and
          charting tools for tracking progression over time is only available with All-American and Teams plans.
        </div>

        <div style={{ marginTop: 6 }}>
          <strong>Public Visibility:</strong>{" "}
          {metricsPublic
            ? "Your metrics will be visible on your public profile with a Walk-On, All-American, or Teams plan."
            : "Metrics are visible to anyone viewing your ScoutLine profile."}
        </div>
      </div>

      {/* Base-running & speed */}
      <MetricSection
        title="Home to 1st"
        unitHint="seconds"
        placeholderValue="4.950"
        entries={homeToFirstEntries}
        setEntries={setHomeToFirstEntries}
        idPrefix="m-h2f"
        styles={{ labelStyle, labelText, inputStyle, hrStyle, errText, qMark }}
      />
      <hr style={hrStyle} />

      <MetricSection
        title="60 Yard Dash"
        unitHint="seconds"
        placeholderValue="7.100"
        entries={sixtyYdDashEntries}
        setEntries={setSixtyYdDashEntries}
        idPrefix="m-60"
        styles={{ labelStyle, labelText, inputStyle, hrStyle, errText, qMark }}
      />
      <hr style={hrStyle} />

      {/* Hitting & Arm Strength */}
      <MetricSection
        title="Exit Velocity"
        unitHint="mph"
        placeholderValue="90"
        entries={exitVeloEntries}
        setEntries={setExitVeloEntries}
        idPrefix="m-exit"
        styles={{ labelStyle, labelText, inputStyle, hrStyle, errText, qMark }}
      />
      <hr style={hrStyle} />

      {showRawThrowVelo && (
        <>
          <MetricSection
            title="Raw Throwing Velocity"
            unitHint="mph"
            placeholderValue="85"
            entries={rawThrowVeloEntries}
            setEntries={setRawThrowVeloEntries}
            idPrefix="m-rawthrow"
            styles={{ labelStyle, labelText, inputStyle, hrStyle, errText, qMark }}
          />
          <hr style={hrStyle} />
        </>
      )}

      {showInfieldVelo && (
        <>
          <MetricSection
            title="Infield Throwing Velocity"
            unitHint="mph"
            placeholderValue="82"
            entries={infieldThrowVeloEntries}
            setEntries={setInfieldThrowVeloEntries}
            idPrefix="m-infieldthrow"
            styles={{ labelStyle, labelText, inputStyle, hrStyle, errText, qMark }}
          />
          <hr style={hrStyle} />
        </>
      )}

      {showOutfieldVelo && (
        <>
          <MetricSection
            title="Outfield Throwing Velocity"
            unitHint="mph"
            placeholderValue="85"
            entries={outfieldThrowVeloEntries}
            setEntries={setOutfieldThrowVeloEntries}
            idPrefix="m-outfieldthrow"
            styles={{ labelStyle, labelText, inputStyle, hrStyle, errText, qMark }}
          />
          <hr style={hrStyle} />
        </>
      )}

      {/* Strength */}
      <MetricSection
        title="Bench Press"
        unitHint="lbs"
        placeholderValue="225"
        entries={benchPressEntries}
        setEntries={setBenchPressEntries}
        idPrefix="m-bench"
        styles={{ labelStyle, labelText, inputStyle, hrStyle, errText, qMark }}
      />
      <hr style={hrStyle} />

      <MetricSection
        title="Squat"
        unitHint="lbs"
        placeholderValue="315"
        entries={squatEntries}
        setEntries={setSquatEntries}
        idPrefix="m-squat"
        styles={{ labelStyle, labelText, inputStyle, hrStyle, errText, qMark }}
      />

      {/* Catcher-only metrics */}
      {showCatcherMetrics && (
        <>
          <hr style={hrStyle} />
          <MetricSection
            title="Pop Time"
            unitHint="seconds"
            placeholderValue="2.050"
            entries={popTimeEntries}
            setEntries={setPopTimeEntries}
            idPrefix="m-pop"
            styles={{ labelStyle, labelText, inputStyle, hrStyle, errText, qMark }}
          />
          <hr style={hrStyle} />
          <MetricSection
            title="Catcher Throwing Velocity"
            unitHint="mph"
            placeholderValue="78"
            entries={catcherThrowVeloEntries}
            setEntries={setCatcherThrowVeloEntries}
            idPrefix="m-catcherthrow"
            styles={{ labelStyle, labelText, inputStyle, hrStyle, errText, qMark }}
          />
        </>
      )}

      {/* Pitcher metrics */}
      {showPitcherMetrics && (
        <>
          <hr style={hrStyle} />
          <MetricSection
            title="Average Fastball Velocity"
            unitHint="mph"
            placeholderValue="82"
            entries={avgFbVeloEntries}
            setEntries={setAvgFbVeloEntries}
            idPrefix="m-fbavg"
            styles={{ labelStyle, labelText, inputStyle, hrStyle, errText, qMark }}
          />
          <hr style={hrStyle} />
          <MetricSection
            title="Average Changeup Velocity"
            unitHint="mph"
            placeholderValue="72"
            entries={avgChVeloEntries}
            setEntries={setAvgChVeloEntries}
            idPrefix="m-chavg"
            styles={{ labelStyle, labelText, inputStyle, hrStyle, errText, qMark }}
          />
          <hr style={hrStyle} />
          <MetricSection
            title="Average Breaking Ball Velocity"
            unitHint="mph"
            placeholderValue="73"
            entries={avgBbVeloEntries}
            setEntries={setAvgBbVeloEntries}
            idPrefix="m-bbavg"
            styles={{ labelStyle, labelText, inputStyle, hrStyle, errText, qMark }}
          />
        </>
      )}
    </>
  );
});

export default TabMetrics;
