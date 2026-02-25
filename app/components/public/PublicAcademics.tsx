// app/components/public/PublicAcademics.tsx
"use client";

import * as React from "react";

export type DocLink = { label?: string | null; url: string };

export type AcademicsData = {
  bio?: string | null;

  gradYear?: number | string | null;
  gpa?: number | string | null;
  gpaOutOf?: number | string | null;
  sat?: number | string | null;
  act?: number | string | null;

  highSchool?: string | null;
  city?: string | null;
  state?: string | null;

  /** majors can arrive as array or CSV; we’ll normalize both */
  areasOfStudy?: string[] | null;
  areasOfStudyInput?: string | null;

  /** single-uploader: arrays but UI shows the first item if present */
  transcriptUrls?: string[] | null;
  reportCardUrls?: string[] | null;

  /** multi-file additional docs (no longer rendered, but kept for backward compat) */
  otherAcademicDocs?: DocLink[] | null;

  // Back-compat fallbacks used in earlier versions:
  transcripts?: string[] | null;
  reportCards?: string[] | null;
  otherDocs?: DocLink[] | null;

  /** Some projects embed files/majors under a nested object */
  selectedDocs?: {
    transcriptUrl?:
      | string
      | { url?: string; label?: string }
      | Array<string | { url?: string; label?: string }>;
    reportCardUrl?:
      | string
      | { url?: string; label?: string }
      | Array<string | { url?: string; label?: string }>;
    otherAcademicDocs?: Array<string | { url?: string; label?: string }>;
    additionalDocs?: Array<string | { url?: string; label?: string }>;
  };
  intendedMajors?: string[] | string | null;
  academicMajors?: string[] | string | null;
  majors?: string[] | string | null;
  areasOfStudyPills?: string[] | null;
  majorsCsv?: string | null;
};

type Props = {
  academics: AcademicsData;
  title?: string;

  // styling tokens so this section matches the rest of the public page
  cardStyle?: React.CSSProperties;
  h2Style?: React.CSSProperties;
  pillStyle?: React.CSSProperties;
};

export default function PublicAcademics({
  academics,
  title = "Academics",
  cardStyle,
  h2Style,
  pillStyle,
}: Props) {
  const {
    bio = null,
    gradYear = null,
    gpa = null,
    gpaOutOf = null,
    sat = null,
    act = null,
    highSchool = null,
    city = null,
    state = null,

    // majors (either array or CSV)
    areasOfStudy,
    areasOfStudyInput,

    // single file lists (first one wins)
    transcriptUrls,
    reportCardUrls,

    // legacy fallbacks:
    transcripts,
    reportCards,

    // extended/fallback shapes
    selectedDocs,
    intendedMajors,
    academicMajors,
    majors,
    areasOfStudyPills,
    majorsCsv,
  } = academics || {};

  // ---------- styles ----------
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
    fontSize: 13,
    fontWeight: 700,
    color: "#475569",
    background: "#f1f5f9",
    border: "1px solid #e2e8f0",
    borderRadius: 999,
    padding: "5px 10px",
    whiteSpace: "nowrap",
    ...(pillStyle || {}),
  };
  const muted: React.CSSProperties = {
    color: "#94a3b8",
    fontStyle: "italic",
  };
  const link: React.CSSProperties = {
    color: "#0369a1",
    fontWeight: 700,
    textDecoration: "none",
  };

  // ---------- helpers ----------
  const valueOrDash = (v: any) =>
    v === null ||
    v === undefined ||
    (typeof v === "string" && v.trim() === "")
      ? "—"
      : String(v);

  // --- majors normalization ---
  const majorsArray: string[] = normalizeMajors({
    areasOfStudy,
    areasOfStudyInput,
    intendedMajors,
    academicMajors,
    majors,
    areasOfStudyPills,
    majorsCsv,
  });
  const majorsJoined = majorsArray.join(", ");

  // --- documents normalization ---
  // Single: pick the *first* URL from many possible containers (string/obj/array).
  const firstTranscript = firstUrlFrom(
    transcriptUrls,
    transcripts,
    (academics as any).transcriptUrl,
    selectedDocs?.transcriptUrl
  );

  const firstReportCard = firstUrlFrom(
    reportCardUrls,
    reportCards,
    (academics as any).reportCardUrl,
    selectedDocs?.reportCardUrl
  );

  return (
    <section style={safeCard}>
      <h2 style={safeH2}>{title}</h2>

      {/* School & location (row 1) */}
      {(highSchool || city || state) && (
        <div style={{ color: "#334155" }}>
          <strong>High School:</strong>{" "}
          {[
            highSchool || undefined,
            [city || undefined, state || undefined]
              .filter(Boolean)
              .join(", ") || undefined,
          ]
            .filter(Boolean)
            .join(" • ")}
        </div>
      )}

      {/* Pills row (row 2): Grad Year / GPA / SAT / ACT / Intended Major(s) */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          marginTop: 8,
        }}
      >
        <span style={pill}>Grad Year: {valueOrDash(gradYear)}</span>
        <span style={pill}>
          GPA: {valueOrDash(formatGpaLike(gpa))}
          {gpaOutOf ? ` / ${gpaOutOf}` : ""}
        </span>
        <span style={pill}>SAT: {valueOrDash(sat)}</span>
        <span style={pill}>ACT: {valueOrDash(act)}</span>
        <span style={pill}>
          Intended Major(s): {majorsJoined || "—"}
        </span>
      </div>

      {/* Academic Bio */}
      {bio ? (
        <div style={{ marginTop: 10 }}>
          <div
            style={{
              fontWeight: 800,
              color: "#334155",
              marginBottom: 4,
            }}
          >
            Academic Bio:
          </div>
          <div
            style={{ color: "#334155", whiteSpace: "pre-wrap" }}
          >
            {bio}
          </div>
        </div>
      ) : null}

      {/* Documents: Report Card / Transcripts only */}
      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        <div>
          <div
            style={{
              color: "#334155",
              fontWeight: 800,
              marginBottom: 4,
            }}
          >
            Report Card / Transcripts
          </div>
          {firstReportCard || firstTranscript ? (
            <div
              style={{
                display: "flex",
                gap: 100,
                flexWrap: "wrap",
              }}
            >
              {firstReportCard ? (
                <>
                  <a
                    href={resolveDocUrl(firstReportCard)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={link}
                  >
                    View Report Card / Transcripts
                  </a>
                  <a
                    href={resolveDocUrl(firstReportCard)}
                    download
                    style={link}
                  >
                    Download Report Card / Transcripts
                  </a>
                </>
              ) : null}
              {firstTranscript ? (
                <>
                  <a
                    href={resolveDocUrl(firstTranscript)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={link}
                  >
                    View Transcript
                  </a>
                  <a
                    href={resolveDocUrl(firstTranscript)}
                    download
                    style={link}
                  >
                    Download Transcript
                  </a>
                </>
              ) : null}
            </div>
          ) : (
            <div style={muted}>
              No Report Card / Transcripts available.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/** ---------- local helpers ---------- */
function formatGpaLike(v: any) {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  const fixed = n.toFixed(2).replace(/\.00$/, "");
  return fixed;
}

/** Return the FIRST valid URL from a wide variety of shapes:
 *  - string
 *  - { url, label? }
 *  - string[]
 *  - Array<{ url, label? }>
 *  - nested arrays in the same arg
 */
function firstUrlFrom(...candidates: any[]): string | null {
  for (const c of candidates) {
    if (!c) continue;

    // direct string
    if (typeof c === "string" && c.trim()) return c.trim();

    // direct object
    if (typeof c === "object" && !Array.isArray(c)) {
      const u = (c as any).url;
      if (typeof u === "string" && u.trim()) return u.trim();
    }

    // arrays
    if (Array.isArray(c)) {
      for (const it of c) {
        const url =
          typeof it === "string"
            ? it
            : it &&
              typeof it === "object" &&
              typeof (it as any).url === "string"
            ? (it as any).url
            : undefined;
        if (url && url.trim()) return url.trim();
      }
    }
  }
  return null;
}

/** Robust majors normalizer */
function normalizeMajors(src: {
  areasOfStudy?: any;
  areasOfStudyInput?: any;
  intendedMajors?: any;
  academicMajors?: any;
  majors?: any;
  areasOfStudyPills?: any;
  majorsCsv?: any;
}): string[] {
  // 1) If areasOfStudy is an array – accept strings or {label}
  if (Array.isArray(src.areasOfStudy)) {
    return src.areasOfStudy
      .map((x) => (typeof x === "string" ? x : x?.label))
      .filter(Boolean)
      .map(String)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // 2) CSV-style fields (areasOfStudyInput or majorsCsv)
  const tryCsv =
    (typeof src.areasOfStudyInput === "string" &&
      src.areasOfStudyInput) ||
    (typeof src.majorsCsv === "string" && src.majorsCsv) ||
    "";

  if (tryCsv) {
    return tryCsv
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // 3) Other arrays/strings we’ve seen in projects
  const preferArray =
    src.intendedMajors ||
    src.academicMajors ||
    src.majors ||
    src.areasOfStudyPills;

  if (Array.isArray(preferArray)) {
    return preferArray
      .map((x) => (typeof x === "string" ? x : x?.label))
      .filter(Boolean)
      .map(String)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (typeof preferArray === "string") {
    return preferArray
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return [];
}

/** Ensure links work whether absolute (https://…) or site-relative ("/uploads/…"),
 *  and also fix the common case where it was stored as "uploads/…"
 */
function resolveDocUrl(u?: string) {
  const s = (u || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s; // absolute OK
  if (s.startsWith("/")) return s; // already site-relative
  if (s.toLowerCase().startsWith("uploads/")) return `/${s}`; // add missing leading slash
  return s;
}
