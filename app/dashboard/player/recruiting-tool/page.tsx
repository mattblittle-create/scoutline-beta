// app/dashboard/player/recruiting-tool/page.tsx

"use client";

import Link from "next/link";
import React from "react";

function getPriorityFromFit(label: string) {
  if (label === "Strong Fit") return "HIGH";
  if (label === "Match") return "MEDIUM";
  return "LOW";
}

export default function PlayerRecruitingToolPage() {
  const [truthFitResults, setTruthFitResults] = React.useState<any[]>([]);
  const [savedCollegeIds, setSavedCollegeIds] = React.useState<string[]>([]);
  const [savingCollegeId, setSavingCollegeId] = React.useState("");
  const [loadingTruthFit, setLoadingTruthFit] = React.useState(false);
  const [truthFitError, setTruthFitError] = React.useState("");

  React.useEffect(() => {
  async function loadSaved() {
    try {
      const res = await fetch("/api/player/target-programs", {
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.ok) {
        const ids = (data.saved || [])
          .map((item: any) => item?.collegeId)
          .filter(Boolean);

        setSavedCollegeIds(ids);
      }
    } catch {
      setSavedCollegeIds([]);
    }
  }

  loadSaved();
}, []);

  async function loadTruthFit() {
    try {
      setLoadingTruthFit(true);
      setTruthFitError("");

      const res = await fetch("/api/player/truth-fit", {
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to load Truth Fit.");
      }

      setTruthFitResults(data.results || []);
    } catch (err) {
      console.error("TRUTH_FIT_LOAD_ERROR", err);
      setTruthFitError("Could not load Truth Fit results.");
    } finally {
      setLoadingTruthFit(false);
    }
  }

async function toggleSavedCollege(collegeId: string, fitLabel: string) {
  const isSaved = savedCollegeIds.includes(collegeId);

  try {
    setSavingCollegeId(collegeId);

const res = await fetch("/api/player/target-programs", {
  method: isSaved ? "DELETE" : "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    collegeId,
    priority: getPriorityFromFit(fitLabel),
  }),
});

const data = await res.json().catch(() => null);

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error || "Save failed.");
    }

    setSavedCollegeIds((prev) =>
      isSaved
        ? prev.filter((id) => id !== collegeId)
        : [...prev, collegeId]
    );
  } catch (err) {
    console.error("TRUTH_FIT_SAVE_ERROR", err);
  } finally {
    setSavingCollegeId("");
  }
}

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "8px 0 40px" }}>
      <section style={shellStyle}>
        <div style={headerStyle}>
          <div>
            <h1 style={titleStyle}>Recruiting Tool</h1>

            <p style={subtitleStyle}>
              ScoutLine’s Recruiting Tool helps players better understand
              college fit, recruiting opportunities, skill gaps, division-level
              benchmarks, and where their profile best matches current college
              recruiting needs.
            </p>

            <button
              type="button"
              onClick={loadTruthFit}
              disabled={loadingTruthFit}
              style={{
                ...primaryButtonStyle,
                opacity: loadingTruthFit ? 0.7 : 1,
                cursor: loadingTruthFit ? "not-allowed" : "pointer",
              }}
            >
              {loadingTruthFit ? "Generating Truth Fit..." : "Generate Truth Fit"}
            </button>
          </div>

          <Link href="/dashboard/player" style={backToDashboardStyle}>
            Back to Dashboard
          </Link>
        </div>

        <div style={cardGridStyle}>
          <FeatureCard
            title="Truth / Fit Analysis"
            description="Compare player academics, metrics, stats, and position data against college recruiting benchmarks."
          />

          <FeatureCard
            title="Opportunity Matching"
            description="Identify schools where your current profile best aligns with recruiting needs and roster opportunities."
          />

          <FeatureCard
            title="Development Priorities"
            description="Highlight the next most impactful areas for improvement to boost recruiting visibility."
          />
        </div>

        {truthFitError ? (
          <div style={errorStyle}>{truthFitError}</div>
        ) : null}

        {truthFitResults.length > 0 ? (
          <section style={{ marginTop: 28 }}>
            <div style={sectionHeaderStyle}>
              <div>
                <h2 style={sectionTitleStyle}>Recommended For You</h2>
                <p style={sectionSubtitleStyle}>
                  Ranked by ScoutLine Truth Fit using your current profile data
                  and available school/program data.
                </p>
              </div>

              <div style={countPillStyle}>
                Top {Math.min(25, truthFitResults.length)} shown
              </div>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {truthFitResults.slice(0, 25).map((item) => {
                const c = item.college;
                const fit = item.truthFit;

                  return (
                  <article key={c.id} style={resultCardStyle}>
                    <div style={resultTopRowStyle}>
                      <div>
                        <Link
                          href={`/college/${c.slug}`}
                          style={collegeNameStyle}
                        >
                          {c.name}
                        </Link>

                        <div style={locationStyle}>
                          {[c.city, c.state].filter(Boolean).join(", ") ||
                            "Location TBD"}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <button
                          type="button"
                          title={
                            savedCollegeIds.includes(c.id)
                              ? "Remove from Target Programs"
                              : "Save to Target Programs"
                          }
                          onClick={() => toggleSavedCollege(c.id, fit.label)}
                          disabled={savingCollegeId === c.id}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 999,
                            border: "2px solid #0ea5e9",
                            background: savedCollegeIds.includes(c.id)
                              ? "#caa042"
                              : "transparent",
                            color: savedCollegeIds.includes(c.id)
                              ? "#0f172a"
                              : "#0ea5e9",
                            fontWeight: 900,
                            cursor:
                              savingCollegeId === c.id ? "not-allowed" : "pointer",
                            opacity: savingCollegeId === c.id ? 0.6 : 1,
                          }}
                        >
                          ★
                        </button>

<div
  title={
    fit.label === "Not Yet"
      ? `Not Yet = This school is currently a stretch based on your profile.\nScore: ${fit.score}/100\nFocus on improving key metrics to increase your fit.`
      : fit.label === "Reach"
      ? `Reach = You’re close but still slightly below typical benchmarks.\nScore: ${fit.score}/100`
      : fit.label === "Match"
      ? `Match = Your profile aligns well with this program.\nScore: ${fit.score}/100`
      : fit.label === "Strong Fit"
      ? `Strong Fit = You are a strong match for this program.\nScore: ${fit.score}/100`
      : `Fit Score: ${fit.score}/100`
  }
  style={{
    ...fitBadgeStyle,
    color: getFitColor(fit.label),
    borderColor: getFitBorderColor(fit.label),
    background: getFitBackground(fit.label),
    cursor: "help",
  }}
>
  {fit.label} • {fit.score}
</div>
                      </div>
                    </div>

                    <div style={metaGridStyle}>
                      <Info label="Division" value={pretty(c.baseballProgram?.division)} />
                      <Info label="Conference" value={c.baseballProgram?.conference || "—"} />
                      <Info label="Nickname" value={c.baseballProgram?.nickname || "—"} />
                    </div>

                    {Array.isArray(fit.reasons) && fit.reasons.length > 0 ? (
                      <div style={reasonBoxStyle}>
                        <div style={reasonTitleStyle}>Why this fit showed up</div>
                        {fit.reasons.slice(0, 3).map((reason: string, index: number) => (
                          <div key={index} style={reasonLineStyle}>
                            • {reason}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {Array.isArray(fit.gaps) && fit.gaps.length > 0 ? (
                      <div style={gapBoxStyle}>
                        <div style={gapTitleStyle}>Development / fit gaps</div>
                        {fit.gaps.slice(0, 2).map((gap: string, index: number) => (
                          <div key={index} style={gapLineStyle}>
                            • {gap}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        ) : (
          <div style={infoBannerStyle}>
            Generate Truth Fit to see ranked college recommendations based on
            your current player profile.
          </div>
        )}
      </section>
    </main>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div style={featureCardStyle}>
      <div style={featureTitleStyle}>{title}</div>
      <div style={featureDescriptionStyle}>{description}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoBoxStyle}>
      <div style={infoLabelStyle}>{label}</div>
      <div style={infoValueStyle}>{value}</div>
    </div>
  );
}

function pretty(value?: string | null) {
  if (!value) return "—";

  const raw = String(value).replace(/_/g, " ").toUpperCase();

  return raw
    .split(" ")
    .map((word) => {
      if (["NCAA", "NAIA", "NJCAA", "SEC", "ACC"].includes(word)) return word;
      if (/^D[123]$/.test(word)) return word;
      return word.charAt(0) + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function getFitColor(label: string) {
  if (label === "Strong Fit") return "#15803d";
  if (label === "Match") return "#0369a1";
  if (label === "Possible Match") return "#b45309";
  return "#b91c1c";
}

function getFitBorderColor(label: string) {
  if (label === "Strong Fit") return "#bbf7d0";
  if (label === "Match") return "#bae6fd";
  if (label === "Possible Match") return "#fde68a";
  return "#fecaca";
}

function getFitBackground(label: string) {
  if (label === "Strong Fit") return "#f0fdf4";
  if (label === "Match") return "#e0f2fe";
  if (label === "Possible Match") return "#fffbeb";
  return "#fef2f2";
}

const shellStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 20,
  padding: 28,
  background: "#ffffff",
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
  marginBottom: 24,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "2rem",
  fontWeight: 900,
  color: "#0f172a",
};

const subtitleStyle: React.CSSProperties = {
  marginTop: 10,
  marginBottom: 0,
  color: "#475569",
  lineHeight: 1.6,
  maxWidth: 700,
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

const primaryButtonStyle: React.CSSProperties = {
  marginTop: 16,
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #0ea5e9",
  background: "#0ea5e9",
  color: "#ffffff",
  fontWeight: 900,
};

const cardGridStyle: React.CSSProperties = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
};

const featureCardStyle: React.CSSProperties = {
  borderRadius: 16,
  padding: 20,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
};

const featureTitleStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 900,
  color: "#0f172a",
  marginBottom: 10,
};

const featureDescriptionStyle: React.CSSProperties = {
  color: "#475569",
  lineHeight: 1.5,
  fontSize: 14,
};

const infoBannerStyle: React.CSSProperties = {
  marginTop: 28,
  padding: 18,
  borderRadius: 16,
  background: "#e0f2fe",
  border: "1px solid #bae6fd",
  color: "#0c4a6e",
  fontWeight: 700,
  lineHeight: 1.6,
};

const errorStyle: React.CSSProperties = {
  marginTop: 18,
  padding: 14,
  borderRadius: 14,
  background: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#b91c1c",
  fontWeight: 800,
};

const sectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 14,
};

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "1.35rem",
  fontWeight: 900,
  color: "#0f172a",
};

const sectionSubtitleStyle: React.CSSProperties = {
  margin: "6px 0 0",
  color: "#64748b",
  fontSize: 14,
  lineHeight: 1.5,
};

const countPillStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  borderRadius: 999,
  padding: "7px 11px",
  fontSize: 12,
  fontWeight: 900,
  color: "#334155",
};

const resultCardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 16,
  background: "#ffffff",
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
};

const resultTopRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  alignItems: "flex-start",
};

const collegeNameStyle: React.CSSProperties = {
  fontWeight: 900,
  color: "#0f172a",
  textDecorationColor: "#caa042",
  fontSize: "1.12rem",
};

const locationStyle: React.CSSProperties = {
  marginTop: 5,
  fontSize: 13,
  color: "#64748b",
  fontWeight: 700,
};

const fitBadgeStyle: React.CSSProperties = {
  border: "1px solid",
  borderRadius: 999,
  padding: "7px 11px",
  fontSize: 13,
  fontWeight: 900,
};

const metaGridStyle: React.CSSProperties = {
  marginTop: 12,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 10,
};

const infoBoxStyle: React.CSSProperties = {
  border: "1px solid #eef2f7",
  background: "#f8fafc",
  borderRadius: 12,
  padding: "10px 12px",
};

const infoLabelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#64748b",
  fontWeight: 800,
};

const infoValueStyle: React.CSSProperties = {
  marginTop: 3,
  fontWeight: 900,
  color: "#0f172a",
};

const reasonBoxStyle: React.CSSProperties = {
  marginTop: 12,
  border: "1px solid #dcfce7",
  background: "#f0fdf4",
  borderRadius: 12,
  padding: 12,
};

const reasonTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  color: "#166534",
  marginBottom: 6,
};

const reasonLineStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#14532d",
  lineHeight: 1.45,
};

const gapBoxStyle: React.CSSProperties = {
  marginTop: 10,
  border: "1px solid #fed7aa",
  background: "#fff7ed",
  borderRadius: 12,
  padding: 12,
};

const gapTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  color: "#9a3412",
  marginBottom: 6,
};

const gapLineStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#7c2d12",
  lineHeight: 1.45,
};