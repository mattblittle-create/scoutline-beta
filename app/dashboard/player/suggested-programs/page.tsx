// app/dashboard/player/suggested-programs/page.tsx

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { Suspense } from "react";
import { compareRecommendations } from "@/lib/recommendations/ranking";

function getPriorityFromFit(label: string) {
  if (label === "Strong Fit") return "HIGH";
  if (label === "Match") return "MEDIUM";
  return "LOW";
}

function getRecommendationPills(item: any) {
  const c = item?.college || {};
  const fit = item?.truthFit || {};
  const baseball = c?.baseballProgram || {};
  const miles = c?.distance?.miles ?? item?.distance?.miles ?? null;

  const pills: string[] = [];

  if (item?.isTopRecommendation) pills.push("TOP RECOMMENDATION");

  if (typeof miles === "number") {
    if (miles <= 50) pills.push("LOCAL");
    else if (miles <= 150) pills.push("REGIONAL");
    else if (miles <= 400) pills.push("DRIVABLE");
    else pills.push("LONG DISTANCE");
  }

  if (baseball?.jucoFriendly) pills.push("JUCO FRIENDLY");
  if (baseball?.transferHeavy) pills.push("TRANSFER FRIENDLY");
  if (fit?.priority === "HIGH") pills.push("HIGH PRIORITY");

  return Array.from(new Set(pills)).slice(0, 6);
}

function getRecommendationExplanation(item: any) {
  const c = item?.college || {};
  const fit = item?.truthFit || {};
  const baseball = c?.baseballProgram || {};
  const miles = c?.distance?.miles ?? item?.distance?.miles ?? null;

  const reasons: string[] = [];

  if (fit?.label === "Strong Fit") {
    reasons.push("strongly matches your current recruiting profile");
  } else if (fit?.label === "Match") {
    reasons.push("matches your current recruiting profile");
  } else if (fit?.label === "Possible Match") {
    reasons.push("could be a realistic developmental target");
  }

  if (typeof miles === "number") {
    if (miles <= 150) reasons.push("is within a close recruiting radius");
    else if (miles <= 400) reasons.push("is within a manageable travel range");
    else reasons.push("may require a broader travel strategy");
  }

  if (baseball?.jucoFriendly) reasons.push("shows JUCO-friendly program signals");
  if (baseball?.transferHeavy) reasons.push("has transfer-heavy roster tendencies");

  if (!reasons.length) {
    return "Recommended based on your profile data and available school/program information.";
  }

  return `Recommended because this program ${reasons.slice(0, 3).join(", ")}.`;
}

function getRecruitingConfidence(item: any) {
  const fit = item?.truthFit || {};
  const metrics = Array.isArray(fit.metricComparisons) ? fit.metricComparisons : [];
  const reasons = Array.isArray(fit.reasons) ? fit.reasons : [];
  const gaps = Array.isArray(fit.gaps) ? fit.gaps : [];

  const confidence = String(fit?.benchmarkSource?.metrics?.confidence || "").toUpperCase();
  const sourceLabel = String(fit?.benchmarkSource?.metrics?.label || "").toUpperCase();

  const hasStrongSource =
    sourceLabel.includes("SCHOOL") ||
    sourceLabel.includes("CONFERENCE") ||
    confidence === "HIGH";

  const hasEnoughMetrics = metrics.length >= 3;
  const hasSomeMetrics = metrics.length > 0;
  const hasReasons = reasons.length >= 2;
  const hasGaps = gaps.length > 0;

  if (hasStrongSource && hasEnoughMetrics && hasReasons) {
    return {
      label: "High Confidence",
      title:
        "ScoutLine has strong supporting data for this recommendation, including benchmark data and multiple fit signals.",
    };
  }

  if ((hasSomeMetrics && hasReasons) || confidence === "MEDIUM") {
    return {
      label: "Medium Confidence",
      title:
        "ScoutLine has enough supporting data to make a useful recommendation, but more verified player or program data would improve accuracy.",
    };
  }

  if (hasGaps || confidence === "LOW") {
    return {
      label: "Early Projection",
      title:
        "This recommendation is based on limited or developing data. More player metrics and verified program data may change the fit.",
    };
  }

  return {
    label: "Limited Data",
    title:
      "ScoutLine has limited data for this recommendation. Treat this as a starting point, not a final recruiting conclusion.",
  };
}

function getRankingReasons(item: any) {
  const fit = item?.truthFit || {};
  const c = item?.college || {};
  const baseball = c?.baseballProgram || {};
  const reasons: string[] = [];

  if (item?.geographyLabel) reasons.push(item.geographyLabel);
  if (item?.distance?.label) reasons.push(item.distance.label);

  if (fit?.score >= 76) reasons.push("Strong match score");
  else if (fit?.score >= 62) reasons.push("Solid fit score");

  if (fit?.reasons?.some((r: string) => r.toLowerCase().includes("roster need"))) {
    reasons.push("Roster opportunity");
  }

  if (fit?.reasons?.some((r: string) => r.toLowerCase().includes("gpa"))) {
    reasons.push("Academic alignment");
  }

  if (
    fit?.metricComparisons?.some(
      (m: any) => m.status === "ABOVE" || m.status === "IN_RANGE"
    )
  ) {
    reasons.push("Metric alignment");
  }

  if (baseball?.jucoFriendly) reasons.push("JUCO-friendly program");
  if (baseball?.transferHeavy) reasons.push("Transfer-friendly roster");

  return Array.from(new Set(reasons)).slice(0, 5);
}

const DIVISION_OPTIONS = [
  "ALL",
  "NCAA_D1",
  "NCAA_D2",
  "NCAA_D3",
  "NAIA",
  "NJCAA_D1",
  "NJCAA_D2",
  "NJCAA_D3",
];

const REGION_OPTIONS = [
  "ALL",
  "NORTHEAST",
  "MID_ATLANTIC",
  "SOUTHEAST",
  "MIDWEST",
  "SOUTHWEST",
  "WEST",
  "PACIFIC",
];

const CONTROL_OPTIONS = ["ALL", "PUBLIC", "PRIVATE"];

const STATE_OPTIONS = [
  "ALL",
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "DC",
];

export default function PlayerSuggestedProgramsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading Suggested Programs...</div>}>
      <PlayerSuggestedProgramsContent />
    </Suspense>
  );
}

function PlayerSuggestedProgramsContent() {
  const searchParams = useSearchParams();
  const selectedCollegeId = searchParams.get("collegeId") || "";
  const selectedCollegeRef = React.useRef<HTMLElement | null>(null);

  const [planTier, setPlanTier] = React.useState("REDSHIRT");
  const [truthFitResults, setTruthFitResults] = React.useState<any[]>([]);
  const [savedCollegeIds, setSavedCollegeIds] = React.useState<string[]>([]);
  const [savingCollegeId, setSavingCollegeId] = React.useState("");
  const [loadingTruthFit, setLoadingTruthFit] = React.useState(false);
  const [truthFitError, setTruthFitError] = React.useState("");
  const [hasLoadedTruthFit, setHasLoadedTruthFit] = React.useState(false);

  const [divisionFilter, setDivisionFilter] = React.useState("ALL");
  const [regionFilter, setRegionFilter] = React.useState("ALL");
  const [stateFilter, setStateFilter] = React.useState("ALL");
  const [controlFilter, setControlFilter] = React.useState("ALL");

  const isRedshirt = planTier === "REDSHIRT";
  const isAllAmerican = planTier === "ALL_AMERICAN";

  const rankedTruthFitResults = React.useMemo(() => {
    return [...truthFitResults].sort((a, b) =>
      compareRecommendations(
        {
          name: a?.college?.name,
          recommendedDivisionRank: Number(a?.recommendationRank ?? 0),
          truthFitScore: Number(a?.truthFit?.score ?? 0),
          distanceMiles: a?.college?.distance?.miles ?? a?.distance?.miles ?? null,
        },
        {
          name: b?.college?.name,
          recommendedDivisionRank: Number(b?.recommendationRank ?? 0),
          truthFitScore: Number(b?.truthFit?.score ?? 0),
          distanceMiles: b?.college?.distance?.miles ?? b?.distance?.miles ?? null,
        }
      )
    );
  }, [truthFitResults]);

  const visibleTruthFitResults = isRedshirt
    ? rankedTruthFitResults.slice(0, 3)
    : rankedTruthFitResults;

  React.useEffect(() => {
    async function loadPlanTier() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await res.json().catch(() => null);

        const nextPlan = data?.user?.planTier || data?.planTier || "REDSHIRT";
        setPlanTier(String(nextPlan || "REDSHIRT"));
      } catch {
        setPlanTier("REDSHIRT");
      }
    }

    loadPlanTier();
  }, []);

  React.useEffect(() => {
    async function loadSaved() {
      try {
        const res = await fetch("/api/player/target-programs", { cache: "no-store" });
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

  const loadTruthFit = React.useCallback(async () => {
    try {
      setLoadingTruthFit(true);
      setTruthFitError("");

      const params = new URLSearchParams();

      if (divisionFilter !== "ALL") params.set("division", divisionFilter);
      if (regionFilter !== "ALL") params.set("region", regionFilter);
      if (stateFilter !== "ALL") params.set("state", stateFilter);
      if (controlFilter !== "ALL") params.set("control", controlFilter);

      const qs = params.toString();
      const url = qs ? `/api/player/truth-fit?${qs}` : "/api/player/truth-fit";

      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to load suggested programs.");
      }

      const rawResults = data.results || [];

      const sortedResults = selectedCollegeId
        ? [...rawResults].sort((a: any, b: any) => {
            const aSelected = a?.college?.id === selectedCollegeId ? 1 : 0;
            const bSelected = b?.college?.id === selectedCollegeId ? 1 : 0;
            return bSelected - aSelected;
          })
        : rawResults;

      setTruthFitResults(sortedResults);
      setHasLoadedTruthFit(true);
    } catch (err) {
      console.error("SUGGESTED_PROGRAMS_LOAD_ERROR", err);
      setTruthFitError("Could not load suggested programs.");
      setHasLoadedTruthFit(true);
    } finally {
      setLoadingTruthFit(false);
    }
  }, [divisionFilter, regionFilter, stateFilter, controlFilter, selectedCollegeId]);

  React.useEffect(() => {
    loadTruthFit();
  }, [loadTruthFit]);

  React.useEffect(() => {
    if (!selectedCollegeId || loadingTruthFit || !truthFitResults.length) return;

    const t = window.setTimeout(() => {
      selectedCollegeRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 150);

    return () => window.clearTimeout(t);
  }, [selectedCollegeId, loadingTruthFit, truthFitResults.length]);

  async function toggleSavedCollege(collegeId: string, fitLabel: string, fitPriority?: string) {
    const isSaved = savedCollegeIds.includes(collegeId);

    try {
      setSavingCollegeId(collegeId);

      const res = await fetch("/api/player/target-programs", {
        method: isSaved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collegeId,
          priority: fitPriority || getPriorityFromFit(fitLabel),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Save failed.");
      }

      setSavedCollegeIds((prev) =>
        isSaved ? prev.filter((id) => id !== collegeId) : [...prev, collegeId]
      );
    } catch (err) {
      console.error("SUGGESTED_PROGRAMS_SAVE_ERROR", err);
    } finally {
      setSavingCollegeId("");
    }
  }

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "8px 0 40px" }}>
      <section style={shellStyle}>
        <div style={headerStyle}>
          <div>
            <h1 style={titleStyle}>Suggested Programs</h1>

            <p style={subtitleStyle}>
              ScoutLine-recommended college programs based on your profile, metrics,
              academics, recruiting lane, and available program data.
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
              {loadingTruthFit ? "Refreshing Suggested Programs..." : "Refresh Suggested Programs"}
            </button>
          </div>

          <div style={buttonRowStyle}>
            <Link href="/dashboard/player/recruiting-tool" style={secondaryLinkButtonStyle}>
              Recruiting Tool
            </Link>

            <Link href="/dashboard/player/college-search" style={secondaryLinkButtonStyle}>
              College Search
            </Link>

            <Link href="/dashboard/player" style={backToDashboardStyle}>
              Back to Dashboard
            </Link>
          </div>
        </div>

        <section style={filterPanelStyle}>
          <div style={filterHeaderStyle}>
            <div>
              <h2 style={filterTitleStyle}>Filter schools</h2>
              <p style={filterSubtitleStyle}>
                Narrow your Truth Fit list by division, region, state, and school type.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setDivisionFilter("ALL");
                setRegionFilter("ALL");
                setStateFilter("ALL");
                setControlFilter("ALL");
              }}
              style={secondaryButtonStyle}
            >
              Clear Filters
            </button>
          </div>

          <div style={filterGridStyle}>
            <FilterSelect
              label="Division"
              value={divisionFilter}
              onChange={setDivisionFilter}
              options={DIVISION_OPTIONS}
            />
            <FilterSelect
              label="Region"
              value={regionFilter}
              onChange={setRegionFilter}
              options={REGION_OPTIONS}
            />
            <FilterSelect
              label="State"
              value={stateFilter}
              onChange={setStateFilter}
              options={STATE_OPTIONS}
            />
            <FilterSelect
              label="School Type"
              value={controlFilter}
              onChange={setControlFilter}
              options={CONTROL_OPTIONS}
            />
          </div>
        </section>

        {truthFitError ? <div style={errorStyle}>{truthFitError}</div> : null}

        {loadingTruthFit && !truthFitResults.length ? (
          <div style={infoBannerStyle}>
            Generating your suggested programs from your current profile data...
          </div>
        ) : null}

        {!loadingTruthFit && hasLoadedTruthFit && truthFitResults.length === 0 ? (
          <div style={infoBannerStyle}>
            No suggested programs are available for the current filters. Try clearing filters or adding more profile metrics.
          </div>
        ) : null}

        {truthFitResults.length > 0 ? (
          <section style={{ marginTop: 28 }}>
            {selectedCollegeId ? (
              <div style={selectedCollegeBannerStyle}>
                Showing the selected school first, followed by your full Suggested Programs list.
              </div>
            ) : null}

            <div style={sectionHeaderStyle}>
              <div>
                <h2 style={sectionTitleStyle}>Recommended For You</h2>
                <p style={sectionSubtitleStyle}>
                  Ranked by ScoutLine Truth Fit using your current profile data and available school/program data.
                </p>
              </div>

              <div style={countPillStyle}>
                Showing {Math.min(25, visibleTruthFitResults.length)} of {truthFitResults.length}
              </div>
            </div>

            {isRedshirt && truthFitResults.length > 3 ? (
              <div style={upgradeBoxStyle}>
                <div style={upgradeTitleStyle}>Unlock your full Suggested Programs list</div>
                <div style={upgradeTextStyle}>
                  Redshirt players can preview the top 3 recommendations. Upgrade to Walk-On for the full list, or All-American for full list plus performance comparison insights.
                </div>
                <Link href="/dashboard/player/profile/billing" style={upgradeButtonStyle}>
                  View Upgrade Options
                </Link>
              </div>
            ) : null}

            <div style={{ display: "grid", gap: 12 }}>
              {visibleTruthFitResults.slice(0, 25).map((item) => {
                const c = item.college;
                const fit = item.truthFit;
                const baseball = c.baseballProgram;

                return (
                  <article
                    key={c.id}
                    ref={c.id === selectedCollegeId ? selectedCollegeRef : null}
                    style={{
                      ...resultCardStyle,
                      borderColor: c.id === selectedCollegeId ? "#caa042" : "#e5e7eb",
                      boxShadow:
                        c.id === selectedCollegeId
                          ? "0 8px 22px rgba(202,160,66,0.20)"
                          : "0 1px 2px rgba(0,0,0,0.04)",
                    }}
                  >
                    <div style={resultTopRowStyle}>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <Link href={`/college/${c.slug}`} style={collegeNameStyle}>
                            {c.name}
                          </Link>

                          {item.isTopRecommendation ? (
                            <span
                              title="ScoutLine top recommendation based on fit score, program strength, and recruiting relevance."
                              style={topRecommendationBadgeStyle}
                            >
                              ⭐ Top Recommendation
                            </span>
                          ) : null}
                        </div>

                        <div style={locationStyle}>
                          {[c.city, c.state].filter(Boolean).join(", ") || "Location TBD"}
                          {item.distance?.label ? ` · ${item.distance.label}` : ""}
                        </div>
                      </div>

                      <div style={actionPillRowStyle}>
                        <button
                          type="button"
                          title={
                            savedCollegeIds.includes(c.id)
                              ? "Remove from Target Programs"
                              : "Save to Target Programs"
                          }
                          onClick={() => toggleSavedCollege(c.id, fit.label, fit.priority)}
                          disabled={savingCollegeId === c.id}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 999,
                            border: "2px solid #0ea5e9",
                            background: savedCollegeIds.includes(c.id)
                              ? "#caa042"
                              : "transparent",
                            color: savedCollegeIds.includes(c.id) ? "#0f172a" : "#0ea5e9",
                            fontWeight: 900,
                            cursor: savingCollegeId === c.id ? "not-allowed" : "pointer",
                            opacity: savingCollegeId === c.id ? 0.6 : 1,
                          }}
                        >
                          ★
                        </button>

                        {item.geographyLabel ? (
                          <div title="Geographic relevance based on home state and recruiting region." style={bluePillStyle}>
                            {item.geographyLabel}
                          </div>
                        ) : null}

                        <div
                          title="How strongly ScoutLine recommends targeting this school."
                          style={goldPillStyle}
                        >
                          {getPriorityBadgeText(fit.priority)}
                        </div>

                        {item.fitType ? (
                          <div title="Overall player-to-program fit." style={goldPillStyle}>
                            {item.fitType}
                          </div>
                        ) : null}
                      </div>

                      <div style={recommendationExplanationStyle}>
                        {getRecommendationExplanation(item)}
                      </div>

                      <div style={matchScoreWrapStyle}>
                        <div title={getFitTooltip(fit.label, fit.score)} style={matchScoreStyle}>
                          Match Score {fit.score}/100
                        </div>

                        {(() => {
                          const confidence = getRecruitingConfidence(item);

                          return (
                            <div title={confidence.title} style={confidenceBadgeStyle}>
                              {confidence.label}
                            </div>
                          );
                        })()}
                      </div>

                      <div style={{ gridColumn: "1 / -1" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                          {getRecommendationPills(item).map((pill) => (
                            <span key={pill} style={smallNeutralPillStyle}>
                              {pill}
                            </span>
                          ))}
                        </div>

                        <div style={linkRowStyle}>
                          {c.websiteUrl ? <ExternalLink href={c.websiteUrl}>School Site</ExternalLink> : null}
                          {c.admissionsUrl ? <ExternalLink href={c.admissionsUrl}>Admissions</ExternalLink> : null}
                          {baseball?.baseballWebsiteUrl ? (
                            <ExternalLink href={baseball.baseballWebsiteUrl}>Baseball Site</ExternalLink>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {item.priorityReason ? (
                      <div style={priorityReasonStyle}>{item.priorityReason}</div>
                    ) : null}

                    {getRankingReasons(item).length > 0 ? (
                      <div style={rankingReasonBoxStyle}>
                        <div style={rankingReasonTitleStyle}>Why this school is ranked high</div>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {getRankingReasons(item).map((reason) => (
                            <span key={reason} style={rankingReasonPillStyle}>
                              {reason}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {Array.isArray(fit?.development) && fit.development.length > 0 ? (
                      <div style={highestImpactStyle}>
                        <div style={highestImpactTitleStyle}>Highest Impact Improvement</div>
                        {fit.development[0]}
                      </div>
                    ) : null}

                    <div style={metaGridStyle}>
                      <Info label="Division" value={pretty(baseball?.division)} />
                      <Info label="Conference" value={baseball?.conference || "—"} />
                      <Info label="Nickname" value={baseball?.nickname || "—"} />
                      <Info label="Type" value={pretty(c.control)} />
                    </div>

                    <div style={reasonBoxStyle}>
                      <div style={reasonTitleStyle}>Why ScoutLine likes this fit</div>

                      {Array.isArray(fit.reasons) && fit.reasons.length > 0 ? (
                        fit.reasons.slice(0, 4).map((reason: string, index: number) => (
                          <div key={index} style={reasonLineStyle}>
                            ✓ {reason}
                          </div>
                        ))
                      ) : (
                        <div style={reasonLineStyle}>
                          ✓ This school matches available profile, program, and benchmark data.
                        </div>
                      )}

                      {item.priorityReason ? (
                        <div style={{ ...reasonLineStyle, marginTop: 6 }}>
                          ✓ {item.priorityReason}
                        </div>
                      ) : null}
                    </div>

                    {Array.isArray(fit.gaps) && fit.gaps.length > 0 ? (
                      <div style={gapBoxStyle}>
                        <div style={gapTitleStyle}>Development areas</div>
                        {fit.gaps.slice(0, 3).map((gap: string, index: number) => (
                          <div key={index} style={gapLineStyle}>
                            • {gap}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {Array.isArray(fit.development) && fit.development.length > 0 ? (
                      <div style={developmentBoxStyle}>
                        <div style={developmentTitleStyle}>What to do next</div>
                        {fit.development.slice(0, 3).map((tip: string, index: number) => (
                          <div key={index} style={developmentLineStyle}>
                            • {tip}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {isAllAmerican &&
                    Array.isArray(fit.metricComparisons) &&
                    fit.metricComparisons.length > 0 ? (
                      <div style={comparisonBoxStyle}>
                        <div style={comparisonTitleStyle}>Key Performance vs Benchmark</div>

                        <div style={{ display: "grid", gap: 8 }}>
                          {fit.metricComparisons.slice(0, 4).map((metric: any) => (
                            <div key={metric.key} style={comparisonRowStyle}>
                              <div style={{ fontWeight: 900 }}>{metric.label}</div>

                              <div style={comparisonValueStyle}>
                                You: {formatMetricValue(metric.playerValue, metric.unit)}
                              </div>

                              <div style={comparisonValueStyle}>
                                Benchmark: {formatMetricValue(metric.benchmarkValue, metric.unit)}
                              </div>

                              <div
                                style={{
                                  ...comparisonStatusStyle,
                                  background:
                                    metric.status === "ABOVE"
                                      ? "#f0fdf4"
                                      : metric.status === "IN_RANGE"
                                      ? "#fffbeb"
                                      : "#fef2f2",
                                  borderColor:
                                    metric.status === "ABOVE"
                                      ? "#bbf7d0"
                                      : metric.status === "IN_RANGE"
                                      ? "#fde68a"
                                      : "#fecaca",
                                  color:
                                    metric.status === "ABOVE"
                                      ? "#15803d"
                                      : metric.status === "IN_RANGE"
                                      ? "#b45309"
                                      : "#b91c1c",
                                }}
                              >
                                {metric.status === "ABOVE"
                                  ? "Above"
                                  : metric.status === "IN_RANGE"
                                  ? "In Range"
                                  : "Below"}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {fit?.benchmarkSource?.metrics?.label ? (
                      <div style={benchmarkSourceStyle}>
                        Data Source: {fit.benchmarkSource.metrics.label}{" "}
                        <span style={confidenceTextStyle}>
                          ({fit.benchmarkSource.metrics.confidence || "LOW"} confidence)
                        </span>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        ) : !loadingTruthFit && !hasLoadedTruthFit ? (
          <div style={infoBannerStyle}>
            Suggested Programs will generate automatically using your current player profile.
          </div>
        ) : null}
      </section>
    </main>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label style={filterLabelStyle}>
      <span style={filterLabelTextStyle}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={selectStyle}>
        {options.map((option) => (
          <option key={option} value={option}>
            {option === "ALL" ? "All" : pretty(option)}
          </option>
        ))}
      </select>
    </label>
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

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={smallLinkStyle}>
      {children}
    </a>
  );
}

function pretty(value?: string | null) {
  if (!value) return "—";

  let raw = String(value).replace(/_/g, " ").toUpperCase();

  raw = raw
    .replace("NCAA D1", "NCAA D1")
    .replace("NCAA D2", "NCAA D2")
    .replace("NCAA D3", "NCAA D3")
    .replace("NJCAA D1", "NJCAA D1")
    .replace("NJCAA D2", "NJCAA D2")
    .replace("NJCAA D3", "NJCAA D3");

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

function formatMetricValue(value: number, unit?: string | null) {
  const rounded = Number.isInteger(value) ? value : Number(value.toFixed(2));
  return unit ? `${rounded} ${unit}` : String(rounded);
}

function getPriorityBadgeText(priority?: string | null) {
  if (priority === "HIGH") return "Priority Target";
  if (priority === "MEDIUM") return "Worth Pursuing";
  if (priority === "LOW") return "Development Track";
  return "Priority TBD";
}

function getFitTooltip(label: string, score: number) {
  if (label === "Strong Fit") {
    return `Strong Fit = Your profile is currently tracking very well for this program.\nScore: ${score}/100`;
  }

  if (label === "Match") {
    return `Match = Your profile aligns well with this program based on available data.\nScore: ${score}/100`;
  }

  if (label === "Possible Match") {
    return `Possible Match = This school may be worth tracking, especially if some school-side data is still incomplete.\nScore: ${score}/100`;
  }

  return `Reach / Not Yet = This school is currently a reach based on your profile and available benchmarks, but it can still be tracked as a longer-term target.\nScore: ${score}/100`;
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

const buttonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap",
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

const secondaryLinkButtonStyle: React.CSSProperties = {
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

const primaryButtonStyle: React.CSSProperties = {
  marginTop: 16,
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #0ea5e9",
  background: "#0ea5e9",
  color: "#ffffff",
  fontWeight: 900,
};

const secondaryButtonStyle: React.CSSProperties = {
  padding: "9px 12px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#334155",
  fontWeight: 900,
  cursor: "pointer",
};

const filterPanelStyle: React.CSSProperties = {
  marginTop: 20,
  padding: 16,
  borderRadius: 16,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
};

const filterHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  flexWrap: "wrap",
  marginBottom: 12,
};

const filterTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "1rem",
  fontWeight: 900,
  color: "#0f172a",
};

const filterSubtitleStyle: React.CSSProperties = {
  margin: "4px 0 0",
  color: "#64748b",
  fontSize: 13,
};

const filterGridStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
};

const filterLabelStyle: React.CSSProperties = {
  display: "grid",
  gap: 6,
};

const filterLabelTextStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  color: "#475569",
};

const selectStyle: React.CSSProperties = {
  height: 40,
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  fontWeight: 800,
  padding: "0 10px",
};

const upgradeBoxStyle: React.CSSProperties = {
  marginBottom: 14,
  padding: 16,
  borderRadius: 16,
  background: "#fffaf0",
  border: "1px solid #f5d58b",
  color: "#7c5b12",
};

const upgradeTitleStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 900,
  marginBottom: 6,
};

const upgradeTextStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  lineHeight: 1.5,
  marginBottom: 12,
};

const upgradeButtonStyle: React.CSSProperties = {
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

const selectedCollegeBannerStyle: React.CSSProperties = {
  marginBottom: 14,
  padding: 14,
  borderRadius: 14,
  background: "#fffaf0",
  border: "1px solid #f5d58b",
  color: "#7c5b12",
  fontWeight: 900,
  lineHeight: 1.5,
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
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 16,
  alignItems: "start",
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

const actionPillRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap",
  justifyContent: "flex-end",
  justifySelf: "end",
};

const topRecommendationBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "4px 9px",
  background: "#ecfdf5",
  border: "1px solid #bbf7d0",
  color: "#15803d",
  fontSize: 11,
  fontWeight: 900,
};

const bluePillStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: "6px 12px",
  fontSize: 12,
  fontWeight: 900,
  border: "1px solid #bfdbfe",
  background: "#eff6ff",
  color: "#1e3a8a",
  whiteSpace: "nowrap",
};

const goldPillStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: "6px 12px",
  fontSize: 12,
  fontWeight: 900,
  border: "1px solid #facc15",
  background: "#fffbeb",
  color: "#92400e",
  whiteSpace: "nowrap",
};

const recommendationExplanationStyle: React.CSSProperties = {
  fontSize: 12,
  lineHeight: 1.45,
  color: "#64748b",
  maxWidth: 680,
  minWidth: 0,
};

const matchScoreWrapStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  justifySelf: "end",
  width: "100%",
};

const matchScoreStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: "6px 14px",
  fontSize: 12,
  fontWeight: 900,
  border: "1px solid #86efac",
  background: "#f0fdf4",
  color: "#166534",
  whiteSpace: "nowrap",
};

const confidenceBadgeStyle: React.CSSProperties = {
  marginTop: 6,
  borderRadius: 999,
  padding: "5px 12px",
  fontSize: 11,
  fontWeight: 900,
  border: "1px solid #cbd5e1",
  background: "#f8fafc",
  color: "#334155",
  whiteSpace: "nowrap",
  textAlign: "center",
};

const smallNeutralPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "4px 8px",
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  color: "#334155",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: 0.2,
};

const linkRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 8,
};

const smallLinkStyle: React.CSSProperties = {
  fontSize: 12,
  color: "#0369a1",
  fontWeight: 900,
  textDecoration: "underline",
  textDecorationColor: "#bae6fd",
};

const priorityReasonStyle: React.CSSProperties = {
  marginTop: 10,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #fde68a",
  background: "#fffbeb",
  color: "#78350f",
  fontSize: 13,
  fontWeight: 800,
  lineHeight: 1.45,
};

const rankingReasonBoxStyle: React.CSSProperties = {
  marginTop: 10,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
};

const rankingReasonTitleStyle: React.CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  fontWeight: 950,
  color: "#334155",
  marginBottom: 6,
};

const rankingReasonPillStyle: React.CSSProperties = {
  borderRadius: 999,
  padding: "5px 9px",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  color: "#334155",
  fontSize: 12,
  fontWeight: 800,
};

const highestImpactStyle: React.CSSProperties = {
  marginTop: 10,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #bfdbfe",
  background: "#eff6ff",
  color: "#1e3a8a",
  fontSize: 13,
  fontWeight: 800,
  lineHeight: 1.45,
};

const highestImpactTitleStyle: React.CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  fontWeight: 950,
  color: "#1d4ed8",
  marginBottom: 4,
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

const developmentBoxStyle: React.CSSProperties = {
  marginTop: 10,
  border: "1px solid #e0e7ff",
  background: "#eef2ff",
  borderRadius: 12,
  padding: 12,
};

const developmentTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  color: "#3730a3",
  marginBottom: 6,
};

const developmentLineStyle: React.CSSProperties = {
  fontSize: 13,
  color: "#312e81",
  lineHeight: 1.45,
};

const comparisonBoxStyle: React.CSSProperties = {
  marginTop: 12,
  border: "1px solid #e5e7eb",
  background: "#ffffff",
  borderRadius: 12,
  padding: 12,
};

const comparisonTitleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  color: "#334155",
  marginBottom: 8,
};

const comparisonRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.2fr 1fr 1fr auto",
  gap: 8,
  alignItems: "center",
  fontSize: 12,
};

const comparisonValueStyle: React.CSSProperties = {
  color: "#475569",
  fontWeight: 800,
};

const comparisonStatusStyle: React.CSSProperties = {
  border: "1px solid",
  borderRadius: 999,
  padding: "4px 8px",
  fontSize: 11,
  fontWeight: 900,
  textAlign: "center",
};

const benchmarkSourceStyle: React.CSSProperties = {
  marginTop: 12,
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  borderRadius: 999,
  padding: "7px 11px",
  width: "fit-content",
  color: "#475569",
  fontSize: 12,
  fontWeight: 900,
};

const confidenceTextStyle: React.CSSProperties = {
  color: "#64748b",
  fontWeight: 800,
};