// app/dashboard/player/recruiting-board/page.tsx

"use client";

import Link from "next/link";
import React from "react";

type SavedProgram = {
  id?: string;
  collegeId?: string;
  listName?: string;
  status?: string;
  priority?: string | null;
  notes?: string | null;
  boardGroup?: string | null;
  strategyCategory?: string | null;
  strategyExplanation?: string | null;
  opportunityScore?: number | null;
  opportunityLabel?: string | null;
  opportunityArchetype?: string | null;
  matchScore?: number | null;
  matchLabel?: string | null;
  narrativeHeadline?: string | null;
  narrativeSummary?: string | null;
  narrativeStrategy?: string | null;
  college?: {
    id?: string;
    name?: string;
    city?: string | null;
    state?: string | null;
    division?: string | null;
    conference?: string | null;
    slug?: string | null;
    baseballProgram?: {
      division?: string | null;
      conference?: string | null;
    } | null;
  } | null;
};

const shellStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  background: "#ffffff",
  padding: 24,
  boxShadow: "0 10px 30px rgba(15,23,42,0.06)",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 28,
  lineHeight: 1.15,
  color: "#0f172a",
};

const subtitleStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#64748b",
  fontSize: 14,
  lineHeight: 1.5,
  maxWidth: 760,
};

const topRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start",
  flexWrap: "wrap",
  marginBottom: 22,
};

const buttonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const linkButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  padding: "10px 14px",
  border: "1px solid #cbd5e1",
  background: "#f8fafc",
  color: "#0f172a",
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 800,
};

const groupStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
  marginTop: 18,
};

const groupHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  borderBottom: "1px solid #e5e7eb",
  paddingBottom: 8,
};

const groupTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 18,
  color: "#111827",
};

const countPillStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: "4px 9px",
  background: "#f1f5f9",
  color: "#475569",
  fontSize: 12,
  fontWeight: 800,
};

const cardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 16,
  background: "#ffffff",
  display: "grid",
  gap: 10,
};

const cardTopStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 14,
  flexWrap: "wrap",
};

const schoolNameStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 17,
  color: "#0f172a",
};

const metaStyle: React.CSSProperties = {
  color: "#64748b",
  fontSize: 13,
  lineHeight: 1.4,
};

const pillRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
  alignItems: "center",
};

const scorePillStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 800,
  border: "1px solid #fde68a",
  background: "#fffbeb",
  color: "#92400e",
};

const matchPillStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 800,
  border: "1px solid #bfdbfe",
  background: "#eff6ff",
  color: "#1d4ed8",
};

const strategyPillStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 800,
  border: "1px solid #bbf7d0",
  background: "#f0fdf4",
  color: "#166534",
};

const narrativeStyle: React.CSSProperties = {
  borderTop: "1px dashed #e5e7eb",
  paddingTop: 10,
  color: "#374151",
  fontSize: 13,
  lineHeight: 1.5,
};

const emptyStyle: React.CSSProperties = {
  border: "1px dashed #cbd5e1",
  borderRadius: 16,
  padding: 20,
  background: "#f8fafc",
  color: "#475569",
  fontSize: 14,
};

function pretty(value?: string | null) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getSchoolLocation(program: SavedProgram) {
  const city = program.college?.city || "";
  const state = program.college?.state || "";
  return [city, state].filter(Boolean).join(", ");
}

function getDivision(program: SavedProgram) {
  return (
    program.college?.baseballProgram?.division ||
    program.college?.division ||
    "Division TBD"
  );
}

function getConference(program: SavedProgram) {
  return (
    program.college?.baseballProgram?.conference ||
    program.college?.conference ||
    "Conference TBD"
  );
}

function getStrategyGroup(program: SavedProgram) {
  return (
    program.strategyCategory ||
    program.boardGroup ||
    program.priority ||
    program.status ||
    "Watch List"
  );
}

function groupPrograms(programs: SavedProgram[]) {
  const order = [
    "Priority Target",
    "Active Outreach",
    "Summer Follow",
    "Long-Term Development Fit",
    "Reach Opportunity",
    "Watch List",
    "SAVED",
  ];

  const map = new Map<string, SavedProgram[]>();

  for (const program of programs) {
    const key = getStrategyGroup(program);
    if (!map.has(key)) map.set(key, []);
    map.get(key)?.push(program);
  }

  return Array.from(map.entries()).sort(([a], [b]) => {
    const aIndex = order.indexOf(a);
    const bIndex = order.indexOf(b);

    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;

    return aIndex - bIndex;
  });
}

export default function RecruitingBoardPage() {
  const [programs, setPrograms] = React.useState<SavedProgram[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    async function loadPrograms() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch("/api/player/target-programs", {
          cache: "no-store",
        });

        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || "Failed to load recruiting board.");
        }

        const saved = Array.isArray(data.saved)
          ? data.saved
          : Array.isArray(data.programs)
          ? data.programs
          : [];

        setPrograms(saved);
      } catch (err) {
        console.error("RECRUITING_BOARD_LOAD_ERROR", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load recruiting board."
        );
      } finally {
        setLoading(false);
      }
    }

    loadPrograms();
  }, []);

  const groupedPrograms = React.useMemo(
    () => groupPrograms(programs),
    [programs]
  );

  return (
    <main style={{ maxWidth: 1040, margin: "0 auto", padding: "8px 0 40px" }}>
      <section style={shellStyle}>
        <div style={topRowStyle}>
          <div>
            <h1 style={titleStyle}>Recruiting Board</h1>
            <p style={subtitleStyle}>
              Your saved target programs grouped by recruiting strategy,
              opportunity signals, match context, and ScoutLine guidance.
            </p>
          </div>

          <div style={buttonRowStyle}>
            <Link
              href="/dashboard/player/suggested-programs"
              style={linkButtonStyle}
            >
              Suggested Programs
            </Link>

            <Link
  href="/dashboard/player/recruiting-board/print"
  style={linkButtonStyle}
>
  Export / Print
</Link>

            <Link href="/dashboard/player/target-programs" style={linkButtonStyle}>
              Target Programs
            </Link>

            <Link href="/dashboard/player" style={linkButtonStyle}>
              Dashboard
            </Link>
          </div>
        </div>

        {loading ? (
          <div style={emptyStyle}>Loading recruiting board...</div>
        ) : error ? (
          <div style={emptyStyle}>{error}</div>
        ) : programs.length === 0 ? (
          <div style={emptyStyle}>
            No saved programs yet. Add schools from Suggested Programs or
            College Search to begin building your recruiting board.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 24 }}>
            {groupedPrograms.map(([groupName, items]) => (
              <section key={groupName} style={groupStyle}>
                <div style={groupHeaderStyle}>
                  <h2 style={groupTitleStyle}>{pretty(groupName)}</h2>
                  <div style={countPillStyle}>
                    {items.length} program{items.length === 1 ? "" : "s"}
                  </div>
                </div>

                <div style={{ display: "grid", gap: 12 }}>
                  {items.map((program) => (
                    <article
                      key={program.id || program.collegeId}
                      style={cardStyle}
                    >
                      <div style={cardTopStyle}>
                        <div>
                          <h3 style={schoolNameStyle}>
                            {program.college?.name || "Unnamed Program"}
                          </h3>

                          <div style={metaStyle}>
                            {getSchoolLocation(program) || "Location TBD"} •{" "}
                            {pretty(getDivision(program))} •{" "}
                            {pretty(getConference(program))}
                          </div>
                        </div>

                        <div style={pillRowStyle}>
                          {program.strategyCategory ? (
                            <div style={strategyPillStyle}>
                              {program.strategyCategory}
                            </div>
                          ) : null}

                          {typeof program.opportunityScore === "number" ? (
                            <div style={scorePillStyle}>
                              Opportunity {program.opportunityScore}/100
                            </div>
                          ) : null}

                          {typeof program.matchScore === "number" ? (
                            <div style={matchPillStyle}>
                              Match {program.matchScore}/100
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {program.opportunityArchetype ? (
                        <div style={metaStyle}>
                          <strong>Opportunity Type:</strong>{" "}
                          {program.opportunityArchetype}
                        </div>
                      ) : null}

                      {program.strategyExplanation ? (
                        <div style={metaStyle}>
                          <strong>Strategy:</strong>{" "}
                          {program.strategyExplanation}
                        </div>
                      ) : null}

                      {program.narrativeSummary ||
                      program.narrativeStrategy ||
                      program.notes ? (
                        <div style={narrativeStyle}>
                          {program.narrativeHeadline ? (
                            <strong>{program.narrativeHeadline}</strong>
                          ) : null}

                          {program.narrativeSummary ? (
                            <div>{program.narrativeSummary}</div>
                          ) : null}

                          {program.narrativeStrategy ? (
                            <div>
                              <strong>Suggested Next Step:</strong>{" "}
                              {program.narrativeStrategy}
                            </div>
                          ) : null}

                          {program.notes ? (
                            <div>
                              <strong>Notes:</strong> {program.notes}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}