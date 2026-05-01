// app/dashboard/player/target-programs/page.tsx

"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";

const TARGET_STATUS_OPTIONS = [
  ["SAVED", "Saved"],
  ["INTERESTED", "Interested"],
  ["CONTACTED", "Contacted"],
  ["VISITED", "Visited"],
  ["OFFERED", "Offered"],
  ["COMMITTED", "Committed"],
  ["SIGNED", "Signed"],
  ["APPLIED", "Applied"],
  ["ACCEPTED", "Accepted"],
  ["NOT_PURSUING", "Not Pursuing"],
] as const;

const TARGET_PRIORITY_OPTIONS = [
  ["", "No Priority"],
  ["HIGH", "High Priority"],
  ["MEDIUM", "Medium Priority"],
  ["LOW", "Low Priority"],
] as const;

type SavedProgram = {
  id: string;
  collegeId: string;
  listName: string;
  status: string;
  priority?: string | null;
  notes?: string | null;
  truthFit?: {
    score: number;
    label: string;
    reasons?: string[];
    gaps?: string[];
    development?: string[];
    benchmarkSource?: {
      metrics?: {
        level: string;
        label: string;
      };
    };
  } | null;
  college: {
    id: string;
    name: string;
    slug: string;
    city?: string | null;
    state?: string | null;
    websiteUrl?: string | null;
    admissionsUrl?: string | null;
    region?: string | null;
    control?: string | null;
    schoolType?: string | null;
    tuitionInState?: number | null;
    tuitionOutOfState?: number | null;
baseballProgram?: {
  nickname?: string | null;
  division?: string | null;
  conference?: string | null;
  baseballWebsiteUrl?: string | null;
  rosterUrl?: string | null;
  questionnaireUrl?: string | null;
  campsUrl?: string | null;
  coaches?: Array<{
    id: string;
    name: string;
    title?: string | null;
    email?: string | null;
    phone?: string | null;
    bioUrl?: string | null;
    contactUrl?: string | null;
    isHeadCoach?: boolean;
  }>;
} | null;
  };
};

function pretty(value?: string | null) {
  if (!value) return "—";
  const raw = String(value).replace(/_/g, " ").toUpperCase();

  return raw
    .split(" ")
    .map((word) => {
      if (["NCAA", "NAIA", "NJCAA", "SEC", "ACC"].includes(word)) return word;
      if (/^D[123]$/.test(word)) return word;
      if (/^[A-Z]{2}$/.test(word)) return word;
      return word.charAt(0) + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function money(value?: number | null) {
  if (value == null) return "—";
  return `$${value.toLocaleString()}`;
}

function getNextAction(status?: string) {
  switch (status) {
    case "INTERESTED":
      return "Reach out to the coaching staff or complete the recruiting questionnaire.";
    case "CONTACTED":
      return "Follow up within 7–10 days and log any coach response in your notes.";
    case "VISITED":
      return "Send a thank-you message and update your notes with visit takeaways.";
    case "OFFERED":
      return "Review fit, costs, roster opportunity, and communicate your timeline clearly.";
    case "COMMITTED":
      return "Keep communication strong and confirm next steps with the coaching staff.";
    case "SIGNED":
      return "Stay ready academically and physically while preparing for your college transition.";
    case "APPLIED":
      return "Track admissions progress and keep the coaching staff updated.";
    case "ACCEPTED":
      return "Confirm enrollment details and continue communicating with the program.";
    case "NOT_PURSUING":
      return "No active action needed unless this school becomes relevant again.";
    case "SAVED":
    default:
      return "Start outreach, complete the questionnaire, or add this school to your follow-up plan.";
  }
}

function getOutreachLabel(status?: string) {
  switch (status) {
    case "SAVED":
      return "Start Outreach";
    case "INTERESTED":
      return "Contact Coach";
    case "CONTACTED":
      return "Follow Up";
    case "VISITED":
      return "Send Follow-Up";
    case "OFFERED":
      return "Continue Conversation";
    default:
      return "Contact Coach";
  }
}

  function buildCoachEmailSubject(collegeName: string) {
  return `Recruiting Interest - ${collegeName}`;
}

function buildCoachEmailBody({
  collegeName,
  coachName,
  status,
}: {
  collegeName: string;
  coachName?: string | null;
  status?: string | null;
}) {
  const greeting = coachName ? `Coach ${coachName},` : "Coach,";

  const statusLine =
    status === "CONTACTED"
      ? "I wanted to follow up and continue the conversation about your program."
      : status === "VISITED"
      ? "I enjoyed learning more about your program and wanted to stay in touch."
      : status === "OFFERED"
      ? "Thank you for the opportunity. I wanted to continue discussing fit, timeline, and next steps."
      : "I wanted to introduce myself and express my interest in your baseball program.";

  return [
    greeting,
    "",
    statusLine,
    "",
    `I have added ${collegeName} to my ScoutLine Target Programs list and would like to learn more about your recruiting needs, roster opportunities, and next steps.`,
    "",
    "Thank you for your time,",
    "",
  ].join("\n");
}

function buildMailtoUrl({
  email,
  subject,
  body,
}: {
  email: string;
  subject: string;
  body: string;
}) {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

type BaseballCoach = {
  id: string;
  name: string;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  bioUrl?: string | null;
  contactUrl?: string | null;
  isHeadCoach?: boolean;
};

function getPrimaryCoach(coaches?: BaseballCoach[] | null) {
  if (!Array.isArray(coaches) || coaches.length === 0) return null;
  return coaches.find((coach) => coach.isHeadCoach) || coaches[0];
}

function getFitColor(label?: string | null) {
  if (label === "Strong Fit") return "#15803d";
  if (label === "Match") return "#0369a1";
  if (label === "Possible Match") return "#b45309";
  return "#b91c1c";
}

function getFitBackground(label?: string | null) {
  if (label === "Strong Fit") return "#f0fdf4";
  if (label === "Match") return "#e0f2fe";
  if (label === "Possible Match") return "#fffbeb";
  return "#fef2f2";
}

function getFitBorderColor(label?: string | null) {
  if (label === "Strong Fit") return "#bbf7d0";
  if (label === "Match") return "#bae6fd";
  if (label === "Possible Match") return "#fde68a";
  return "#fecaca";
}

export default function TargetProgramsPage() {
  const [saved, setSaved] = useState<SavedProgram[]>([]);

  function getPriorityRank(priority?: string | null) {
  switch (priority) {
    case "HIGH":
      return 1;
    case "MEDIUM":
      return 2;
    case "LOW":
      return 3;
    default:
      return 4;
  }
}

function getStatusRank(status?: string) {
  switch (status) {
    case "COMMITTED":
    case "SIGNED":
      return 1;
    case "OFFERED":
      return 2;
    case "VISITED":
      return 3;
    case "CONTACTED":
      return 4;
    case "INTERESTED":
      return 5;
    case "APPLIED":
    case "ACCEPTED":
      return 6;
    case "NOT_PURSUING":
      return 7;
    default:
      return 8; // SAVED
  }
}

  const [loading, setLoading] = useState(true);
  const [removingCollegeId, setRemovingCollegeId] = useState("");
  const [updatingCollegeId, setUpdatingCollegeId] = useState("");
  const [savingNotesCollegeId, setSavingNotesCollegeId] = useState("");
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  async function loadSavedPrograms() {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/player/target-programs", {
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Could not load Target Programs.");
      }

      setSaved(data.saved || []);
    } catch (err) {
      console.error("TARGET_PROGRAMS_PAGE_LOAD_ERROR", err);
      setError("Could not load Target Programs.");
      setSaved([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSavedPrograms();
  }, []);

  async function updateProgramStatus(collegeId: string, status: string) {
  try {
    setUpdatingCollegeId(collegeId);
    setError("");

    const res = await fetch("/api/player/target-programs", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ collegeId, status }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error || "Could not update status.");
    }

    setSaved((prev) =>
      prev.map((item) =>
        item.collegeId === collegeId ? { ...item, status } : item
      )
    );
  } catch (err) {
    console.error("TARGET_PROGRAMS_STATUS_UPDATE_ERROR", err);
    setError("Could not update that program status.");
  } finally {
    setUpdatingCollegeId("");
  }
}

async function updateProgramPriority(collegeId: string, priority: string) {
  try {
    setUpdatingCollegeId(collegeId);
    setError("");

    const res = await fetch("/api/player/target-programs", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ collegeId, priority }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error || "Could not update priority.");
    }

    setSaved((prev) =>
      prev.map((item) =>
        item.collegeId === collegeId ? { ...item, priority } : item
      )
    );
  } catch (err) {
    console.error("TARGET_PROGRAMS_PRIORITY_UPDATE_ERROR", err);
    setError("Could not update that program priority.");
  } finally {
    setUpdatingCollegeId("");
  }
}

async function updateProgramNotes(collegeId: string, notes: string) {
  try {
    setSavingNotesCollegeId(collegeId);
    setError("");

    const res = await fetch("/api/player/target-programs", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ collegeId, notes }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error || "Could not update notes.");
    }

    setSaved((prev) =>
      prev.map((item) =>
        item.collegeId === collegeId ? { ...item, notes } : item
      )
    );
  } catch (err) {
    console.error("TARGET_PROGRAMS_NOTES_UPDATE_ERROR", err);
    setError("Could not update notes.");
  } finally {
    setSavingNotesCollegeId("");
  }
}

  async function removeProgram(collegeId: string) {
    try {
      setRemovingCollegeId(collegeId);
      setError("");

      const res = await fetch("/api/player/target-programs", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ collegeId }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Could not remove program.");
      }

      setSaved((prev) => prev.filter((item) => item.collegeId !== collegeId));
    } catch (err) {
      console.error("TARGET_PROGRAMS_REMOVE_ERROR", err);
      setError("Could not remove that program.");
    } finally {
      setRemovingCollegeId("");
    }
  }

  const statusCounts: Record<string, number> = {
    ALL: saved.length,
  };

  for (const [value] of TARGET_STATUS_OPTIONS) {
    statusCounts[value] = saved.filter((item) => item.status === value).length;
  }

  const filteredSaved =
    statusFilter === "ALL"
      ? saved
      : saved.filter((item) => item.status === statusFilter);

  const sortedSaved = [...filteredSaved].sort((a, b) => {
    const p = getPriorityRank(a.priority) - getPriorityRank(b.priority);
    if (p !== 0) return p;

    return getStatusRank(a.status) - getStatusRank(b.status);
  });

  const groupedSaved = {
    HIGH: sortedSaved.filter((item) => item.priority === "HIGH"),
    MEDIUM: sortedSaved.filter((item) => item.priority === "MEDIUM"),
    LOW: sortedSaved.filter((item) => item.priority === "LOW"),
    NONE: sortedSaved.filter((item) => !item.priority),
  };

  const priorityJumpGroups = [
    ["NONE", "No Priority", groupedSaved.NONE.length],
    ["LOW", "Low Priority", groupedSaved.LOW.length],
    ["MEDIUM", "Medium Priority", groupedSaved.MEDIUM.length],
    ["HIGH", "High Priority", groupedSaved.HIGH.length],
  ] as const;

  return (
    <main style={{ color: "#0f172a", fontFamily: "Arial, sans-serif" }}>
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 16px 56px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 900 }}>
              Target Programs
            </h1>
            <p style={{ margin: "8px 0 0", color: "#475569", fontWeight: 700 }}>
              Your saved college baseball programs and recruiting targets.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <Link href="/dashboard/player/college-search" style={secondaryButtonStyle}>
              Search Colleges
            </Link>

<Link href="/dashboard/player" style={backToDashboardStyle}>
  Back to Dashboard
</Link>
          </div>
        </div>

        {error ? <div style={errorStyle}>{error}</div> : null}

        {saved.length > 0 ? (
  <div style={filterBarStyle}>
    {["ALL", ...TARGET_STATUS_OPTIONS.map(([value]) => value)].map((value) => (
      <button
        key={value}
        type="button"
        onClick={() => setStatusFilter(value)}
        style={{
          ...filterButtonStyle,
          background: statusFilter === value ? "#0f172a" : "#f8fafc",
          color: statusFilter === value ? "#ffffff" : "#0f172a",
        }}
      >
{value === "ALL"
  ? `All (${statusCounts.ALL})`
  : `${
      TARGET_STATUS_OPTIONS.find(([v]) => v === value)?.[1] || value
    } (${statusCounts[value] || 0})`}
      </button>
    ))}
  </div>
) : null}

{saved.length > 0 ? (
  <div style={priorityJumpBarStyle}>
    {priorityJumpGroups.map(([key, label, count]) => (
      <a
        key={key}
        href={`#priority-${key.toLowerCase()}`}
        style={priorityJumpButtonStyle}
      >
        {label} ({count})
      </a>
    ))}
  </div>
) : null}

        {loading ? (
          <div style={emptyStyle}>Loading Target Programs...</div>
        ) : saved.length === 0 ? (
          <div style={emptyStyle}>
            <h2 style={{ margin: "0 0 8px", fontSize: "1.25rem", fontWeight: 900 }}>
              No saved programs yet
            </h2>
            <p style={{ margin: 0, color: "#475569", fontWeight: 700 }}>
              Search colleges and click the star icon to save schools to your Target Programs list.
            </p>
            <Link href="/dashboard/player/college-search" style={{ ...primaryButtonStyle, marginTop: 14 }}>
              Start Searching
            </Link>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 18 }}>
            {(["HIGH", "MEDIUM", "LOW", "NONE"] as const).map((priorityGroup) => {
              const groupItems = groupedSaved[priorityGroup];

              if (groupItems.length === 0) return null;

              return (
                <section
  key={priorityGroup}
  id={`priority-${priorityGroup.toLowerCase()}`}
  style={priorityGroupSectionStyle}
>
                  <div style={priorityGroupHeaderStyle}>
                    {priorityGroup === "HIGH"
                      ? `High Priority (${groupItems.length})`
                      : priorityGroup === "MEDIUM"
                      ? `Medium Priority (${groupItems.length})`
                      : priorityGroup === "LOW"
                      ? `Low Priority (${groupItems.length})`
                      : `No Priority (${groupItems.length})`}
                  </div>

                  <div style={{ display: "grid", gap: 14 }}>
                    {groupItems.map((item) => {
const college = item.college;
const baseball = college.baseballProgram;
const primaryCoach = getPrimaryCoach(baseball?.coaches);

                      return (
                <article key={item.id} style={cardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                    <div>
<h2 style={schoolTitleStyle}>
  <Link
    href={`/college/${college.slug}`}
    style={{ color: "#0f172a", textDecorationColor: "#caa042" }}
  >
    {college.name}
  </Link>

  <span style={schoolMetaTitleStyle}>
    {[baseball?.nickname, pretty(baseball?.division), baseball?.conference]
      .filter(Boolean)
      .join(" • ")}
  </span>
</h2>

                      <div style={{ marginTop: 6, color: "#475569", fontWeight: 700 }}>
                        {[college.city, college.state].filter(Boolean).join(", ") || "Location TBD"}
                      </div>
                    </div>

                    <button
                      type="button"
                      title="Remove this school from your Target Programs list."
                      onClick={() => removeProgram(college.id)}
                      disabled={removingCollegeId === college.id}
                      style={{
                        ...starButtonStyle,
                        opacity: removingCollegeId === college.id ? 0.6 : 1,
                        cursor: removingCollegeId === college.id ? "not-allowed" : "pointer",
                      }}
                      aria-label="Remove from Target Programs"
                    >
                      ★
                    </button>
                  </div>

<div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
  {item.truthFit ? (
    <span
      style={{
        ...truthFitPillStyle,
        color: getFitColor(item.truthFit.label),
        background: getFitBackground(item.truthFit.label),
        borderColor: getFitBorderColor(item.truthFit.label),
      }}
      title={item.truthFit.benchmarkSource?.metrics?.label || "Truth Fit score"}
    >
      Truth Fit: {item.truthFit.label} • {item.truthFit.score}
    </span>
  ) : null}

  <span style={pillStyle}>{pretty(college.region)}</span>
  <span style={pillStyle}>{pretty(college.control)}</span>
  <span style={pillStyle}>{pretty(college.schoolType)}</span>
  <span style={pillStyle}>In-State: {money(college.tuitionInState)}</span>
  <span style={pillStyle}>Out-of-State: {money(college.tuitionOutOfState)}</span>
</div>

                  <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
                    <label style={statusFieldStyle}>
  <span style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>
    Status
  </span>

  <select
    value={item.status || "SAVED"}
    onChange={(e) => updateProgramStatus(college.id, e.target.value)}
    disabled={updatingCollegeId === college.id}
    style={statusSelectStyle}
  >
    {TARGET_STATUS_OPTIONS.map(([value, label]) => (
      <option key={value} value={value}>
        {label}
      </option>
    ))}
  </select>
</label>

<label style={statusFieldStyle}>
  <span style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>
    Priority
  </span>

  <select
    value={item.priority || ""}
    onChange={(e) => updateProgramPriority(college.id, e.target.value)}
    disabled={updatingCollegeId === college.id}
    style={statusSelectStyle}
  >
    {TARGET_PRIORITY_OPTIONS.map(([value, label]) => (
      <option key={value} value={value}>
        {label}
      </option>
    ))}
  </select>
</label>
                  </div>

                  <div style={nextActionStyle}>
                    <span style={nextActionLabelStyle}>Next Action</span>
                    <span>{getNextAction(item.status)}</span>
                  </div>

                {Array.isArray(item.truthFit?.development) &&
                  item.truthFit.development.length > 0 ? (
                    <div style={fitDevelopmentStyle}>
                      <span style={fitDevelopmentLabelStyle}>Truth Fit Development</span>
                      {item.truthFit.development.slice(0, 2).map((tip, index) => (
                        <span key={index}>• {tip}</span>
                      ))}
                    </div>
                  ) : null}

                  <div style={{ marginTop: 12 }}>
  <label style={notesFieldStyle}>
    <span style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>
      Notes
    </span>

    <textarea
      value={item.notes || ""}
      onChange={(e) => {
        const nextNotes = e.target.value;

        setSaved((prev) =>
          prev.map((row) =>
            row.collegeId === college.id ? { ...row, notes: nextNotes } : row
          )
        );
      }}
      onBlur={(e) => updateProgramNotes(college.id, e.target.value)}
      placeholder="Add recruiting notes, coach contact history, camp info, next steps..."
      maxLength={1000}
      style={notesTextareaStyle}
    />

    <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700 }}>
      {savingNotesCollegeId === college.id
        ? "Saving notes..."
        : `${(item.notes || "").length}/1000`}
    </span>
  </label>
</div>

<div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
  <Link href={`/college/${college.slug}`} style={primaryButtonStyle}>
    View Details
  </Link>

  {college.admissionsUrl ? (
    <a href={college.admissionsUrl} target="_blank" rel="noreferrer" style={secondaryButtonStyle}>
      Admissions
    </a>
  ) : null}

  {baseball?.baseballWebsiteUrl ? (
    <a href={baseball.baseballWebsiteUrl} target="_blank" rel="noreferrer" style={secondaryButtonStyle}>
      Baseball Program
    </a>
  ) : null}

  {baseball?.rosterUrl ? (
    <a href={baseball.rosterUrl} target="_blank" rel="noreferrer" style={secondaryButtonStyle}>
      Roster
    </a>
  ) : null}

  {baseball?.questionnaireUrl ? (
    <a href={baseball.questionnaireUrl} target="_blank" rel="noreferrer" style={secondaryButtonStyle}>
      Questionnaire
    </a>
  ) : null}

  {baseball?.campsUrl ? (
  <a href={baseball.campsUrl} target="_blank" rel="noreferrer" style={secondaryButtonStyle}>
    Camps
  </a>
) : null}

{primaryCoach?.email ? (
  <a
    href={buildMailtoUrl({
      email: primaryCoach.email,
      subject: buildCoachEmailSubject(college.name),
      body: buildCoachEmailBody({
        collegeName: college.name,
        coachName: primaryCoach.name,
        status: item.status,
      }),
    })}
    style={secondaryButtonStyle}
>
  {getOutreachLabel(item.status)}
</a>
) : (
  <span
    title="Coach email is not available yet for this program."
    style={{
      ...secondaryButtonStyle,
      opacity: 0.55,
      cursor: "not-allowed",
    }}
  >
    Coach Email Not Available
  </span>
)}

{primaryCoach?.phone ? (
  <a href={`tel:${primaryCoach.phone.replace(/\D/g, "")}`} style={secondaryButtonStyle}>
    Call Coach
  </a>
) : null}

{primaryCoach?.bioUrl ? (
  <a href={primaryCoach.bioUrl} target="_blank" rel="noreferrer" style={secondaryButtonStyle}>
    Coach Bio
  </a>
) : null}

{primaryCoach?.contactUrl ? (
  <a href={primaryCoach.contactUrl} target="_blank" rel="noreferrer" style={secondaryButtonStyle}>
    Contact Page
  </a>
) : null}
</div>
                </article>
              );
            })}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

const cardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  background: "#ffffff",
  padding: 18,
  boxShadow: "0 8px 20px rgba(15,23,42,0.05)",
};

const truthFitPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  border: "1px solid",
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 900,
};

const pillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 900,
  color: "#334155",
};

const primaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  padding: "9px 13px",
  background: "#caa042",
  color: "#0f172a",
  textDecoration: "none",
  fontWeight: 900,
  border: "1px solid #caa042",
};

const secondaryButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  padding: "9px 13px",
  background: "#ffffff",
  color: "#0f172a",
  textDecoration: "none",
  fontWeight: 900,
  border: "1px solid #cbd5e1",
};

const starButtonStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 999,
  border: "2px solid #caa042",
  background: "#caa042",
  color: "#0f172a",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 16,
  fontWeight: 900,
  lineHeight: 1,
  padding: 0,
};

const emptyStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  background: "#ffffff",
  padding: 22,
  boxShadow: "0 8px 20px rgba(15,23,42,0.05)",
};

const errorStyle: React.CSSProperties = {
  border: "1px solid #fecaca",
  background: "#fff1f2",
  color: "#991b1b",
  borderRadius: 12,
  padding: 14,
  marginBottom: 16,
  fontWeight: 700,
};

const backToDashboardStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  padding: "9px 13px",
  background: "#0ea5e9",
  color: "#ffffff",
  textDecoration: "none",
  fontWeight: 900,
  border: "1px solid #0ea5e9",
};

const statusFieldStyle: React.CSSProperties = {
  border: "1px solid #eef2f7",
  background: "#f8fafc",
  borderRadius: 12,
  padding: "10px 12px",
  display: "grid",
  gap: 4,
};

const statusSelectStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "7px 8px",
  background: "#ffffff",
  color: "#0f172a",
  fontWeight: 800,
  outline: "none",
};

const notesFieldStyle: React.CSSProperties = {
  border: "1px solid #eef2f7",
  background: "#f8fafc",
  borderRadius: 12,
  padding: "10px 12px",
  display: "grid",
  gap: 6,
};

const notesTextareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 78,
  resize: "vertical",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "9px 10px",
  background: "#ffffff",
  color: "#0f172a",
  fontWeight: 700,
  outline: "none",
  boxSizing: "border-box",
};

const filterBarStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  overflowX: "auto",
  whiteSpace: "nowrap",
  paddingBottom: 6,
  marginBottom: 10,
};

const filterButtonStyle: React.CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 999,
  padding: "6px 9px",
  fontWeight: 900,
  cursor: "pointer",
  fontSize: 11,
  flex: "0 0 auto",
};

const priorityGroupSectionStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
};

const priorityGroupHeaderStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 900,
  color: "#0f172a",
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  borderRadius: 999,
  padding: "8px 12px",
  width: "fit-content",
};

const priorityJumpBarStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  overflowX: "auto",
  whiteSpace: "nowrap",
  paddingBottom: 6,
  marginBottom: 18,
};

const priorityJumpButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid #cbd5e1",
  borderRadius: 999,
  padding: "6px 9px",
  background: "#ffffff",
  color: "#0f172a",
  textDecoration: "none",
  fontWeight: 900,
  fontSize: 11,
  flex: "0 0 auto",
};

const schoolTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "1.35rem",
  fontWeight: 900,
  display: "flex",
  alignItems: "baseline",
  gap: 8,
  flexWrap: "wrap",
};

const schoolMetaTitleStyle: React.CSSProperties = {
  fontSize: "0.9rem",
  fontWeight: 800,
  color: "#64748b",
};

const nextActionStyle: React.CSSProperties = {
  marginTop: 12,
  border: "1px solid #bae6fd",
  background: "#e0f2fe",
  borderRadius: 12,
  padding: "10px 12px",
  color: "#0c4a6e",
  fontWeight: 800,
  lineHeight: 1.45,
  fontSize: 13,
  display: "grid",
  gap: 4,
};

const nextActionLabelStyle: React.CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "#0369a1",
  fontWeight: 900,
};

const fitDevelopmentStyle: React.CSSProperties = {
  marginTop: 10,
  border: "1px solid #e0e7ff",
  background: "#eef2ff",
  borderRadius: 12,
  padding: "10px 12px",
  color: "#312e81",
  fontWeight: 800,
  lineHeight: 1.45,
  fontSize: 13,
  display: "grid",
  gap: 4,
};

const fitDevelopmentLabelStyle: React.CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "#3730a3",
  fontWeight: 900,
};