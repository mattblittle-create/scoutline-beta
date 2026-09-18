// app/dashboard/coach/program-verifications/page.tsx

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type Submission = {
  id: string;
  status: string;
  submittedData: any;
  currentData?: any;
  adminNotes?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  college?: {
    name?: string | null;
    slug?: string | null;
    division?: string | null;
    conference?: string | null;
    state?: string | null;
  } | null;
  submittedByUser?: {
    name?: string | null;
    email?: string | null;
  } | null;
  reviewedByUser?: {
    name?: string | null;
    email?: string | null;
  } | null;
};

async function readJsonSafe(res: Response) {
  const text = await res.text();

  if (!text.trim()) {
    return {
      ok: false,
      error: `Empty response from server (${res.status}). Check the server/API logs for the approve route.`,
    };
  }

  try {
    return JSON.parse(text);
  } catch {
    return {
      ok: false,
      error: `Non-JSON response from server (${res.status}): ${text.slice(0, 500)}`,
    };
  }
}

function normalizeCompare(value: any) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  return String(value).trim();
}

function isChanged(currentValue: any, proposedValue: any) {
  return normalizeCompare(currentValue) !== normalizeCompare(proposedValue);
}

function pretty(value: any) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

function stableJson(value: any) {
  if (value === null || value === undefined || value === "") return "";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export default function CoachProgramVerificationsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch("/api/coach/program-verifications", {
        cache: "no-store",
      });

      const json = await readJsonSafe(res);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Could not load program verifications.");
      }

      setSubmissions(json.data.submissions || []);
    } catch (err: any) {
      setMsg(err?.message || "Could not load program verifications.");
    } finally {
      setLoading(false);
    }
  }

  async function act(submissionId: string, action: "APPROVE" | "REJECT") {
    setBusyId(submissionId);
    setMsg(null);

    try {
      const res = await fetch(`/api/coach/program-verifications/${submissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          adminNotes: notesById[submissionId] || "",
        }),
      });

      const json = await readJsonSafe(res);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Could not ${action.toLowerCase()} submission.`);
      }

      setMsg(`Submission ${action === "APPROVE" ? "approved and applied" : "rejected"}.`);
      await load();
    } catch (err: any) {
      setMsg(err?.message || `Could not ${action.toLowerCase()} submission.`);
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <main style={page}>
        <p style={muted}>Loading program verifications...</p>
      </main>
    );
  }

  return (
    <main style={page}>
      <div style={topbar}>
        <div>
          <Link href="/dashboard/coach" style={backLink}>
            ← Back to Coach Dashboard
          </Link>
          <h1 style={title}>Program Verifications</h1>
          <p style={subtitle}>
            Review program updates submitted by your coaching staff before applying them to your live ScoutLine program profile.
          </p>
        </div>

        <button type="button" onClick={load} style={secondaryBtn}>
          Refresh
        </button>
      </div>

      {msg ? (
        <div
          style={{
            ...notice,
            borderColor:
              msg.includes("Could not") ||
              msg.includes("Unauthorized") ||
              msg.includes("server")
                ? "#fecaca"
                : "#bbf7d0",
            background:
              msg.includes("Could not") ||
              msg.includes("Unauthorized") ||
              msg.includes("server")
                ? "#fef2f2"
                : "#f0fdf4",
            color:
              msg.includes("Could not") ||
              msg.includes("Unauthorized") ||
              msg.includes("server")
                ? "#991b1b"
                : "#166534",
          }}
        >
          {msg}
        </div>
      ) : null}

      {msg?.includes("Unauthorized") ? (
        <section style={card}>
          <p style={{ ...muted, color: "#991b1b", fontWeight: 900 }}>
            Unauthorized. Your account must be marked as a Program Admin to review program verifications.
          </p>
        </section>
      ) : submissions.length ? (
        <div style={{ display: "grid", gap: 14 }}>
          {submissions.map((submission) => {
            const isPending = submission.status === "PENDING";
            const d = submission.submittedData || {};
            const c = submission.currentData || {};

            return (
              <section key={submission.id} style={card}>
                <div style={headerRow}>
                  <div>
                    <h2 style={sectionTitle}>
                      {submission.college?.name || "Unknown College"}
                    </h2>
                    <p style={muted}>
                      {submission.college?.division || "Division unknown"}
                      {submission.college?.conference ? ` • ${submission.college.conference}` : ""}
                      {submission.college?.state ? ` • ${submission.college.state}` : ""}
                    </p>
                    <p style={muted}>
                      Submitted by{" "}
                      <strong>
                        {submission.submittedByUser?.name ||
                          submission.submittedByUser?.email ||
                          "Unknown user"}
                      </strong>{" "}
                      on {new Date(submission.createdAt).toLocaleString()}
                    </p>
                  </div>

                  <span
                    style={{
                      ...statusPill,
                      background:
                        submission.status === "APPROVED"
                          ? "#dcfce7"
                          : submission.status === "REJECTED"
                          ? "#fee2e2"
                          : "#fef9c3",
                      color:
                        submission.status === "APPROVED"
                          ? "#166534"
                          : submission.status === "REJECTED"
                          ? "#991b1b"
                          : "#854d0e",
                    }}
                  >
                    {submission.status}
                  </span>
                </div>

                {isPending ? (
                  <p style={pendingHint}>
                    Red proposed values are changes from the current live program data.
                  </p>
                ) : null}

                <div style={grid}>
                  <CompareData label="Nickname" current={c.nickname} proposed={d.nickname} pending={isPending} />
                  <CompareData label="Logo URL" current={c.logoUrl} proposed={d.logoUrl} pending={isPending} />
                  <CompareData label="Baseball Website" current={c.baseballWebsiteUrl} proposed={d.baseballWebsiteUrl} pending={isPending} />
                  <CompareData label="Roster URL" current={c.rosterUrl} proposed={d.rosterUrl} pending={isPending} />
                  <CompareData label="Schedule URL" current={c.scheduleUrl} proposed={d.scheduleUrl} pending={isPending} />
                  <CompareData label="Camps URL" current={c.campsUrl} proposed={d.campsUrl} pending={isPending} />
                  <CompareData label="Questionnaire URL" current={c.questionnaireUrl} proposed={d.questionnaireUrl} pending={isPending} />
                  <CompareData label="Program X URL" current={c.programXUrl} proposed={d.programXUrl} pending={isPending} />
                  <CompareData label="Program Instagram URL" current={c.programInstagramUrl} proposed={d.programInstagramUrl} pending={isPending} />
                  <CompareData label="Program YouTube URL" current={c.programYoutubeUrl} proposed={d.programYoutubeUrl} pending={isPending} />
                  <CompareData label="Recruiting Coordinator" current={c.recruitingCoordinatorName} proposed={d.recruitingCoordinatorName} pending={isPending} />
                  <CompareData label="Recruiting Coordinator Email" current={c.recruitingCoordinatorEmail} proposed={d.recruitingCoordinatorEmail} pending={isPending} />
                  <CompareData label="Recruiting Coordinator Phone" current={c.recruitingCoordinatorPhone} proposed={d.recruitingCoordinatorPhone} pending={isPending} />
                  <CompareData label="Recruiting Coordinator X URL" current={c.recruitingCoordinatorXUrl} proposed={d.recruitingCoordinatorXUrl} pending={isPending} />
                  <CompareData label="Recruiting Coordinator Instagram URL" current={c.recruitingCoordinatorInstagramUrl} proposed={d.recruitingCoordinatorInstagramUrl} pending={isPending} />
                  <CompareData label="Current Roster Size" current={c.currentRosterSize} proposed={d.currentRosterSize} pending={isPending} />
                  <CompareData label="Average GPA" current={c.averageGpa} proposed={d.averageGpa} pending={isPending} />
                  <CompareData label="Transfer Heavy" current={c.transferHeavy} proposed={d.transferHeavy} pending={isPending} />
                  <CompareData label="JUCO Friendly" current={c.jucoFriendly} proposed={d.jucoFriendly} pending={isPending} />
                  <CompareData label="Recruiting Aggressiveness" current={c.recruitingAggressiveness} proposed={d.recruitingAggressiveness} pending={isPending} />
                  <CompareData label="Regional Recruiting Bias" current={c.regionalRecruitingBias} proposed={d.regionalRecruitingBias} pending={isPending} />
                  <CompareData label="Roster Turnover" current={c.rosterTurnoverLevel} proposed={d.rosterTurnoverLevel} pending={isPending} />
                </div>

                <CompareBlock title="Coach Contacts" current={c.coachContacts} proposed={d.coachContacts} pending={isPending} />
                <CompareBlock title="Roster Needs" current={c.rosterNeeds} proposed={d.rosterNeeds} pending={isPending} />
                <CompareBlock title="Academic Areas" current={c.academicAreas} proposed={d.academicAreas} pending={isPending} />
                <CompareBlock title="Program Metrics" current={c.programMetrics} proposed={d.programMetrics} pending={isPending} />
                <CompareBlock title="NIL Info" current={c.nilInfo} proposed={d.nilInfo} pending={isPending} />

                {isPending ? (
                  <div style={reviewBox}>
                    <label style={field}>
                      <span style={label}>Program Admin Notes</span>
                      <textarea
                        rows={3}
                        value={notesById[submission.id] || ""}
                        onChange={(e) =>
                          setNotesById((current) => ({
                            ...current,
                            [submission.id]: e.target.value,
                          }))
                        }
                        style={{ ...input, resize: "vertical" }}
                        placeholder="Optional notes for approval/rejection..."
                      />
                    </label>

                    <div style={buttonRow}>
                      <button
                        type="button"
                        onClick={() => act(submission.id, "APPROVE")}
                        disabled={busyId === submission.id}
                        style={approveBtn}
                      >
                        {busyId === submission.id ? "Working..." : "Approve & Apply"}
                      </button>

                      <button
                        type="button"
                        onClick={() => act(submission.id, "REJECT")}
                        disabled={busyId === submission.id}
                        style={rejectBtn}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ) : (
                  <p style={muted}>
                    Reviewed{" "}
                    {submission.reviewedAt
                      ? new Date(submission.reviewedAt).toLocaleString()
                      : "date unavailable"}
                    {submission.reviewedByUser?.email
                      ? ` by ${submission.reviewedByUser.email}`
                      : ""}
                  </p>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <section style={card}>
          <p style={muted}>No program verification submissions found.</p>
        </section>
      )}
    </main>
  );
}

function CompareData(props: {
  label: string;
  current: any;
  proposed: any;
  pending?: boolean;
}) {
  const changed = props.pending && isChanged(props.current, props.proposed);

  return (
    <div style={dataCell}>
      <span style={dataLabel}>{props.label}</span>
      <span style={currentValue}>Current: {pretty(props.current)}</span>
      <span style={{ ...dataValue, color: changed ? "#b91c1c" : "#0f172a" }}>
        Proposed: {pretty(props.proposed)}
      </span>
    </div>
  );
}

function CompareBlock(props: {
  title: string;
  current: any;
  proposed: any;
  pending?: boolean;
}) {
  const proposedEmpty =
    props.proposed === null ||
    props.proposed === undefined ||
    (Array.isArray(props.proposed) && props.proposed.length === 0);

  if (proposedEmpty) return null;

  const changed = props.pending && stableJson(props.current) !== stableJson(props.proposed);

  return (
    <div style={miniBlock}>
      <h3 style={miniTitle}>{props.title}</h3>
      <div style={compareJsonGrid}>
        <div>
          <div style={dataLabel}>Current</div>
          <pre style={pre}>{JSON.stringify(props.current ?? null, null, 2)}</pre>
        </div>
        <div>
          <div style={dataLabel}>Proposed</div>
          <pre style={{ ...pre, color: changed ? "#b91c1c" : "#334155" }}>
            {JSON.stringify(props.proposed ?? null, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

const page: React.CSSProperties = {
  display: "grid",
  gap: 16,
};

const topbar: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  background: "#fff",
  padding: 20,
  boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "flex-start",
};

const backLink: React.CSSProperties = {
  color: "#64748b",
  fontWeight: 800,
  textDecoration: "none",
  fontSize: 13,
};

const title: React.CSSProperties = {
  margin: "10px 0 0",
  fontSize: 28,
  color: "#0f172a",
};

const subtitle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#64748b",
  lineHeight: 1.45,
};

const card: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  background: "#fff",
  padding: 20,
  boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
  display: "grid",
  gap: 14,
};

const headerRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "flex-start",
};

const sectionTitle: React.CSSProperties = {
  margin: 0,
  fontSize: 18,
  color: "#0f172a",
};

const notice: React.CSSProperties = {
  border: "1px solid",
  borderRadius: 14,
  padding: 12,
  fontWeight: 800,
};

const muted: React.CSSProperties = {
  color: "#64748b",
  margin: 0,
};

const pendingHint: React.CSSProperties = {
  margin: 0,
  color: "#b91c1c",
  fontWeight: 900,
  fontSize: 13,
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 10,
};

const compareJsonGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 12,
};

const dataCell: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 10,
  background: "#f8fafc",
  display: "grid",
  gap: 4,
};

const dataLabel: React.CSSProperties = {
  fontSize: 12,
  color: "#64748b",
  fontWeight: 900,
};

const currentValue: React.CSSProperties = {
  fontSize: 12,
  color: "#64748b",
  fontWeight: 700,
  overflowWrap: "anywhere",
};

const dataValue: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  overflowWrap: "anywhere",
};

const statusPill: React.CSSProperties = {
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 900,
  whiteSpace: "nowrap",
};

const miniBlock: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 12,
  background: "#f8fafc",
};

const miniTitle: React.CSSProperties = {
  margin: "0 0 8px",
  fontSize: 14,
  color: "#0f172a",
};

const pre: React.CSSProperties = {
  margin: 0,
  whiteSpace: "pre-wrap",
  fontSize: 12,
  lineHeight: 1.35,
  color: "#334155",
};

const reviewBox: React.CSSProperties = {
  borderTop: "1px solid #e2e8f0",
  paddingTop: 14,
  display: "grid",
  gap: 12,
};

const field: React.CSSProperties = {
  display: "grid",
  gap: 6,
};

const label: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 900,
  color: "#334155",
};

const input: React.CSSProperties = {
  width: "100%",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "10px 12px",
  color: "#0f172a",
  background: "#fff",
};

const buttonRow: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
};

const approveBtn: React.CSSProperties = {
  border: "1px solid #16a34a",
  background: "#16a34a",
  color: "#fff",
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: 900,
  cursor: "pointer",
};

const rejectBtn: React.CSSProperties = {
  border: "1px solid #dc2626",
  background: "#dc2626",
  color: "#fff",
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: 900,
  cursor: "pointer",
};

const secondaryBtn: React.CSSProperties = {
  border: "1px solid #cbd5e1",
  background: "#fff",
  color: "#0f172a",
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: 900,
  cursor: "pointer",
};