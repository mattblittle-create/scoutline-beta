// app/dashboard/player/recruiting-board/print/page.tsx

"use client";

import React from "react";

type SavedProgram = {
  id?: string;
  collegeId?: string;
  status?: string;
  priority?: string | null;
  strategyCategory?: string | null;
  strategyExplanation?: string | null;
  opportunityScore?: number | null;
  opportunityArchetype?: string | null;
  matchScore?: number | null;
  narrativeHeadline?: string | null;
  narrativeSummary?: string | null;
  narrativeStrategy?: string | null;
  notes?: string | null;
  college?: {
    name?: string;
    city?: string | null;
    state?: string | null;
    division?: string | null;
    conference?: string | null;
    baseballProgram?: {
      division?: string | null;
      conference?: string | null;
    } | null;
  } | null;
};

function pretty(value?: string | null) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
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

function getLocation(program: SavedProgram) {
  return [program.college?.city, program.college?.state]
    .filter(Boolean)
    .join(", ");
}

function getGroup(program: SavedProgram) {
  return (
    program.strategyCategory ||
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
    const key = getGroup(program);
    if (!map.has(key)) map.set(key, []);
    map.get(key)?.push(program);
  }

  return Array.from(map.entries()).sort(([a], [b]) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

export default function RecruitingBoardPrintPage() {
  const [programs, setPrograms] = React.useState<SavedProgram[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch("/api/player/target-programs", {
          cache: "no-store",
        });

        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || "Could not load recruiting board.");
        }

        setPrograms(Array.isArray(data.saved) ? data.saved : []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not load recruiting board."
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  const grouped = React.useMemo(() => groupPrograms(programs), [programs]);

  return (
    <main className="print-page">
      <style jsx global>{`
        body {
          background: #ffffff;
        }

        .print-page {
          max-width: 920px;
          margin: 0 auto;
          padding: 32px 24px 48px;
          color: #111827;
          font-family: Arial, Helvetica, sans-serif;
        }

        .no-print {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-bottom: 18px;
        }

        .button {
          border: 1px solid #cbd5e1;
          background: #f8fafc;
          border-radius: 999px;
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          color: #0f172a;
          text-decoration: none;
        }

        .header {
          border-bottom: 3px solid #caa042;
          padding-bottom: 16px;
          margin-bottom: 22px;
        }

        .eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #92400e;
          font-weight: 900;
          font-size: 11px;
          margin-bottom: 8px;
        }

        h1 {
          margin: 0;
          font-size: 30px;
          line-height: 1.1;
          color: #0f172a;
        }

        .subtitle {
          margin-top: 8px;
          color: #475569;
          font-size: 14px;
          line-height: 1.45;
        }

        .summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin: 18px 0 24px;
        }

        .summary-card {
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 12px;
          background: #f8fafc;
        }

        .summary-number {
          font-size: 22px;
          font-weight: 900;
          color: #0f172a;
        }

        .summary-label {
          font-size: 12px;
          color: #64748b;
          margin-top: 2px;
        }

        .group {
          margin-top: 24px;
          page-break-inside: avoid;
        }

        .group-title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 7px;
          margin-bottom: 10px;
        }

        h2 {
          margin: 0;
          font-size: 18px;
          color: #111827;
        }

        .count {
          color: #64748b;
          font-size: 12px;
          font-weight: 800;
        }

        .program {
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 14px;
          margin-bottom: 10px;
          page-break-inside: avoid;
        }

        .program-top {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: flex-start;
        }

        h3 {
          margin: 0;
          font-size: 16px;
          color: #0f172a;
        }

        .meta {
          color: #64748b;
          font-size: 12px;
          margin-top: 4px;
          line-height: 1.35;
        }

        .scores {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          justify-content: flex-end;
        }

        .pill {
          border-radius: 999px;
          padding: 5px 8px;
          font-size: 11px;
          font-weight: 900;
          white-space: nowrap;
        }

        .strategy {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          color: #166534;
        }

        .opportunity {
          background: #fffbeb;
          border: 1px solid #fde68a;
          color: #92400e;
        }

        .match {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #1d4ed8;
        }

        .section-text {
          margin-top: 8px;
          font-size: 12.5px;
          line-height: 1.45;
          color: #374151;
        }

        .label {
          font-weight: 900;
          color: #111827;
        }

        .empty {
          border: 1px dashed #cbd5e1;
          border-radius: 14px;
          padding: 18px;
          background: #f8fafc;
          color: #475569;
        }

        .footer {
          margin-top: 28px;
          padding-top: 12px;
          border-top: 1px solid #e5e7eb;
          color: #64748b;
          font-size: 11px;
          text-align: center;
        }

        @media print {
          .no-print {
            display: none !important;
          }

          .print-page {
            max-width: none;
            padding: 0;
          }

          .program {
            break-inside: avoid;
          }

          .group {
            break-inside: avoid;
          }
        }
      `}</style>

      <div className="no-print">
        <a className="button" href="/dashboard/player/recruiting-board">
          Back to Board
        </a>
        <button className="button" type="button" onClick={() => window.print()}>
          Print / Save PDF
        </button>
      </div>

      <header className="header">
        <div className="eyebrow">ScoutLine Recruiting Board</div>
        <h1>Recruiting Board Export</h1>
        <div className="subtitle">
          A printable recruiting board organized by strategy category, fit,
          opportunity, and ScoutLine guidance.
        </div>
      </header>

      {loading ? (
        <div className="empty">Loading recruiting board...</div>
      ) : error ? (
        <div className="empty">{error}</div>
      ) : programs.length === 0 ? (
        <div className="empty">
          No saved programs yet. Add target schools before exporting.
        </div>
      ) : (
        <>
          <section className="summary">
            <div className="summary-card">
              <div className="summary-number">{programs.length}</div>
              <div className="summary-label">Saved Programs</div>
            </div>

            <div className="summary-card">
              <div className="summary-number">{grouped.length}</div>
              <div className="summary-label">Strategy Groups</div>
            </div>

            <div className="summary-card">
              <div className="summary-number">
                {
                  programs.filter(
                    (p) =>
                      p.strategyCategory === "Priority Target" ||
                      p.strategyCategory === "Active Outreach"
                  ).length
                }
              </div>
              <div className="summary-label">Priority / Outreach</div>
            </div>
          </section>

          {grouped.map(([groupName, items]) => (
            <section className="group" key={groupName}>
              <div className="group-title">
                <h2>{pretty(groupName)}</h2>
                <div className="count">
                  {items.length} program{items.length === 1 ? "" : "s"}
                </div>
              </div>

              {items.map((program) => (
                <article
                  className="program"
                  key={program.id || program.collegeId}
                >
                  <div className="program-top">
                    <div>
                      <h3>{program.college?.name || "Unnamed Program"}</h3>
                      <div className="meta">
                        {getLocation(program) || "Location TBD"} •{" "}
                        {pretty(getDivision(program))} •{" "}
                        {pretty(getConference(program))}
                      </div>
                    </div>

                    <div className="scores">
                      {program.strategyCategory ? (
                        <span className="pill strategy">
                          {program.strategyCategory}
                        </span>
                      ) : null}

                      {typeof program.opportunityScore === "number" ? (
                        <span className="pill opportunity">
                          Opportunity {program.opportunityScore}/100
                        </span>
                      ) : null}

                      {typeof program.matchScore === "number" ? (
                        <span className="pill match">
                          Match {program.matchScore}/100
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {program.opportunityArchetype ? (
                    <div className="section-text">
                      <span className="label">Opportunity Type:</span>{" "}
                      {program.opportunityArchetype}
                    </div>
                  ) : null}

                  {program.strategyExplanation ? (
                    <div className="section-text">
                      <span className="label">Strategy:</span>{" "}
                      {program.strategyExplanation}
                    </div>
                  ) : null}

                  {program.narrativeHeadline ? (
                    <div className="section-text">
                      <span className="label">
                        {program.narrativeHeadline}
                      </span>
                    </div>
                  ) : null}

                  {program.narrativeSummary ? (
                    <div className="section-text">
                      {program.narrativeSummary}
                    </div>
                  ) : null}

                  {program.narrativeStrategy ? (
                    <div className="section-text">
                      <span className="label">Suggested Next Step:</span>{" "}
                      {program.narrativeStrategy}
                    </div>
                  ) : null}

                  {program.notes ? (
                    <div className="section-text">
                      <span className="label">Notes:</span> {program.notes}
                    </div>
                  ) : null}
                </article>
              ))}
            </section>
          ))}

          <footer className="footer">
            Generated from ScoutLine. Recruiting recommendations are based on
            available player, program, roster, and fit data.
          </footer>
        </>
      )}
    </main>
  );
}