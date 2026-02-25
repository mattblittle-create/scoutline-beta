// app/dashboard/player/profile/TabStats.tsx
"use client";

import React, { useEffect, useState, useImperativeHandle } from "react";

/** ---------- Types you can align with your profileTypes if you prefer ---------- */
export type HittingStats = {
  avg: number | null;
  gp: number | null;
  pa: number | null;
  ab: number | null;
  obp: number | null;
  slg: number | null;
  ops: number | null; // <-- NEW
  h: number | null;
  oneB: number | null;
  twoB: number | null;
  threeB: number | null;
  hr: number | null;
  rbi: number | null;
  r: number | null;
  bb: number | null;
  so: number | null;
  hbp: number | null;
  sb: number | null;
  /** store as whole percent with 2 decimals, e.g. 100.00 */
  sbPct: number | null;
};

export type FieldingStats = {
  fpct: number | null;
  tc: number | null;
  a: number | null;
  po: number | null;
  e: number | null;
};

export type CatchingStats = {
  inn: number | null; // 1 decimal like 25.1 (baseball innings convention)
  pb: number | null;
  sb: number | null; // allowed
  cs: number | null;
};

export type PitchingStats = {
  era: number | null; // 3 decimals
  ip: number | null; // 1 decimal like 25.1
  gp: number | null;
  gs: number | null;
  bf: number | null;
  pitches: number | null; // #P
  w: number | null;
  l: number | null;
  sv: number | null;
  h: number | null;
  r: number | null;
  er: number | null;
  bb: number | null;
  so: number | null;
  hbp: number | null;
  wp: number | null;
  pPerIp: number | null; // 1 decimal
  pPerBf: number | null; // 3 decimals
  sPct: number | null; // 2 decimals (whole percent)
  fpsPct: number | null; // 2 decimals
  weakPct: number | null; // 2 decimals
  babip: number | null; // 3 decimals
  baRisp: number | null; // 3 decimals
};

export type StatsSeason = {
  id: string;
  team: string;
  seasonTerm: string | null;
  seasonYear: number | null;

  hitting?: HittingStats;
  fielding?: FieldingStats;
  catching?: CatchingStats;
  pitching?: PitchingStats;

  pitchTypes?: string[];
  statsFiles?: File[]; // kept only for this session if parent wants it
  statsFileUrls?: string[]; // REAL URLs from /api/upload/stats
  statsMappedFrom?: string | null;
};

/** ---------- NEW: payload/handle for atomic save ---------- */
export type StatsPayloadSeason = {
  id: string;
  team: string;
  seasonTerm: string | null;
  seasonYear: number | null;
  hitting?: HittingStats;
  fielding?: FieldingStats;
  catching?: CatchingStats;
  pitching?: PitchingStats;
  pitchTypes?: string[];
  statsFileUrls?: string[];
  statsMappedFrom?: string | null;
};

export type StatsPayload = {
  statsPublic: boolean;
  seasons: StatsPayloadSeason[];
};

export type StatsHandle = { getPayload: () => StatsPayload };

export type Styles = {
  labelStyle: React.CSSProperties;
  labelText: React.CSSProperties;
  inputStyle: React.CSSProperties;
  hrStyle: React.CSSProperties;
  errText: React.CSSProperties;
};

export type TabStatsProps = {
  /** plan / visibility */
  statsPublic: boolean;

  /** toggles to decide which sections to render (derived from Athletics; not persisted here) */
  showCatcherMetrics: boolean;
  showPitcherMetrics: boolean;

  /** season list & editors */
  statsSeasons: StatsSeason[];
  addStatsSeason: () => void;
  removeStatsSeason: (id: string) => void;
  updateStatsSeason: (id: string, patch: Partial<StatsSeason>) => void;

  /** files – parent handles upload + state */
  onPickStatFiles: (seasonId: string, files: FileList | null) => void;
  removeStatFile: (seasonId: string, fileIndex: number) => void;

  /** options */
  teamOptions: string[];
  seasonTerms: string[];
  pitchTypes: string[];
  yearOptions: number[];

  /** misc feedback (optional) */
  setErr?: (msg: string) => void;
  transientSaved?: () => void;

  /** shared inline styles */
  styles: Styles;
};

/** ---------- Local helpers ---------- */
const EMPTY_HITTING: HittingStats = {
  avg: null,
  gp: null,
  pa: null,
  ab: null,
  obp: null,
  slg: null,
  ops: null,
  h: null,
  oneB: null,
  twoB: null,
  threeB: null,
  hr: null,
  rbi: null,
  r: null,
  bb: null,
  so: null,
  hbp: null,
  sb: null,
  sbPct: null,
};

const EMPTY_FIELDING: FieldingStats = {
  fpct: null,
  tc: null,
  a: null,
  po: null,
  e: null,
};

const EMPTY_CATCHING: CatchingStats = {
  inn: null,
  pb: null,
  sb: null,
  cs: null,
};

const EMPTY_PITCHING: PitchingStats = {
  era: null,
  ip: null,
  gp: null,
  gs: null,
  bf: null,
  pitches: null,
  w: null,
  l: null,
  sv: null,
  h: null,
  r: null,
  er: null,
  bb: null,
  so: null,
  hbp: null,
  wp: null,
  pPerIp: null,
  pPerBf: null,
  sPct: null,
  fpsPct: null,
  weakPct: null,
  babip: null,
  baRisp: null,
};

function intOrNull(v: string): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s.replace(/[^\d-]/g, ""));
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function decOrNull(v: string): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** ---------- Small value-field components used below ---------- */
function IntField({
  label,
  value,
  onChange,
  inputStyle,
  labelStyle,
  labelText,
  placeholder,
}: {
  label: string;
  value: number | null;
  onChange: (v: string) => void;
  inputStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
  labelText: React.CSSProperties;
  placeholder?: string;
}) {
  return (
    <label style={labelStyle}>
      <span
        style={{
          ...labelText,
          fontSize: 12,
          fontWeight: 600,
          lineHeight: 1.1,
        }}
      >
        {label}
      </span>
      <input
        type="number"
        step="1"
        inputMode="numeric"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={inputStyle}
      />
    </label>
  );
}

function Dec3Field({
  label,
  value,
  onChange,
  onBlur,
  inputStyle,
  labelStyle,
  labelText,
  placeholder,
}: {
  label: string;
  value: number | null;
  onChange: (v: string) => void;
  onBlur?: () => void;
  inputStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
  labelText: React.CSSProperties;
  placeholder?: string;
}) {
  return (
    <label style={labelStyle}>
      <span
        style={{
          ...labelText,
          fontSize: 12,
          fontWeight: 600,
          lineHeight: 1.1,
        }}
      >
        {label}
      </span>
      <input
        type="number"
        step="0.001"
        inputMode="decimal"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        style={inputStyle}
      />
    </label>
  );
}

function Dec2Field({
  label,
  value,
  onChange,
  inputStyle,
  labelStyle,
  labelText,
  placeholder,
}: {
  label: string;
  value: number | null;
  onChange: (v: string) => void;
  inputStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
  labelText: React.CSSProperties;
  placeholder?: string;
}) {
  return (
    <label style={labelStyle}>
      <span
        style={{
          ...labelText,
          fontSize: 12,
          fontWeight: 600,
          lineHeight: 1.1,
        }}
      >
        {label}
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={value == null ? "" : Number(value).toFixed(2)}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d.]/g, "");
          const parts = raw.split(".");
          const cleaned =
            parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : raw;
          onChange(cleaned);
        }}
        onBlur={(e) => {
          const n = parseFloat(e.currentTarget.value);
          if (Number.isFinite(n)) onChange(n.toFixed(2));
          else onChange("");
        }}
        placeholder={placeholder}
        style={inputStyle}
      />
    </label>
  );
}

/** For 1-decimal inputs (e.g., IP, P/IP) keep a local draft string to limit precision while typing */
function Dec1Field({
  label,
  value,
  onChange,
  inputStyle,
  labelStyle,
  labelText,
  placeholder,
}: {
  label: string;
  value: number | null;
  onChange: (v: string) => void;
  inputStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
  labelText: React.CSSProperties;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState<string>(
    value == null ? "" : (Math.round(value * 10) / 10).toFixed(1)
  );

  useEffect(() => {
    setDraft(
      value == null ? "" : (Math.round(value * 10) / 10).toFixed(1)
    );
  }, [value]);

  const onDraftChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value.replace(/[^\d.]/g, "");
    const parts = v.split(".");
    if (parts.length > 2) v = parts[0] + "." + parts.slice(1).join("");
    if (parts[1]?.length > 1) v = parts[0] + "." + parts[1].slice(0, 1);
    setDraft(v);
  };

  const onDraftBlur = () => {
    const n = parseFloat(draft);
    if (Number.isFinite(n)) {
      const fixed = (Math.round(n * 10) / 10).toFixed(1);
      setDraft(fixed);
      onChange(fixed);
    } else {
      setDraft("");
      onChange("");
    }
  };

  return (
    <label style={labelStyle}>
      <span
        style={{
          ...labelText,
          fontSize: 12,
          fontWeight: 600,
          lineHeight: 1.1,
        }}
      >
        {label}
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={draft}
        onChange={onDraftChange}
        onBlur={onDraftBlur}
        placeholder={placeholder}
        style={inputStyle}
      />
    </label>
  );
}

/** ---------- Component ---------- */
const TabStats = React.forwardRef<StatsHandle, TabStatsProps>(function TabStats(
  {
    statsPublic,
    showCatcherMetrics,
    showPitcherMetrics,
    statsSeasons,
    addStatsSeason,
    removeStatsSeason,
    updateStatsSeason,
    onPickStatFiles,
    removeStatFile,
    teamOptions,
    seasonTerms,
    pitchTypes,
    yearOptions,
    setErr,
    transientSaved,
    styles: { labelStyle, labelText, inputStyle, hrStyle, errText },
  },
  ref
) {
  /** Expose atomic payload to parent Save button */
  useImperativeHandle(
    ref,
    (): StatsHandle => ({
      getPayload: () => ({
        statsPublic,
        seasons: statsSeasons.map((s) => ({
          id: s.id,
          team: s.team,
          seasonTerm: s.seasonTerm,
          seasonYear: s.seasonYear,
          hitting: s.hitting,
          fielding: s.fielding,
          // keep catching/pitching if present; visibility is controlled by Athletics
          catching: s.catching,
          pitching: s.pitching,
          pitchTypes: s.pitchTypes,
          statsFileUrls: s.statsFileUrls, // serializable (omit File[])
          statsMappedFrom: s.statsMappedFrom ?? null,
        })),
      }),
    }),
    [statsPublic, statsSeasons]
  );

  /** helper to get a readable filename from a URL or /uploads/... path */
  const prettyNameFromUrl = (u?: string) => {
    if (!u) return "";
    try {
      const path = new URL(
        u,
        typeof window !== "undefined"
          ? window.location.origin
          : "http://localhost"
      ).pathname;
      const seg = path.split("/").filter(Boolean).pop() || "";
      return decodeURIComponent(seg);
    } catch {
      // likely a site-relative path (e.g., /uploads/abc.pdf) — just take last segment
      const seg = u.split("/").filter(Boolean).pop() || u;
      try {
        return decodeURIComponent(seg);
      } catch {
        return seg;
      }
    }
  };

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
          Player, Parent, and Team Admin can manually enter / edit / upload
          stats.
        </div>

        <div style={{ marginTop: 6 }}>
          <strong>Plan Features:</strong>{" "}
          All plans can manually input stats. Stats are publicly visible with
          the Walk-On, All-American, and Teams plans only. Link to Stats
          (upload) of CSV, XLSX, or PDF file(s) (ex. GameChanger) is available
          with Walk-On, All-American, and Teams plans. Quick Map &amp; Apply of
          CSV/XLSX file(s) (ex. GameChanger) is only available with All-American
          and Teams plans.
        </div>

        <div style={{ marginTop: 6 }}>
          <strong>Public Visibility:</strong>{" "}
          {statsPublic
            ? "Your stats will be visible on your public profile with a Walk-On, All-American, or Teams plan."
            : "These stats will not be shown on your public profile for your current plan."}
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button
          type="button"
          onClick={addStatsSeason}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #0ea5e9",
            background: "#e0f2fe",
            color: "#0f172a",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Add Season
        </button>
        {statsSeasons.length === 0 && (
          <span style={{ color: "#64748b" }}>
            Click “Add Season” to begin.
          </span>
        )}
      </div>

      {statsSeasons.map((s) => {
        const teamListId = `team-suggest-${s.id}`;

        /** Column-precise mapper with header fallbacks (GameChanger CSV/XLSX) */
        const mapFromGameChanger = async (file: File) => {
          const { read, utils } = await import("xlsx"); // lazy load

          const data = await file.arrayBuffer();
          const wb = read(data, { type: "array" });
          const sheet = wb.Sheets[wb.SheetNames[0]];

          const rowsAOA: any[][] = utils.sheet_to_json(sheet, {
            header: 1,
            defval: "",
          }) as any[][];

          const EXPECTED = new Set([
            "NUMBER",
            "FIRST",
            "LAST",
            "GP",
            "PA",
            "AB",
            "R",
            "H",
            "1B",
            "2B",
            "3B",
            "HR",
            "RBI",
            "BB",
            "HBP",
            "SO",
            "SB",
            "CS",
            "AVG",
            "OBP",
            "SLG",
            "OPS",
            "IP",
            "BF",
            "ER",
            "ERA",
            "WHIP",
            "INN",
            "TC",
            "A",
            "PO",
            "E",
            "FPCT",
            "PB",
            "#P",
            "GS",
            "W",
            "L",
            "SV",
            "P/IP",
            "P/BF",
            "S%",
            "FPS%",
            "WEAK%",
            "BABIP",
            "BA/RISP",
            "SB%",
            "SB-ATT",
            "SBA",
            "CSB",
          ]);

          let headerIdx = -1;
          for (let i = 0; i < Math.min(rowsAOA.length, 50); i++) {
            const vals = rowsAOA[i].map((v) => String(v || "").trim());
            const hits = vals.reduce(
              (acc, v) => acc + (EXPECTED.has(v.toUpperCase()) ? 1 : 0),
              0
            );
            if (hits >= 8) {
              headerIdx = i;
              break;
            }
          }
          if (headerIdx < 0) {
            setErr?.(
              "Could not find headers in that file. Please upload the original GameChanger export."
            );
            return;
          }

          const table = utils.sheet_to_json<Record<string, any>>(sheet, {
            range: headerIdx,
            defval: "",
          });
          if (!table.length) {
            setErr?.("No stat rows found under headers.");
            return;
          }

          const dataRowIdx = headerIdx + 1;
          const dataRow = rowsAOA[dataRowIdx] || [];

          const colToIdx = (label: string) => {
            const s = label.toUpperCase().trim();
            let n = 0;
            for (let i = 0; i < s.length; i++) {
              n = n * 26 + (s.charCodeAt(i) - 64);
            }
            return n - 1;
          };
          const cell = (col?: string) =>
            col ? dataRow[colToIdx(col)] : undefined;

          const row = table[0];
          const pick = (...keys: string[]) => {
            for (const k of keys) {
              if (Object.prototype.hasOwnProperty.call(row, k)) {
                return (row as any)[k];
              }
            }
            return undefined;
          };

          const toNum = (v: any): number | null => {
            if (v == null || v === "") return null;
            const s = String(v).trim().replaceAll(",", "");
            const n = Number(s);
            return Number.isFinite(n) ? n : null;
          };

          const toPctDec = (v: any): number | null => {
            if (v == null || v === "") return null;
            const s = String(v).trim();
            if (s.endsWith("%")) {
              const n = Number(s.slice(0, -1));
              return Number.isFinite(n) ? n / 100 : null;
            }
            const n = Number(s);
            if (!Number.isFinite(n)) return null;
            return n > 1 ? n / 100 : n;
          };

          const toPctWhole2 = (v: any): number | null => {
            const dec = toPctDec(v);
            if (dec == null) return null;
            const whole = dec * 100;
            return Number.isFinite(whole) ? Number(whole.toFixed(2)) : null;
          };

          const toFixedN = (v: any, n: number): number | null => {
            const num = toNum(v);
            if (num == null) return null;
            return Number(num.toFixed(n));
          };

          // Precompute OBP/SLG so we can derive OPS if needed.
          const obpVal = toFixedN(pick("OBP"), 3);
          const slgVal = toFixedN(pick("SLG"), 3);
          const opsVal =
            toFixedN(pick("OPS"), 3) ??
            (obpVal != null && slgVal != null
              ? Number((obpVal + slgVal).toFixed(3))
              : null);

          const COLS = {
            hitting: {},
            catching: { sb: "FB" as const }, // SBA / SB allowed
            pitching: {
              gp: "BD" as const,
              h: "BN" as const,
              r: "BO" as const,
              bb: "BQ" as const,
              so: "BR" as const,
              hbp: "BT" as const,
              babip: "DM" as const,
              baRisp: "DN" as const,
            },
          } as const;

          const hittingPatch: Partial<HittingStats> = {
            avg: toFixedN(pick("AVG"), 3),
            gp: toNum(pick("GP.1", "GP")),
            pa: toNum(pick("PA")),
            ab: toNum(pick("AB")),
            obp: obpVal,
            slg: slgVal,
            ops: opsVal, // <-- NEW
            h: toNum(pick("H.1", "H")),
            oneB: toNum(pick("1B")),
            twoB: toNum(pick("2B")),
            threeB: toNum(pick("3B")),
            hr: toNum(pick("HR")),
            rbi: toNum(pick("RBI")),
            r: toNum(pick("R.1", "R")),
            bb: toNum(pick("BB.1", "BB")),
            so: toNum(pick("SO.1", "SO")),
            hbp: toNum(pick("HBP.1", "HBP")),
            sb: toNum(pick("SB.1", "SB")),
            sbPct: toPctWhole2(pick("SB%", "SB%/ATT", "SB% ")),
          };

          const fieldingPatch: Partial<FieldingStats> = {
            fpct: toFixedN(pick("FPCT"), 3),
            tc: toNum(pick("TC")),
            a: toNum(pick("A")),
            po: toNum(pick("PO")),
            e: toNum(pick("E")),
          };

          const catchingPatch: Partial<CatchingStats> = {
            inn: toNum(pick("INN")),
            pb: toNum(pick("PB")),
            sb:
              toNum(cell(COLS.catching.sb)) ??
              toNum(pick("SB.2", "SBA", "SB-ATT")),
            cs: toNum(pick("CS", "CS.2")),
          };

          const pitchingPatch: Partial<PitchingStats> = {
            era: toFixedN(pick("ERA"), 3),
            ip: toNum(pick("IP")),
            gp:
              toNum(cell(COLS.pitching.gp)) ??
              toNum(pick("GP.2", "G")),
            gs: toNum(pick("GS")),
            bf: toNum(pick("BF")),
            pitches: toNum(pick("#P", "P")),
            w: toNum(pick("W")),
            l: toNum(pick("L")),
            sv: toNum(pick("SV")),
            h:
              toNum(cell(COLS.pitching.h)) ??
              toNum(pick("H.2", "H")),
            r:
              toNum(cell(COLS.pitching.r)) ??
              toNum(pick("R.2", "R")),
            er: toNum(pick("ER")),
            bb:
              toNum(cell(COLS.pitching.bb)) ??
              toNum(pick("BB.2", "BB")),
            so:
              toNum(cell(COLS.pitching.so)) ??
              toNum(pick("SO.2", "K", "SO")),
            hbp:
              toNum(cell(COLS.pitching.hbp)) ??
              toNum(pick("HBP.2", "HBP")),
            wp: toNum(pick("WP")),
            pPerIp: toNum(pick("P/IP")),
            pPerBf: toNum(pick("P/BF")),
            sPct: toNum(pick("S%")),
            fpsPct: toNum(pick("FPS%")),
            weakPct: toNum(pick("WEAK%")),
            babip:
              toNum(cell(COLS.pitching.babip)) ??
              toNum(pick("BABIP")),
            baRisp:
              toNum(cell(COLS.pitching.baRisp)) ??
              toNum(pick("BA/RISP")),
          };

          updateStatsSeason(s.id, {
            hitting: {
              ...(s.hitting ?? EMPTY_HITTING),
              ...hittingPatch,
            },
            fielding: {
              ...(s.fielding ?? EMPTY_FIELDING),
              ...fieldingPatch,
            },
            catching: showCatcherMetrics
              ? {
                  ...(s.catching ?? EMPTY_CATCHING),
                  ...catchingPatch,
                }
              : s.catching,
            pitching: showPitcherMetrics
              ? {
                  ...(s.pitching ?? EMPTY_PITCHING),
                  ...pitchingPatch,
                }
              : s.pitching,
            statsMappedFrom: file.name,
          });

          transientSaved?.();
        };

        return (
          <section
            key={s.id}
            style={{
              marginTop: 12,
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 12,
              background: "#ffffff",
            }}
          >
            {/* Top bar: Season + Year on the left, Remove on the right */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 12,
                flexWrap: "wrap",
              }}
            >
              {/* Left: Season + Year */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(2, minmax(140px, 1fr))",
                  gap: 12,
                  alignItems: "end",
                  flex: "1 1 auto",
                }}
              >
                <label style={labelStyle}>
                  <span style={labelText}>Season</span>
                  <select
                    value={s.seasonTerm ?? ""}
                    onChange={(e) =>
                      updateStatsSeason(s.id, {
                        seasonTerm: e.target.value as any,
                      })
                    }
                    style={inputStyle}
                  >
                    <option value="">Select…</option>
                    {seasonTerms.map((term) => (
                      <option key={term} value={term}>
                        {term}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={labelStyle}>
                  <span style={labelText}>Year</span>
                  <select
                    value={s.seasonYear ?? ""}
                    onChange={(e) =>
                      updateStatsSeason(s.id, {
                        seasonYear: e.target.value
                          ? Number(e.target.value)
                          : null,
                      })
                    }
                    style={inputStyle}
                  >
                    <option value="">Select…</option>
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Right: Remove */}
              <button
                type="button"
                onClick={() => removeStatsSeason(s.id)}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "1px solid #0ea5e9",
                  background: "#ffffff",
                  color: "#b91c1c",
                  fontWeight: 800,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flex: "0 0 auto",
                }}
              >
                Remove Season
              </button>
            </div>

            {/* Team + Season Files */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                alignItems: "start",
              }}
            >
              {/* Team */}
              <label style={labelStyle}>
                <span style={labelText}>Team</span>
                <input
                  list={teamListId}
                  value={s.team}
                  onChange={(e) =>
                    updateStatsSeason(s.id, {
                      team: e.target.value,
                    })
                  }
                  placeholder="Choose or type a team"
                  style={inputStyle}
                />
                <datalist id={teamListId}>
                  {teamOptions.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
                <div
                  style={{
                    color: "#64748b",
                    fontSize: 12,
                    marginTop: 4,
                  }}
                >
                  Options come from Athletics tab
                  (HS/Travel/Other Teams). You can also type a
                  custom team.
                </div>
              </label>

              {/* Files & Quick Map */}
              <div style={{ display: "grid", gap: 8 }}>
                <label style={labelStyle}>
                  <span style={labelText}>
                    Link to Stats (upload)
                  </span>
                  <input
                    type="file"
                    accept=".csv,.xls,.xlsx,.pdf"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        onPickStatFiles(s.id, files);
                      }
                      // allow re-selecting the same file
                      e.currentTarget.value = "";
                    }}
                    style={inputStyle}
                  />
                  <div
                    style={{
                      color: "#64748b",
                      fontSize: 12,
                      marginTop: 4,
                    }}
                  >
                    CSV, XLSX, or PDF formats from a source such as
                    GameChanger.
                  </div>
                </label>

                <label style={labelStyle}>
                  <span style={labelText}>
                    Quick Map &amp; Apply (CSV/XLSX)
                  </span>
                  <input
                    type="file"
                    accept=".csv,.xls,.xlsx"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void mapFromGameChanger(f);
                      e.currentTarget.value = "";
                    }}
                    style={inputStyle}
                  />
                  <div
                    style={{
                      color: "#64748b",
                      fontSize: 12,
                      marginTop: 4,
                    }}
                  >
                    Parses GameChanger export and fills
                    Hitting/Fielding/Catching/Pitching here.
                  </div>
                </label>

                {s.statsMappedFrom && (
                  <div
                    style={{
                      color: "#16a34a",
                      fontSize: 12,
                    }}
                  >
                    Applied mapped stats from{" "}
                    <strong>{s.statsMappedFrom}</strong>.
                  </div>
                )}
              </div>
            </div>

            {/* Attached / Linked stat files chips (persisted URLs drive everything) */}
            {Array.isArray(s.statsFileUrls) &&
              s.statsFileUrls.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div
                    style={{
                      color: "#0f172a",
                      fontWeight: 700,
                      marginBottom: 6,
                    }}
                  >
                    Attached Stat Files
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    {s.statsFileUrls.map((url, idx) => {
                      const label = prettyNameFromUrl(url);
                      return (
                        <span
                          key={`${idx}-${label}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "6px 8px",
                            border:
                              "1px solid #e5e7eb",
                            borderRadius: 8,
                            background: "#fff",
                            maxWidth: "100%",
                          }}
                        >
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              textDecoration:
                                "underline",
                              color: "#0f172a",
                              overflow: "hidden",
                              textOverflow:
                                "ellipsis",
                              whiteSpace: "nowrap",
                              maxWidth: 260,
                            }}
                            title={url}
                          >
                            {label}
                          </a>
                          <button
                            type="button"
                            onClick={() =>
                              removeStatFile(
                                s.id,
                                idx
                              )
                            }
                            title="Remove"
                            style={{
                              border: "none",
                              background:
                                "transparent",
                              cursor: "pointer",
                              color: "#64748b",
                              fontWeight: 800,
                              lineHeight: 1,
                            }}
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

            <hr style={hrStyle} />

            {/* Sections */}
            <div style={{ display: "grid", gap: 16 }}>
              {/* Hitting */}
              <section>
                <div
                  style={{
                    ...labelText,
                    marginBottom: 6,
                  }}
                >
                  Hitting
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(4, minmax(140px, 1fr))",
                    gap: 12,
                    alignItems: "end",
                  }}
                >
                  {(() => {
                    const h = s.hitting ?? EMPTY_HITTING;
                    const merge = (
                      patch: Partial<HittingStats>
                    ) =>
                      updateStatsSeason(s.id, {
                        hitting: {
                          ...(s.hitting ??
                            EMPTY_HITTING),
                          ...patch,
                        },
                      });

                    return (
                      <>
                        {/* row 1 */}
                        <Dec3Field
                          label="Batting Average (AVG)"
                          value={h.avg}
                          onChange={(v) =>
                            merge({
                              avg: decOrNull(v),
                            })
                          }
                          onBlur={() =>
                            h.avg != null &&
                            merge({
                              avg: Number(
                                h.avg.toFixed(3)
                              ),
                            })
                          }
                          placeholder="0.350"
                          inputStyle={inputStyle}
                          labelStyle={labelStyle}
                          labelText={labelText}
                        />
                        <IntField
                          label="Games Played (GP)"
                          value={h.gp}
                          onChange={(v) =>
                            merge({
                              gp: intOrNull(v),
                            })
                          }
                          placeholder="22"
                          inputStyle={inputStyle}
                          labelStyle={labelStyle}
                          labelText={labelText}
                        />
                        <IntField
                          label="Plate Appearances (PA)"
                          value={h.pa}
                          onChange={(v) =>
                            merge({
                              pa: intOrNull(v),
                            })
                          }
                          placeholder="35"
                          inputStyle={inputStyle}
                          labelStyle={labelStyle}
                          labelText={labelText}
                        />
                        <IntField
                          label="At Bats (AB)"
                          value={h.ab}
                          onChange={(v) =>
                            merge({
                              ab: intOrNull(v),
                            })
                          }
                          placeholder="25"
                          inputStyle={inputStyle}
                          labelStyle={labelStyle}
                          labelText={labelText}
                        />

                        {/* row 2 */}
                        <Dec3Field
                          label="On Base Percentage (OBP)"
                          value={h.obp}
                          onChange={(v) =>
                            merge({
                              obp: decOrNull(v),
                            })
                          }
                          onBlur={() =>
                            h.obp != null &&
                            merge({
                              obp: Number(
                                h.obp.toFixed(3)
                              ),
                            })
                          }
                          placeholder="0.600"
                          inputStyle={inputStyle}
                          labelStyle={labelStyle}
                          labelText={labelText}
                        />
                        <Dec3Field
                          label="Slugging Percentage (SLG)"
                          value={h.slg}
                          onChange={(v) =>
                            merge({
                              slg: decOrNull(v),
                            })
                          }
                          onBlur={() =>
                            h.slg != null &&
                            merge({
                              slg: Number(
                                h.slg.toFixed(3)
                              ),
                            })
                          }
                          placeholder="0.900"
                          inputStyle={inputStyle}
                          labelStyle={labelStyle}
                          labelText={labelText}
                        />
                        {/* NEW: OPS placed right after SLG */}
                        <Dec3Field
                          label="On Base Percentage Plus Slugging Percentage (OPS)"
                          value={h.ops}
                          onChange={(v) =>
                            merge({
                              ops: decOrNull(v),
                            })
                          }
                          onBlur={() =>
                            h.ops != null &&
                            merge({
                              ops: Number(
                                h.ops.toFixed(3)
                              ),
                            })
                          }
                          placeholder="1.500"
                          inputStyle={inputStyle}
                          labelStyle={labelStyle}
                          labelText={labelText}
                        />
                        <IntField
                          label="Hits (H)"
                          value={h.h}
                          onChange={(v) =>
                            merge({
                              h: intOrNull(v),
                            })
                          }
                          placeholder="20"
                          inputStyle={inputStyle}
                          labelStyle={labelStyle}
                          labelText={labelText}
                        />

                        {/* row 3 */}
                        <IntField
                          label="Singles (1B)"
                          value={h.oneB}
                          onChange={(v) =>
                            merge({
                              oneB: intOrNull(v),
                            })
                          }
                          placeholder="12"
                          inputStyle={inputStyle}
                          labelStyle={labelStyle}
                          labelText={labelText}
                        />
                        <IntField
                          label="Doubles (2B)"
                          value={h.twoB}
                          onChange={(v) =>
                            merge({
                              twoB: intOrNull(v),
                            })
                          }
                          placeholder="4"
                          inputStyle={inputStyle}
                          labelStyle={labelStyle}
                          labelText={labelText}
                        />
                        <IntField
                          label="Triples (3B)"
                          value={h.threeB}
                          onChange={(v) =>
                            merge({
                              threeB: intOrNull(v),
                            })
                          }
                          placeholder="2"
                          inputStyle={inputStyle}
                          labelStyle={labelStyle}
                          labelText={labelText}
                        />
                        <IntField
                          label="Home Runs (HR)"
                          value={h.hr}
                          onChange={(v) =>
                            merge({
                              hr: intOrNull(v),
                            })
                          }
                          placeholder="2"
                          inputStyle={inputStyle}
                          labelStyle={labelStyle}
                          labelText={labelText}
                        />

                        {/* row 4 */}
                        <IntField
                          label="Runs Batted In (RBI)"
                          value={h.rbi}
                          onChange={(v) =>
                            merge({
                              rbi: intOrNull(v),
                            })
                          }
                          placeholder="15"
                          inputStyle={inputStyle}
                          labelStyle={labelStyle}
                          labelText={labelText}
                        />
                        <IntField
                          label="Runs Scored (R)"
                          value={h.r}
                          onChange={(v) =>
                            merge({
                              r: intOrNull(v),
                            })
                          }
                          placeholder="12"
                          inputStyle={inputStyle}
                          labelStyle={labelStyle}
                          labelText={labelText}
                        />
                        <IntField
                          label="Walks (BB)"
                          value={h.bb}
                          onChange={(v) =>
                            merge({
                              bb: intOrNull(v),
                            })
                          }
                          placeholder="5"
                          inputStyle={inputStyle}
                          labelStyle={labelStyle}
                          labelText={labelText}
                        />
                        <IntField
                          label="Strike Outs (SO)"
                          value={h.so}
                          onChange={(v) =>
                            merge({
                              so: intOrNull(v),
                            })
                          }
                          placeholder="3"
                          inputStyle={inputStyle}
                          labelStyle={labelStyle}
                          labelText={labelText}
                        />

                        {/* row 5 */}
                        <IntField
                          label="Hit By Pitch (HBP)"
                          value={h.hbp}
                          onChange={(v) =>
                            merge({
                              hbp: intOrNull(v),
                            })
                          }
                          placeholder="2"
                          inputStyle={inputStyle}
                          labelStyle={labelStyle}
                          labelText={labelText}
                        />
                        <IntField
                          label="Stolen Bases (SB)"
                          value={h.sb}
                          onChange={(v) =>
                            merge({
                              sb: intOrNull(v),
                            })
                          }
                          placeholder="10"
                          inputStyle={inputStyle}
                          labelStyle={labelStyle}
                          labelText={labelText}
                        />
                        <Dec2Field
                          label="Stolen Base Percentage (SB%)"
                          value={h.sbPct}
                          onChange={(v) =>
                            merge({
                              sbPct: decOrNull(v),
                            })
                          }
                          placeholder="100.00"
                          inputStyle={inputStyle}
                          labelStyle={labelStyle}
                          labelText={labelText}
                        />
                        <div />
                      </>
                    );
                  })()}
                </div>

                {!statsPublic && (
                  <div
                    style={{
                      color: "#64748b",
                      fontSize: 12,
                      marginTop: 6,
                    }}
                  >
                    These stats are private on the public
                    profile for your current plan.
                  </div>
                )}
              </section>

              {/* Fielding */}
              <section>
                <div
                  style={{
                    ...labelText,
                    marginBottom: 6,
                  }}
                >
                  Fielding
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(4, minmax(140px, 1fr))",
                    gap: 12,
                    alignItems: "end",
                  }}
                >
                  {(() => {
                    const f = s.fielding ?? EMPTY_FIELDING;
                    const merge = (
                      patch: Partial<FieldingStats>
                    ) =>
                      updateStatsSeason(s.id, {
                        fielding: {
                          ...(s.fielding ??
                            EMPTY_FIELDING),
                          ...patch,
                        },
                      });

                    return (
                      <>
                        <Dec3Field
                          label="Fielding Percentage (FPCT)"
                          value={f.fpct}
                          onChange={(v) =>
                            merge({
                              fpct: decOrNull(v),
                            })
                          }
                          onBlur={() =>
                            f.fpct != null &&
                            merge({
                              fpct: Number(
                                f.fpct.toFixed(3)
                              ),
                            })
                          }
                          placeholder="1.000"
                          inputStyle={inputStyle}
                          labelStyle={labelStyle}
                          labelText={labelText}
                        />
                        <IntField
                          label="Total Chances (TC)"
                          value={f.tc}
                          onChange={(v) =>
                            merge({
                              tc: intOrNull(v),
                            })
                          }
                          placeholder="20"
                          inputStyle={inputStyle}
                          labelStyle={labelStyle}
                          labelText={labelText}
                        />
                        <IntField
                          label="Assists (A)"
                          value={f.a}
                          onChange={(v) =>
                            merge({
                              a: intOrNull(v),
                            })
                          }
                          placeholder="10"
                          inputStyle={inputStyle}
                          labelStyle={labelStyle}
                          labelText={labelText}
                        />
                        <IntField
                          label="Put Outs (PO)"
                          value={f.po}
                          onChange={(v) =>
                            merge({
                              po: intOrNull(v),
                            })
                          }
                          placeholder="10"
                          inputStyle={inputStyle}
                          labelStyle={labelStyle}
                          labelText={labelText}
                        />

                        <IntField
                          label="Errors (E)"
                          value={f.e}
                          onChange={(v) =>
                            merge({
                              e: intOrNull(v),
                            })
                          }
                          placeholder="0"
                          inputStyle={inputStyle}
                          labelStyle={labelStyle}
                          labelText={labelText}
                        />
                        <div />
                        <div />
                        <div />
                      </>
                    );
                  })()}
                </div>

                {!statsPublic && (
                  <div
                    style={{
                      color: "#64748b",
                      fontSize: 12,
                      marginTop: 6,
                    }}
                  >
                    These stats are private on the public
                    profile for your current plan.
                  </div>
                )}
              </section>

              {/* Catching (if catcher) */}
              {showCatcherMetrics && (
                <section>
                  <div
                    style={{
                      ...labelText,
                      marginBottom: 6,
                    }}
                  >
                    Catching
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(4, minmax(140px, 1fr))",
                      gap: 12,
                      alignItems: "end",
                    }}
                  >
                    {(() => {
                      const c = s.catching ?? EMPTY_CATCHING;
                      const merge = (
                        patch: Partial<CatchingStats>
                      ) =>
                        updateStatsSeason(s.id, {
                          catching: {
                            ...(s.catching ??
                              EMPTY_CATCHING),
                            ...patch,
                          },
                        });

                      return (
                        <>
                          <Dec1Field
                            label="Innings (INN)"
                            value={c.inn}
                            onChange={(v) =>
                              merge({
                                inn: decOrNull(v),
                              })
                            }
                            placeholder="25.1"
                            inputStyle={inputStyle}
                            labelStyle={labelStyle}
                            labelText={labelText}
                          />
                          <IntField
                            label="Passed Balls (PB)"
                            value={c.pb}
                            onChange={(v) =>
                              merge({
                                pb: intOrNull(v),
                              })
                            }
                            placeholder="0"
                            inputStyle={inputStyle}
                            labelStyle={labelStyle}
                            labelText={labelText}
                          />
                          <IntField
                            label="Stolen Bases Allowed (SB)"
                            value={c.sb}
                            onChange={(v) =>
                              merge({
                                sb: intOrNull(v),
                              })
                            }
                            placeholder="5"
                            inputStyle={inputStyle}
                            labelStyle={labelStyle}
                            labelText={labelText}
                          />
                          <IntField
                            label="Caught Stealing (CS)"
                            value={c.cs}
                            onChange={(v) =>
                              merge({
                                cs: intOrNull(v),
                              })
                            }
                            placeholder="10"
                            inputStyle={inputStyle}
                            labelStyle={labelStyle}
                            labelText={labelText}
                          />
                        </>
                      );
                    })()}
                  </div>

                  {!statsPublic && (
                    <div
                      style={{
                        color: "#64748b",
                        fontSize: 12,
                        marginTop: 6,
                      }}
                    >
                      These stats are private on the public
                      profile for your current plan.
                    </div>
                  )}
                </section>
              )}

              {/* Pitching */}
              {showPitcherMetrics && (
                <section>
                  <div
                    style={{
                      ...labelText,
                      marginBottom: 6,
                    }}
                  >
                    Pitching
                  </div>

                  {/* Pitch Types multi-add */}
                  <div style={{ marginBottom: 8 }}>
                    {(() => {
                      const selected = s.pitchTypes ?? [];
                      const addType = (val: string) => {
                        if (!val) return;
                        if (!selected.includes(val)) {
                          updateStatsSeason(s.id, {
                            pitchTypes: [
                              ...selected,
                              val,
                            ],
                          });
                        }
                      };
                      const removeType = (val: string) => {
                        updateStatsSeason(s.id, {
                          pitchTypes: selected.filter(
                            (t) => t !== val
                          ),
                        });
                      };

                      return (
                        <>
                          <label
                            style={{
                              ...labelStyle,
                              maxWidth: 420,
                            }}
                          >
                            <span
                              style={{
                                ...labelText,
                                fontSize: 12,
                              }}
                            >
                              Pitch Types
                            </span>
                            <select
                              value=""
                              onChange={(e) =>
                                addType(
                                  e.target.value
                                )
                              }
                              style={inputStyle}
                            >
                              <option value="">
                                Select a pitch type…
                              </option>
                              {pitchTypes.map((pt) => (
                                <option
                                  key={pt}
                                  value={pt}
                                  disabled={selected.includes(
                                    pt
                                  )}
                                >
                                  {pt}
                                </option>
                              ))}
                            </select>
                          </label>

                          {selected.length > 0 && (
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 8,
                                marginTop: 8,
                              }}
                            >
                              {selected.map((pt) => (
                                <span
                                  key={pt}
                                  style={{
                                    display:
                                      "inline-flex",
                                    alignItems:
                                      "center",
                                    gap: 8,
                                    padding:
                                      "6px 8px",
                                    border:
                                      "1px solid #e5e7eb",
                                    borderRadius: 999,
                                    background:
                                      "#fff",
                                    color:
                                      "#0f172a",
                                    fontSize: 12,
                                  }}
                                >
                                  {pt}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeType(
                                        pt
                                      )
                                    }
                                    title="Remove"
                                    style={{
                                      border:
                                        "none",
                                      background:
                                        "transparent",
                                      cursor:
                                        "pointer",
                                      color:
                                        "#64748b",
                                      fontWeight: 800,
                                      lineHeight: 1,
                                    }}
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  {/* Pitching inputs */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(4, minmax(140px, 1fr))",
                      gap: 12,
                      alignItems: "end",
                    }}
                  >
                    {(() => {
                      const p =
                        s.pitching ?? EMPTY_PITCHING;
                      const merge = (
                        patch: Partial<PitchingStats>
                      ) =>
                        updateStatsSeason(s.id, {
                          pitching: {
                            ...(s.pitching ??
                              EMPTY_PITCHING),
                            ...patch,
                          },
                        });

                      return (
                        <>
                          {/* row 1 */}
                          <Dec3Field
                            label="Earned Run Average (ERA)"
                            value={p.era}
                            onChange={(v) =>
                              merge({
                                era: decOrNull(v),
                              })
                            }
                            placeholder="1.500"
                            inputStyle={inputStyle}
                            labelStyle={labelStyle}
                            labelText={labelText}
                          />
                          <Dec1Field
                            label="Innings Pitched (IP)"
                            value={p.ip}
                            onChange={(v) =>
                              merge({
                                ip: decOrNull(v),
                              })
                            }
                            placeholder="25.1"
                            inputStyle={inputStyle}
                            labelStyle={labelStyle}
                            labelText={labelText}
                          />
                          <IntField
                            label="Games Played (GP)"
                            value={p.gp}
                            onChange={(v) =>
                              merge({
                                gp: intOrNull(v),
                              })
                            }
                            placeholder="5"
                            inputStyle={inputStyle}
                            labelStyle={labelStyle}
                            labelText={labelText}
                          />
                          <IntField
                            label="Games Started (GS)"
                            value={p.gs}
                            onChange={(v) =>
                              merge({
                                gs: intOrNull(v),
                              })
                            }
                            placeholder="3"
                            inputStyle={inputStyle}
                            labelStyle={labelStyle}
                            labelText={labelText}
                          />

                          {/* row 2 */}
                          <IntField
                            label="Batters Faced (BF)"
                            value={p.bf}
                            onChange={(v) =>
                              merge({
                                bf: intOrNull(v),
                              })
                            }
                            placeholder="25"
                            inputStyle={inputStyle}
                            labelStyle={labelStyle}
                            labelText={labelText}
                          />
                          <IntField
                            label="Number of Pitches (#P)"
                            value={p.pitches}
                            onChange={(v) =>
                              merge({
                                pitches:
                                  intOrNull(v),
                              })
                            }
                            placeholder="100"
                            inputStyle={inputStyle}
                            labelStyle={labelStyle}
                            labelText={labelText}
                          />
                          <IntField
                            label="Wins (W)"
                            value={p.w}
                            onChange={(v) =>
                              merge({
                                w: intOrNull(v),
                              })
                            }
                            placeholder="3"
                            inputStyle={inputStyle}
                            labelStyle={labelStyle}
                            labelText={labelText}
                          />
                          <IntField
                            label="Losses (L)"
                            value={p.l}
                            onChange={(v) =>
                              merge({
                                l: intOrNull(v),
                              })
                            }
                            placeholder="1"
                            inputStyle={inputStyle}
                            labelStyle={labelStyle}
                            labelText={labelText}
                          />

                          {/* row 3 */}
                          <IntField
                            label="Saves (SV)"
                            value={p.sv}
                            onChange={(v) =>
                              merge({
                                sv: intOrNull(v),
                              })
                            }
                            placeholder="1"
                            inputStyle={inputStyle}
                            labelStyle={labelStyle}
                            labelText={labelText}
                          />
                          <IntField
                            label="Hits Allowed (H)"
                            value={p.h}
                            onChange={(v) =>
                              merge({
                                h: intOrNull(v),
                              })
                            }
                            placeholder="15"
                            inputStyle={inputStyle}
                            labelStyle={labelStyle}
                            labelText={labelText}
                          />
                          <IntField
                            label="Runs Allowed (R)"
                            value={p.r}
                            onChange={(v) =>
                              merge({
                                r: intOrNull(v),
                              })
                            }
                            placeholder="8"
                            inputStyle={inputStyle}
                            labelStyle={labelStyle}
                            labelText={labelText}
                          />
                          <IntField
                            label="Earned Runs (ER)"
                            value={p.er}
                            onChange={(v) =>
                              merge({
                                er: intOrNull(v),
                              })
                            }
                            placeholder="1"
                            inputStyle={inputStyle}
                            labelStyle={labelStyle}
                            labelText={labelText}
                          />

                          {/* row 4 */}
                          <IntField
                            label="Walks Allowed (BB)"
                            value={p.bb}
                            onChange={(v) =>
                              merge({
                                bb: intOrNull(v),
                              })
                            }
                            placeholder="5"
                            inputStyle={inputStyle}
                            labelStyle={labelStyle}
                            labelText={labelText}
                          />
                          <IntField
                            label="Strike Outs (SO)"
                            value={p.so}
                            onChange={(v) =>
                              merge({
                                so: intOrNull(v),
                              })
                            }
                            placeholder="10"
                            inputStyle={inputStyle}
                            labelStyle={labelStyle}
                            labelText={labelText}
                          />
                          <IntField
                            label="Hit By Pitch (HBP)"
                            value={p.hbp}
                            onChange={(v) =>
                              merge({
                                hbp: intOrNull(v),
                              })
                            }
                            placeholder="3"
                            inputStyle={inputStyle}
                            labelStyle={labelStyle}
                            labelText={labelText}
                          />
                          <IntField
                            label="Wild Pitches (WP)"
                            value={p.wp}
                            onChange={(v) =>
                              merge({
                                wp: intOrNull(v),
                              })
                            }
                            placeholder="6"
                            inputStyle={inputStyle}
                            labelStyle={labelStyle}
                            labelText={labelText}
                          />

                          {/* row 5 */}
                          <Dec1Field
                            label="Pitches per Innings Pitched (P/IP)"
                            value={p.pPerIp}
                            onChange={(v) =>
                              merge({
                                pPerIp: decOrNull(v),
                              })
                            }
                            placeholder="13.5"
                            inputStyle={inputStyle}
                            labelStyle={labelStyle}
                            labelText={labelText}
                          />
                          <Dec3Field
                            label="Pitches per Batters Faced (P/BF)"
                            value={p.pPerBf}
                            onChange={(v) =>
                              merge({
                                pPerBf: decOrNull(v),
                              })
                            }
                            placeholder="3.255"
                            inputStyle={inputStyle}
                            labelStyle={labelStyle}
                            labelText={labelText}
                          />
                          <Dec2Field
                            label="Strike Percentage (S%)"
                            value={p.sPct}
                            onChange={(v) =>
                              merge({
                                sPct: decOrNull(v),
                              })
                            }
                            placeholder="59.04"
                            inputStyle={inputStyle}
                            labelStyle={labelStyle}
                            labelText={labelText}
                          />
                          <Dec2Field
                            label="First Pitch Strike Percentage (FPS%)"
                            value={p.fpsPct}
                            onChange={(v) =>
                              merge({
                                fpsPct: decOrNull(v),
                              })
                            }
                            placeholder="62.75"
                            inputStyle={inputStyle}
                            labelStyle={labelStyle}
                            labelText={labelText}
                          />

                          {/* row 6 */}
                          <Dec2Field
                            label="Weak Contact Percentage (WEAK%)"
                            value={p.weakPct}
                            onChange={(v) =>
                              merge({
                                weakPct:
                                  decOrNull(v),
                              })
                            }
                            placeholder="78.95"
                            inputStyle={inputStyle}
                            labelStyle={labelStyle}
                            labelText={labelText}
                          />
                          <Dec3Field
                            label="Batting Average on Balls in Play (BABIP)"
                            value={p.babip}
                            onChange={(v) =>
                              merge({
                                babip:
                                  decOrNull(v),
                              })
                            }
                            placeholder="0.265"
                            inputStyle={inputStyle}
                            labelStyle={labelStyle}
                            labelText={labelText}
                          />
                          <Dec3Field
                            label="Batting Average with Runners in Scoring Position (BA/RISP)"
                            value={p.baRisp}
                            onChange={(v) =>
                              merge({
                                baRisp:
                                  decOrNull(v),
                              })
                            }
                            placeholder="0.125"
                            inputStyle={inputStyle}
                            labelStyle={labelStyle}
                            labelText={labelText}
                          />
                          <div />
                        </>
                      );
                    })()}
                  </div>

                  {!statsPublic && (
                    <div
                      style={{
                        color: "#64748b",
                        fontSize: 12,
                        marginTop: 6,
                      }}
                    >
                      These stats are private on the
                      public profile for your current
                      plan.
                    </div>
                  )}
                </section>
              )}
            </div>
          </section>
        );
      })}
    </>
  );
});

export default TabStats;
