// app/dashboard/player/target-programs/page.tsx

"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";

type SavedProgram = {
  id: string;
  collegeId: string;
  listName: string;
  status: string;
  notes?: string | null;
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
    } | null;
  };
};

function pretty(value?: string | null) {
  if (!value) return "—";
  const raw = value.replace(/_/g, " ").toUpperCase();

  return raw
    .split(" ")
    .map((word) => {
      if (["NCAA", "NAIA", "NJCAA", "SEC", "ACC"].includes(word)) return word;
      if (/^D[123]$/.test(word)) return word;
      return word.charAt(0) + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function money(value?: number | null) {
  if (value == null) return "—";
  return `$${value.toLocaleString()}`;
}

export default function TargetProgramsPage() {
  const [saved, setSaved] = useState<SavedProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingCollegeId, setRemovingCollegeId] = useState("");
  const [error, setError] = useState("");

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

            <Link href="/dashboard/player" style={secondaryButtonStyle}>
              Back to Dashboard
            </Link>
          </div>
        </div>

        {error ? <div style={errorStyle}>{error}</div> : null}

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
          <div style={{ display: "grid", gap: 14 }}>
            {saved.map((item) => {
              const college = item.college;
              const baseball = college.baseballProgram;

              return (
                <article key={item.id} style={cardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 900 }}>
                        <Link
                          href={`/college/${college.slug}`}
                          style={{ color: "#0f172a", textDecorationColor: "#caa042" }}
                        >
                          {college.name}
                        </Link>
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
                    <span style={pillStyle}>{pretty(college.region)}</span>
                    <span style={pillStyle}>{pretty(college.control)}</span>
                    <span style={pillStyle}>{pretty(college.schoolType)}</span>
                  </div>

                  <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
                    <Info label="Nickname" value={baseball?.nickname || "—"} />
                    <Info label="Division" value={pretty(baseball?.division)} />
                    <Info label="Conference" value={baseball?.conference || "—"} />
                    <Info label="In-State Tuition" value={money(college.tuitionInState)} />
                    <Info label="Out-of-State Tuition" value={money(college.tuitionOutOfState)} />
                    <Info label="Status" value={item.status || "SAVED"} />
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
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoStyle}>
      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>{label}</div>
      <div style={{ marginTop: 3, fontWeight: 900 }}>{value}</div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  background: "#ffffff",
  padding: 18,
  boxShadow: "0 8px 20px rgba(15,23,42,0.05)",
};

const infoStyle: React.CSSProperties = {
  border: "1px solid #eef2f7",
  background: "#f8fafc",
  borderRadius: 12,
  padding: "10px 12px",
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