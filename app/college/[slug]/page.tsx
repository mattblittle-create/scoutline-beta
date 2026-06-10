// app/college/[slug]/page.tsx

import Link from "next/link";
import { cookies } from "next/headers";
import CollegeSaveStar from "@/app/components/college/CollegeSaveStar";
import CollegeRecruitingStatusCard from "@/app/components/college/CollegeRecruitingStatusCard";
import SendPlayerCardButton from "./SendPlayerCardButton";
import CopyCoachEmailButton from "./CopyCoachEmailButton";

type PageProps = {
  params: {
    slug: string;
  };
};

type CollegeDetail = {
  id: string;
  name: string;
  slug: string;
  websiteUrl?: string | null;
  admissionsUrl?: string | null;
  academicsUrl?: string | null;
  majorsUrl?: string | null;
  applicationUrl?: string | null;
  financialAidUrl?: string | null;
  programInstagramUrl?: string | null;
  programXUrl?: string | null;
  recruitingQuestionnaireUrl?: string | null;
  city?: string | null;
  state?: string | null;
  region?: string | null;
  control?: string | null;
  schoolType?: string | null;
  tuitionInState?: number | null;
  tuitionOutOfState?: number | null;
  tuitionInternational?: number | null;
  tuitionYear?: number | null;
  enrollmentTotal?: number | null;
  enrollmentUndergrad?: number | null;
  acceptanceRate?: number | string | null;
  graduationRate?: number | string | null;
  dataSourceUrl?: string | null;
  lastVerifiedAt?: string | null;
  verificationStatus?: string | null;
  truthFit?: {
    score: number;
    label: string;
    priority: "HIGH" | "MEDIUM" | "LOW";
    reasons: string[];
    gaps: string[];
    development: string[];
    metricComparisons: Array<{
      key: string;
      label: string;
      playerValue: number;
      benchmarkValue: number;
      unit?: string | null;
      lowerIsBetter: boolean;
      status: "ABOVE" | "IN_RANGE" | "BELOW";
    }>;
    benchmarkSource?: {
      metrics?: {
        level: string;
        label: string;
        confidence: "HIGH" | "MEDIUM" | "LOW";
      };
    };
  } | null;
    similarSchools?: Array<{
    score: number;
    college: {
      id: string;
      name: string;
      slug: string;
      city?: string | null;
      state?: string | null;
      region?: string | null;
      control?: string | null;
      schoolType?: string | null;
      tuitionInState?: number | null;
      tuitionOutOfState?: number | null;
      baseballProgram?: {
        nickname?: string | null;
        division?: string | null;
        conference?: string | null;
        currentRosterSize?: number | null;
      } | null;
    };
  }>;
  academicAreas?: Array<{
    id: string;
    name: string;
  }>;
    nilProfile?: {
    nilAvailable?: boolean | null;
    overallNilStrength?: string | null;
    baseballNilStrength?: string | null;
    nilSummary?: string | null;
    nilNotes?: string | null;
    collectives?: Array<{
      id: string;
      name: string;
      websiteUrl?: string | null;
      fundingTier?: string | null;
      estimatedAnnualValueCents?: number | null;
      sportAllocations?: Array<{
        id: string;
        sport: string;
        allocationPercent?: number | string | null;
        strengthTier?: string | null;
        estimatedAnnualAllocationCents?: number | null;
      }>;
    }>;
  } | null;
    coaches?: Array<{
    id: string;
    name?: string | null;
    email: string;
    workPhone?: string | null;
    workPhoneExt?: string | null;
    phonePrivate?: boolean | null;
    photoUrl?: string | null;
    coachProfile?: {
      staffTitle?: string | null;
      contactEmail?: string | null;
      coachBio?: string | null;
      coachXUrl?: string | null;
      coachInstagramUrl?: string | null;
      isProgramAdmin?: boolean | null;
    } | null;
  }>;
  baseballProgram?: {
    id: string;
    nickname?: string | null;
    logoUrl?: string | null;
    baseballWebsiteUrl?: string | null;
    rosterUrl?: string | null;
    scheduleUrl?: string | null;
    campsUrl?: string | null;
    questionnaireUrl?: string | null;
    generalContactUrl?: string | null;
    generalContactEmail?: string | null;

    recruitingCoordinatorName?: string | null;
    recruitingCoordinatorEmail?: string | null;
    recruitingCoordinatorPhone?: string | null;
    recruitingCoordinatorXUrl?: string | null;
    recruitingCoordinatorInstagramUrl?: string | null;

    division?: string | null;
    conference?: string | null;
    currentRosterSize?: number | null;
    averageGpa?: number | string | null;
    scholarshipNotes?: string | null;
    scholarshipInfoUrl?: string | null;
    recruitingAggressiveness?: string | null;
    regionalRecruitingBias?: string | null;
    rosterTurnoverLevel?: string | null;
    playerDevelopmentNotes?: string | null;
    headCoachTenureYears?: number | null;
    recentWinPercentage?: number | string | null;
    conferenceStrength?: string | null;
    draftHistoryNotes?: string | null;
    transferHeavy?: boolean;
    jucoFriendly?: boolean;
    dataSourceUrl?: string | null;
    lastVerifiedAt?: string | null;
    verificationStatus?: string | null;
    coaches?: Array<{
      id: string;
      name: string;
      title?: string | null;
      email?: string | null;
      phone?: string | null;
      bioUrl?: string | null;
      contactUrl?: string | null;
      headshotUrl?: string | null;
      xUrl?: string | null;
      instagramUrl?: string | null;
      linkedinUrl?: string | null;
      isHeadCoach?: boolean;
    }>;
    rosterNeeds?: Array<{
      id: string;
      gradYear: number;
      position: string;
      needLevel: string;
      notes?: string | null;
      sourceUrl?: string | null;
      lastVerifiedAt?: string | null;
    }>;
    metricAverages?: Array<{
      id: string;
      position: string;
      metricKey: string;
      metricLabel?: string | null;
      averageValue?: number | string | null;
      minValue?: number | string | null;
      maxValue?: number | string | null;
      unit?: string | null;
      sampleSize?: number | null;
      sourceUrl?: string | null;
      lastVerifiedAt?: string | null;
    }>;
  } | null;
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

function numberText(value?: number | null) {
  if (value == null) return "—";
  return value.toLocaleString();
}

function formatPercent(value?: number | string | null) {
  if (value == null || value === "") return "—";

  const n = Number(value);
  if (!Number.isFinite(n)) return "—";

  return `${Math.round(n * 100)}%`;
}

function selectivityTier(value?: number | string | null) {
  if (value == null || value === "") return null;

  const n = Number(value);
  if (!Number.isFinite(n)) return null;

  if (n < 0.15) return "Highly Selective";
  if (n < 0.35) return "Selective";
  if (n < 0.65) return "Moderate";
  return "Accessible";
}

function formatPercentWithTier(value?: number | string | null) {
  const percent = formatPercent(value);
  const tier = selectivityTier(value);

  if (percent === "—") return "—";
  return tier ? `${tier} (${percent})` : percent;
}

function formatDecimal(value?: number | string | null) {
  if (value == null || value === "") return "—";

  const n = Number(value);
  if (!Number.isFinite(n)) return "—";

  return n.toFixed(2).replace(/\.00$/, "");
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type MetricAverage = NonNullable<
  NonNullable<CollegeDetail["baseballProgram"]>["metricAverages"]
>[number];

function metricValue(metric: MetricAverage) {
  const avg = formatDecimal(metric.averageValue);
  const min = formatDecimal(metric.minValue);
  const max = formatDecimal(metric.maxValue);
  const unit = metric.unit ? ` ${metric.unit}` : "";

  if (avg !== "—") return `${avg}${unit}`;
  if (min !== "—" && max !== "—") return `${min}-${max}${unit}`;
  return "—";
}

function comparisonText(item: NonNullable<CollegeDetail["truthFit"]>["metricComparisons"][number]) {
  const unit = item.unit ? ` ${item.unit}` : "";
  const player = Number.isInteger(item.playerValue)
    ? item.playerValue
    : Number(item.playerValue.toFixed(2));
  const benchmark = Number.isInteger(item.benchmarkValue)
    ? item.benchmarkValue
    : Number(item.benchmarkValue.toFixed(2));

  if (item.status === "ABOVE") {
    return item.lowerIsBetter
      ? `${player}${unit} is better than benchmark ${benchmark}${unit}`
      : `${player}${unit} is above benchmark ${benchmark}${unit}`;
  }

  if (item.status === "IN_RANGE") {
    return `${player}${unit} is within range of benchmark ${benchmark}${unit}`;
  }

  return `${player}${unit} trails benchmark ${benchmark}${unit}`;
}

async function getCollege(slug: string): Promise<CollegeDetail | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.myscoutline.com";
  const cookieHeader = cookies().toString();

  const res = await fetch(`${baseUrl}/api/colleges/${encodeURIComponent(slug)}`, {
    cache: "no-store",
    headers: {
      cookie: cookieHeader,
    },
  });

  const data = await res.json();

  if (!res.ok || !data?.ok) return null;

  return data.college;
}

function coachSortRank(coach: {
  title?: string | null;
  isHeadCoach?: boolean;
}) {
  const title = String(coach.title || "").toLowerCase();

  if (coach.isHeadCoach || title === "head coach") return 1;
  if (title.includes("associate head coach")) return 2;
  if (title.includes("assistant head coach")) return 2;
  if (title.includes("assistant coach")) return 3;
  if (title.includes("associate coach")) return 3;
  if (title.includes("pitching")) return 3;
  if (title.includes("hitting")) return 3;
  if (title.includes("infield")) return 3;
  if (title.includes("outfield")) return 3;
  if (title.includes("catching")) return 3;
  if (title.includes("general manager")) return 4;
  if (title.includes("recruiting coordinator")) return 5;

  return 9;
}

export default async function CollegeDetailPage({ params }: PageProps) {
  const college = await getCollege(params.slug);

  if (!college) {
    return (
      <main style={{ maxWidth: 960, margin: "0 auto", padding: 24 }}>
        <h1>College not found</h1>
        <Link href="/dashboard/player/college-search">← Back to College Search</Link>
      </main>
    );
  }

  const baseball = college.baseballProgram;
  const truthFit = college.truthFit;
  const verifiedCoachContacts = [...(baseball?.coaches || [])].sort((a, b) => {
    const rankDiff = coachSortRank(a) - coachSortRank(b);
    if (rankDiff !== 0) return rankDiff;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });

  const scoutLineCoachContacts = (college.coaches || []).map((user) => ({
    id: `user-${user.id}`,
    name: user.name || "Coach",
    title: user.coachProfile?.staffTitle || "Coach",
    email: user.coachProfile?.contactEmail || user.email,
    phone: user.phonePrivate ? null : user.workPhone || null,
    bioUrl: null,
    contactUrl: null,
    headshotUrl: user.photoUrl || null,
    xUrl: user.coachProfile?.coachXUrl || null,
    instagramUrl: user.coachProfile?.coachInstagramUrl || null,
    linkedinUrl: null,
    isHeadCoach: String(user.coachProfile?.staffTitle || "")
      .toLowerCase()
      .includes("head coach"),
    isScoutLineCoach: true,
    isProgramAdmin: !!user.coachProfile?.isProgramAdmin,
  }));

  const hasRecruitingCoordinator = !!(
    baseball?.recruitingCoordinatorName ||
    baseball?.recruitingCoordinatorEmail ||
    baseball?.recruitingCoordinatorPhone ||
    baseball?.recruitingCoordinatorXUrl ||
    baseball?.recruitingCoordinatorInstagramUrl
  );

  const recruitingCoordinatorContact: any = hasRecruitingCoordinator
    ? {
        id: "recruiting-coordinator",
        name: baseball?.recruitingCoordinatorName || "Recruiting Coordinator",
        title: "Recruiting Coordinator",
        email: baseball?.recruitingCoordinatorEmail || null,
        phone: baseball?.recruitingCoordinatorPhone || null,
        bioUrl: null,
        contactUrl: null,
        headshotUrl: null,
        xUrl: baseball?.recruitingCoordinatorXUrl || null,
        instagramUrl: baseball?.recruitingCoordinatorInstagramUrl || null,
        linkedinUrl: null,
        isHeadCoach: false,
        isRecruitingCoordinator: true,
      }
    : null;

  const mergedCoachMap = new Map<string, any>();

  for (const coach of [
    recruitingCoordinatorContact,
    ...scoutLineCoachContacts,
    ...verifiedCoachContacts,
  ].filter(Boolean)) {
    const key =
      String(coach.email || "").trim().toLowerCase() ||
      String(coach.name || "").trim().toLowerCase();

    if (!key) continue;

    if (!mergedCoachMap.has(key)) {
      mergedCoachMap.set(key, coach);
    }
  }

const displayCoaches = Array.from(mergedCoachMap.values()).sort((a, b) => {
  const aIsRc = !!(a as any).isRecruitingCoordinator;
  const bIsRc = !!(b as any).isRecruitingCoordinator;

  if (aIsRc !== bIsRc) return aIsRc ? -1 : 1;

  const rankDiff = coachSortRank(a) - coachSortRank(b);
  if (rankDiff !== 0) return rankDiff;

  return String(a.name || "").localeCompare(String(b.name || ""));
});

  const coachesSectionUrl =
  displayCoaches.find((coach) => coach.contactUrl)?.contactUrl ||
  baseball?.generalContactUrl ||
  baseball?.rosterUrl ||
  baseball?.baseballWebsiteUrl ||
  null;

  const rosterNeeds = baseball?.rosterNeeds || [];
  const metricAverages = baseball?.metricAverages || [];
  const academicAreas = college.academicAreas || [];
  const nilProfile = college.nilProfile || null;
  const nilCollectives = nilProfile?.collectives || [];
  const similarSchools = college.similarSchools || [];

  return (
    <main style={{ color: "#0f172a", fontFamily: "Arial, sans-serif" }}>
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 16px 56px" }}>
        <Link href="/dashboard/player/college-search" style={backLinkStyle}>
          ← Back to College Search
        </Link>

        <div style={heroStyle}>
          <div style={{ display: "flex", gap: 18, alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" }}>
            <div style={{ minWidth: 260, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h1 style={{ margin: 0, fontSize: "clamp(2rem, 5vw, 3.25rem)", fontWeight: 900 }}>
                  {college.name}
                </h1>

                <CollegeSaveStar collegeId={college.id} />
              </div>

              <div style={{ marginTop: 8, color: "#475569", fontWeight: 800 }}>
                {[college.city, college.state].filter(Boolean).join(", ") || "Location TBD"}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                <span style={pillStyle}>{pretty(college.region)}</span>
                <span style={pillStyle}>{pretty(college.control)}</span>
                <span style={pillStyle}>{pretty(college.schoolType)}</span>
                {baseball?.division ? <span style={goldPillStyle}>{pretty(baseball.division)}</span> : null}
                {baseball?.conference ? <span style={goldPillStyle}>{baseball.conference}</span> : null}
              </div>
            </div>

            {baseball?.logoUrl ? (
              <img
                src={baseball.logoUrl}
                alt={`${college.name} logo`}
                style={{
                  width: 92,
                  height: 92,
                  objectFit: "contain",
                  borderRadius: 18,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  padding: 10,
                }}
              />
            ) : null}
          </div>
        </div>

        <CollegeRecruitingStatusCard
          collegeId={college.id}
          collegeName={college.name}
        />

        <section style={{ ...cardStyle, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div>
              <h2 style={sectionTitleStyle}>Truth Fit Breakdown</h2>
              <p style={{ margin: "0 0 12px", color: "#64748b", fontWeight: 800, lineHeight: 1.5 }}>
                Personalized fit analysis based on your player profile, academics, roster needs, and available benchmark data.
              </p>
            </div>

            {truthFit ? (
              <div style={scoreBadgeStyle}>
                <div style={{ fontSize: 34, fontWeight: 950, lineHeight: 1 }}>{truthFit.score}</div>
                <div style={{ fontSize: 12, fontWeight: 900 }}>{truthFit.label}</div>
              </div>
            ) : null}
          </div>

          {truthFit ? (
            <>
<div style={gridStyle}>
  <Info label="Fit Label" value={truthFit.label} />
  <Info label="Priority" value={truthFit.priority} />
  <Info label="Benchmark Source" value={truthFit.benchmarkSource?.metrics?.label || "Estimated"} />
  <Info label="Confidence" value={truthFit.benchmarkSource?.metrics?.confidence || "LOW"} />
</div>

<div style={outlookGridStyle}>
  <div style={outlookCardStyle}>
    <div style={outlookLabelStyle}>Projected Recruiting Lane</div>
    <div style={outlookValueStyle}>
      {truthFit.score >= 90
        ? "High-Level Recruit"
        : truthFit.score >= 75
        ? "Strong College Fit"
        : truthFit.score >= 60
        ? "Developmental Prospect"
        : "Long-Term Development"}
    </div>
  </div>

  <div style={outlookCardStyle}>
    <div style={outlookLabelStyle}>Strongest Attribute</div>
    <div style={outlookValueStyle}>
      {truthFit.metricComparisons?.find((m) => m.status === "ABOVE")?.label ||
        "Academic / roster fit"}
    </div>
  </div>

  <div style={outlookCardStyle}>
    <div style={outlookLabelStyle}>Top Development Area</div>
    <div style={outlookValueStyle}>
      {truthFit.metricComparisons?.find((m) => m.status === "BELOW")?.label ||
        "Continue overall development"}
    </div>
  </div>

  <div style={outlookCardStyle}>
    <div style={outlookLabelStyle}>Best Current Division Fit</div>
    <div style={outlookValueStyle}>
      {pretty(baseball?.division) || "Unknown"}
    </div>
  </div>
</div>

              <div style={truthGridStyle}>
                <TruthList title="Why This Fits" items={truthFit.reasons} empty="No positive fit reasons available yet." />
                <TruthList title="Gaps to Watch" items={truthFit.gaps} empty="No major gaps identified yet." />
                <TruthList title="Next Development Steps" items={truthFit.development} empty="No development steps available yet." />
              </div>
              {truthFit.metricComparisons?.length ? (
  <div style={{ marginTop: 14 }}>
    <h3 style={subTitleStyle}>Compare Me</h3>

    <p style={compareIntroStyle}>
      See how your current profile stacks up against this program’s available benchmark data.
    </p>

    <div style={{ display: "grid", gap: 8 }}>
      {truthFit.metricComparisons.map((item) => (
        <div key={item.key} style={miniCardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <strong>{item.label}</strong>

            <span
              style={
                item.status === "ABOVE"
                  ? statusGoodStyle
                  : item.status === "IN_RANGE"
                  ? statusMidStyle
                  : statusGapStyle
              }
            >
              {item.status.replace(/_/g, " ")}
            </span>
          </div>

          <div style={compareRowStyle}>
            <div>
              <div style={compareLabelStyle}>You</div>

              <div style={compareValueStyle}>
                {Number.isInteger(item.playerValue)
                  ? item.playerValue
                  : Number(item.playerValue.toFixed(2))}
                {item.unit ? ` ${item.unit}` : ""}
              </div>
            </div>

            <div>
              <div style={compareLabelStyle}>Benchmark</div>

              <div style={compareValueStyle}>
                {Number.isInteger(item.benchmarkValue)
                  ? item.benchmarkValue
                  : Number(item.benchmarkValue.toFixed(2))}
                {item.unit ? ` ${item.unit}` : ""}
              </div>
            </div>

            <div>
              <div style={compareLabelStyle}>Read</div>

              <div style={compareTextStyle}>
                {comparisonText(item)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
) : null}
            </>
          ) : (
            <EmptyState text="Log in as a player with a completed profile to see a personalized Truth Fit breakdown for this school." />
          )}
        </section>

        <div style={gridStyle}>
          <section style={cardStyle}>
            <h2 style={sectionTitleStyle}>General School Info</h2>

            <Info label="In-State Tuition" value={money(college.tuitionInState)} />
            <Info label="Out-of-State Tuition" value={money(college.tuitionOutOfState)} />
            <Info label="International Tuition" value={money(college.tuitionInternational)} />
            <Info label="Tuition Year" value={college.tuitionYear?.toString?.() || "—"} />
            <Info label="Enrollment" value={numberText(college.enrollmentTotal)} />
            <Info label="Undergrad Enrollment" value={numberText(college.enrollmentUndergrad)} />
            <Info label="Acceptance Rate" value={formatPercentWithTier(college.acceptanceRate)} />
            <Info label="Graduation Rate" value={formatPercent(college.graduationRate)} />

            <div style={buttonRowStyle}>
              {college.websiteUrl ? <ExternalButton href={college.websiteUrl}>School Website</ExternalButton> : null}
              {college.admissionsUrl ? <ExternalButton href={college.admissionsUrl}>Admissions</ExternalButton> : null}
              {college.applicationUrl ? <ExternalButton href={college.applicationUrl}>Apply</ExternalButton> : null}
              {college.financialAidUrl ? <ExternalButton href={college.financialAidUrl}>Financial Aid</ExternalButton> : null}
              {college.majorsUrl ? <ExternalButton href={college.majorsUrl}>Majors</ExternalButton> : null}
            </div>
          </section>

          <section style={cardStyle}>
            <div style={sectionTitleRowStyle}>
  <h2 style={sectionTitleStyle}>Baseball Program</h2>
  {(() => {
    const badge = getVerificationBadge(
  baseball?.verificationStatus,
  baseball?.dataSourceUrl || baseball?.baseballWebsiteUrl
);
    return (
  <span style={badge.style} title={badge.title}>
    {badge.label}
  </span>
);
  })()}
</div>

            <Info label="Nickname" value={baseball?.nickname || "—"} />
            <Info label="Division" value={pretty(baseball?.division)} />
            <Info label="Conference" value={baseball?.conference || "—"} />
            <Info label="Current Roster Size" value={baseball?.currentRosterSize?.toString?.() || "—"} />
            <Info label="Average GPA" value={formatDecimal(baseball?.averageGpa)} />
            <Info label="Transfer Heavy" value={baseball?.transferHeavy ? "Yes" : "No"} />
            <Info label="JUCO Friendly" value={baseball?.jucoFriendly ? "Yes" : "No"} />

            {baseball?.scholarshipNotes ? (
              <div style={noteStyle}>
                <strong>Scholarship Notes:</strong> {baseball.scholarshipNotes}
              </div>
            ) : null}

            <div style={buttonRowStyle}>
<div style={buttonRowStyle}>
{college.programXUrl ? (
  <a
    href={college.programXUrl}
    target="_blank"
    rel="noreferrer"
    title="Program X"
    style={{ display: "inline-flex", alignItems: "center" }}
  >
    <img
      src="/icons/x.webp"
      alt="X"
      style={{ width: 20, height: 20 }}
    />
  </a>
) : null}

{college.programInstagramUrl ? (
  <a
    href={college.programInstagramUrl}
    target="_blank"
    rel="noreferrer"
    title="Program Instagram"
    style={{ display: "inline-flex", alignItems: "center" }}
  >
    <img
      src="/icons/instagram.webp"
      alt="Instagram"
      style={{ width: 20, height: 20 }}
    />
  </a>
) : null}

  {baseball?.baseballWebsiteUrl ? (
    <ExternalButton href={baseball.baseballWebsiteUrl}>Baseball Website</ExternalButton>
  ) : null}

  {(baseball?.questionnaireUrl || college.recruitingQuestionnaireUrl) ? (
    <ExternalButton href={baseball?.questionnaireUrl || college.recruitingQuestionnaireUrl || ""}>
      Recruiting Questionnaire
    </ExternalButton>
  ) : null}

  {baseball?.rosterUrl ? (
    <ExternalButton href={baseball.rosterUrl}>Roster</ExternalButton>
  ) : null}

  {baseball?.scheduleUrl ? (
    <ExternalButton href={baseball.scheduleUrl}>Schedule</ExternalButton>
  ) : null}

  {baseball?.campsUrl ? (
    <ExternalButton href={baseball.campsUrl}>Camps</ExternalButton>
  ) : null}

  {baseball?.scholarshipInfoUrl ? (
    <ExternalButton href={baseball.scholarshipInfoUrl}>Scholarship Info</ExternalButton>
  ) : null}
</div>
            </div>
          </section>
        </div>

        <section style={{ ...cardStyle, marginBottom: 16 }}>
          <h2 style={sectionTitleStyle}>Recruiting Intelligence</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              gap: 10,
            }}
          >
            <Info
              label="Recruiting Aggressiveness"
              value={pretty(baseball?.recruitingAggressiveness)}
            />

            <Info
              label="Regional Recruiting Bias"
              value={pretty(baseball?.regionalRecruitingBias)}
            />

            <Info
              label="Roster Turnover"
              value={pretty(baseball?.rosterTurnoverLevel)}
            />

            <Info
              label="Head Coach Tenure"
              value={
                baseball?.headCoachTenureYears != null
                  ? `${baseball.headCoachTenureYears} year${
                      baseball.headCoachTenureYears === 1 ? "" : "s"
                    }`
                  : "—"
              }
            />

<Info
  label="Recent Win %"
  value={
    baseball?.recentWinPercentage != null
      ? String(baseball.recentWinPercentage)
      : "—"
  }
/>

            <Info
              label="Conference Strength"
              value={pretty(baseball?.conferenceStrength)}
            />
          </div>

          {baseball?.playerDevelopmentNotes ? (
            <div style={{ ...miniInfoBoxStyle, marginTop: 14 }}>
              <div style={{ fontWeight: 900, color: "#0f172a" }}>
                Player Development Notes
              </div>
              <p
                style={{
                  margin: "6px 0 0",
                  color: "#475569",
                  fontWeight: 700,
                  lineHeight: 1.5,
                }}
              >
                {baseball.playerDevelopmentNotes}
              </p>
            </div>
          ) : null}

          {baseball?.draftHistoryNotes ? (
            <div style={{ ...miniInfoBoxStyle, marginTop: 10 }}>
              <div style={{ fontWeight: 900, color: "#0f172a" }}>
                Draft / Pro Development Notes
              </div>
              <p
                style={{
                  margin: "6px 0 0",
                  color: "#475569",
                  fontWeight: 700,
                  lineHeight: 1.5,
                }}
              >
                {baseball.draftHistoryNotes}
              </p>
            </div>
          ) : null}
        </section>

        <div style={wideGridStyle}>
          <section style={cardStyle}>
            {coachesSectionUrl ? (
              <a
                href={coachesSectionUrl}
                target="_blank"
                rel="noreferrer"
                style={sectionTitleLinkStyle}
              >
                Coaches & Recruiting Contacts
              </a>
            ) : (
              <h2 style={sectionTitleStyle}>Coaches & Recruiting Contacts</h2>
            )}

            {displayCoaches.length ? (
              <div style={coachListScrollStyle}>
                {displayCoaches.map((coach) => (
                  <div key={coach.id} style={miniCardStyle}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      {coach.headshotUrl ? (
                        <img
                          src={coach.headshotUrl}
                          alt={`${coach.name} headshot`}
                          style={coachHeadshotStyle}
                        />
                      ) : (
                        <div style={coachHeadshotFallbackStyle}>
                          {coach.name
                            .split(" ")
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((part: string) => part[0])
                            .join("")
                            .toUpperCase()}
                        </div>
                      )}

<div style={{ flex: 1, minWidth: 0 }}>

  <div style={coachTopRowStyle}>
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ fontWeight: 900, fontSize: 18 }}>
        {coach.name}

        {coach.title ? (
          <span
            style={{
              marginLeft: 8,
              color: "#64748b",
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            {coach.title}
          </span>
        ) : null}
      </div>

      {(coach as any).isRecruitingCoordinator ? (
        <span style={smallGoldPillStyle}>
          Primary Recruiting Contact
        </span>
      ) : null}
    </div>
  </div>

  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
      marginTop: 4,
      color: "#64748b",
      fontSize: 13,
      fontWeight: 800,
    }}
  >
    {coach.xUrl ? (
      <a
        href={coach.xUrl}
        target="_blank"
        rel="noreferrer"
        title="Coach X"
        style={{ display: "inline-flex" }}
      >
        <img
          src="/icons/x.webp"
          alt="X"
          style={{ width: 18, height: 18 }}
        />
      </a>
    ) : null}

    {coach.instagramUrl ? (
      <a
        href={coach.instagramUrl}
        target="_blank"
        rel="noreferrer"
        title="Coach Instagram"
        style={{ display: "inline-flex" }}
      >
        <img
          src="/icons/instagram.webp"
          alt="Instagram"
          style={{ width: 18, height: 18 }}
        />
      </a>
    ) : null}
  </div>

  <div
    style={{
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      alignItems: "center",
      marginTop: 8,
    }}
  >
    <SendPlayerCardButton
      collegeSlug={college.slug}
      coachId={coach.id}
      coachName={coach.name || ""}
      coachEmail={coach.email}
      style={buttonStyle}
    />

    {coach.email ? (
      <ExternalButton href={`mailto:${coach.email}`} title={coach.email}>
        Email
      </ExternalButton>
    ) : null}

    {coach.email ? (
      <CopyCoachEmailButton
        email={coach.email}
        style={buttonStyle}
      />
    ) : null}

    {coach.bioUrl ? (
      <ExternalButton href={coach.bioUrl}>
        Bio
      </ExternalButton>
    ) : null}
  </div>

  <div style={{ marginTop: 8 }}>
    {(() => {
      const badge = getCoachContactBadge(coach);

      return (
        <span style={badge.style} title={badge.title}>
          Coach Contact: {badge.label}
        </span>
      );
    })()}
  </div>
</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState text="No coach contacts have been added yet." />
            )}
          </section>

          <section style={cardStyle}>
            <h2 style={sectionTitleStyle}>Academic Areas</h2>

            {academicAreas.length ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {academicAreas.map((area) => (
                  <span key={area.id} style={pillStyle}>
                    {area.name}
                  </span>
                ))}
              </div>
            ) : (
              <EmptyState text="No academic areas have been added yet." />
            )}
          </section>
        </div>

        <div style={wideGridStyle}>
          <section style={cardStyle}>
            <h2 style={sectionTitleStyle}>Roster Needs</h2>

            {rosterNeeds.length ? (
              <div style={{ overflowX: "auto" }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <Th>Grad Year</Th>
                      <Th>Position</Th>
                      <Th>Need</Th>
                      <Th>Notes</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {rosterNeeds.map((need) => (
                      <tr key={need.id}>
                        <Td>{need.gradYear}</Td>
                        <Td>{need.position}</Td>
                        <Td>{pretty(need.needLevel)}</Td>
                        <Td>{need.notes || "—"}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState text="No roster needs have been added yet." />
            )}
          </section>

          <section style={cardStyle}>
            <h2 style={sectionTitleStyle}>Program Metric Averages</h2>

            {metricAverages.length ? (
              <div style={{ overflowX: "auto" }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <Th>Position</Th>
                      <Th>Metric</Th>
                      <Th>Average</Th>
                      <Th>Sample</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {metricAverages.map((metric) => (
                      <tr key={metric.id}>
                        <Td>{metric.position}</Td>
                        <Td>{metric.metricLabel || pretty(metric.metricKey)}</Td>
                        <Td>{metricValue(metric)}</Td>
                        <Td>{metric.sampleSize?.toString?.() || "—"}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState text="No program-specific metric averages have been added yet." />
            )}
          </section>
        </div>

        <section style={{ ...cardStyle, marginTop: 16 }}>
          <h2 style={sectionTitleStyle}>NIL</h2>

          {nilProfile ? (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 10,
                }}
              >
                <Info
                  label="Baseball NIL Strength"
                  value={pretty(nilProfile.baseballNilStrength)}
                />

                <Info
                  label="Overall NIL Strength"
                  value={pretty(nilProfile.overallNilStrength)}
                />

                <Info
                  label="NIL Available"
                  value={nilProfile.nilAvailable ? "Yes" : "No"}
                />
              </div>

              {nilCollectives.length ? (
                <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                  {nilCollectives.map((collective) => (
                    <div key={collective.id} style={miniInfoBoxStyle}>
                      <div style={{ fontWeight: 900 }}>
                        {collective.name}
                      </div>

                      <div
                        style={{
                          marginTop: 4,
                          color: "#64748b",
                          fontWeight: 800,
                          fontSize: 13,
                        }}
                      >
                        Funding Tier: {pretty(collective.fundingTier)}
                      </div>

                      {collective.sportAllocations?.length ? (
                        <div
                          style={{
                            marginTop: 8,
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          {collective.sportAllocations
                            .filter((a) => a.sport === "BASEBALL")
                            .map((allocation) => (
                              <span key={allocation.id} style={pillStyle}>
                                Baseball: {pretty(allocation.strengthTier)}
                                {allocation.allocationPercent
                                  ? ` · ${allocation.allocationPercent}%`
                                  : ""}
                              </span>
                            ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}

              {nilProfile.nilSummary ? (
                <p
                  style={{
                    margin: "12px 0 0",
                    color: "#475569",
                    fontWeight: 700,
                    lineHeight: 1.5,
                  }}
                >
                  {nilProfile.nilSummary}
                </p>
              ) : null}
            </>
          ) : (
            <EmptyState text="No NIL information has been added yet." />
          )}
        </section>

        <section style={{ ...cardStyle, marginTop: 16 }}>
          <h2 style={sectionTitleStyle}>Similar Schools</h2>

          {similarSchools.length ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 12,
              }}
            >
              {similarSchools.map((item) => {
                const s = item.college;

                return (
                  <Link
                    key={s.id}
                    href={`/college/${s.slug}`}
                    style={{
                      textDecoration: "none",
                      color: "#0f172a",
                    }}
                  >
                    <div
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: 16,
                        padding: 14,
                        background: "#fff",
                        height: "100%",
                        transition: "all 0.15s ease",
                        boxShadow: "0 4px 12px rgba(15,23,42,0.05)",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 900,
                          fontSize: 16,
                          marginBottom: 4,
                        }}
                      >
                        {s.name}
                      </div>

                      <div
                        style={{
                          color: "#64748b",
                          fontSize: 13,
                          fontWeight: 800,
                          marginBottom: 10,
                        }}
                      >
                        {[s.city, s.state].filter(Boolean).join(", ")}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          flexWrap: "wrap",
                          marginBottom: 10,
                        }}
                      >
                        {s.baseballProgram?.division ? (
                          <span style={goldPillStyle}>
                            {pretty(s.baseballProgram.division)}
                          </span>
                        ) : null}

                        {s.region ? (
                          <span style={pillStyle}>
                            {pretty(s.region)}
                          </span>
                        ) : null}
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          color: "#475569",
                          fontWeight: 800,
                          lineHeight: 1.5,
                        }}
                      >
                        {s.baseballProgram?.conference || "Conference TBD"}
                      </div>

                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 12,
                          color: "#475569",
                          fontWeight: 800,
                        }}
                      >
                        Tuition: {money(s.tuitionOutOfState ?? s.tuitionInState)}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState text="No similar schools found yet." />
          )}
        </section>

<section style={{ ...cardStyle, marginTop: 16 }}>
  <h2 style={sectionTitleStyle}>Data Verification</h2>

  <div style={{ display: "grid", gap: 8 }}>
    {(() => {
      const badge = getVerificationBadge(
        college.verificationStatus,
        college.dataSourceUrl || college.websiteUrl
      );

      return (
        <div style={verificationRowStyle}>
          <span style={verificationLabelStyle}>General School</span>
          <span style={badge.style} title={badge.title}>
            {badge.label}
          </span>
        </div>
      );
    })()}

    {(() => {
      const badge = getVerificationBadge(
        baseball?.verificationStatus,
        baseball?.dataSourceUrl || baseball?.baseballWebsiteUrl
      );

      return (
        <div style={verificationRowStyle}>
          <span style={verificationLabelStyle}>Baseball Program</span>
          <span style={badge.style} title={badge.title}>
            {badge.label}
          </span>
        </div>
      );
    })()}

    {(() => {
      const hasOfficialCoachSource = displayCoaches.some(
        (coach) => coach.email || coach.bioUrl || coach.contactUrl
      );

      const badge = hasOfficialCoachSource
        ? {
            label: "Official Source",
            title: "Contact information compiled from official school / program source",
            style: officialSiteBadgeStyle,
          }
        : {
            label: "Unverified",
            title: "Outdated / unknown source",
            style: unverifiedBadgeStyle,
          };

      return (
        <div style={verificationRowStyle}>
          <span style={verificationLabelStyle}>Coach Contacts</span>
          <span style={badge.style} title={badge.title}>
            {badge.label}
          </span>
        </div>
      );
    })()}
  </div>

  <div style={{ ...buttonRowStyle, marginTop: 12 }}>
    {college.dataSourceUrl ? (
      <ExternalButton href={college.dataSourceUrl}>School Data Source</ExternalButton>
    ) : null}

    {baseball?.dataSourceUrl ? (
      <ExternalButton href={baseball.dataSourceUrl}>Program Data Source</ExternalButton>
    ) : null}

    {baseball?.generalContactUrl ? (
      <ExternalButton href={baseball.generalContactUrl}>General Contact</ExternalButton>
    ) : null}

    {baseball?.generalContactEmail ? (
      <ExternalButton href={`mailto:${baseball.generalContactEmail}`}>Program Email</ExternalButton>
    ) : null}
  </div>
</section>
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

function EmptyState({ text }: { text: string }) {
  return (
    <div style={emptyStyle}>
      {text}
    </div>
  );
}

function TruthList({
  title,
  items,
  empty,
}: {
  title: string;
  items?: string[];
  empty: string;
}) {
  return (
    <div style={miniCardStyle}>
      <h3 style={subTitleStyle}>{title}</h3>

      {items?.length ? (
        <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 7 }}>
          {items.map((item) => (
            <li key={item} style={{ color: "#334155", fontWeight: 800, lineHeight: 1.45 }}>
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <div style={{ color: "#64748b", fontWeight: 800 }}>{empty}</div>
      )}
    </div>
  );
}

function getVerificationBadge(status?: string | null, sourceUrl?: string | null) {
  const normalized = String(status || "").trim().toUpperCase();

  if (normalized === "VERIFIED") {
    return {
      label: "Program Verified",
      title: "Coach / program staff confirmed",
      style: verifiedBadgeStyle,
    };
  }

  if (sourceUrl) {
    return {
      label: "Official Source",
      title: "Data compiled from official school / program sources",
      style: officialSiteBadgeStyle,
    };
  }

  if (normalized === "NEEDS_REVIEW") {
    return {
      label: "Needs Review",
      title: "Imported / enriched but not fully reviewed and verified",
      style: needsReviewBadgeStyle,
    };
  }

  return {
    label: "Unverified",
    title: "Outdated / unknown source",
    style: unverifiedBadgeStyle,
  };
}

function getCoachContactBadge(coach: {
  email?: string | null;
  bioUrl?: string | null;
  contactUrl?: string | null;
  verificationStatus?: string | null;
}) {
  const normalized = String(coach.verificationStatus || "").trim().toUpperCase();

  if (normalized === "VERIFIED") {
    return {
      label: "Verified",
      title: "Coach verified contact information",
      style: verifiedBadgeStyle,
    };
  }

  if (coach.email || coach.bioUrl || coach.contactUrl) {
    return {
      label: "Official Source",
      title: "Contact information compiled from official school / program source",
      style: officialSiteBadgeStyle,
    };
  }

  return {
    label: "Unverified",
    title: "Outdated / unknown source",
    style: unverifiedBadgeStyle,
  };
}

function CoachSocialLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a href={href} target="_blank" rel="noreferrer" style={coachSocialLinkStyle}>
      {children}
    </a>
  );
}

function ExternalButton({
  href,
  children,
  title,
}: {
  href: string;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <a href={href} title={title} target="_blank" rel="noreferrer" style={buttonStyle}>
      {children}
    </a>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th style={thStyle}>{children}</th>;
}

function Td({ children }: { children: React.ReactNode }) {
  return <td style={tdStyle}>{children}</td>;
}

const backLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 16,
  color: "#ffffff",
  background: "#0ea5e9",
  border: "1px solid #0ea5e9",
  borderRadius: 999,
  padding: "9px 13px",
  textDecoration: "none",
  fontWeight: 900,
};

const heroStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 22,
  background: "#ffffff",
  padding: 22,
  boxShadow: "0 10px 28px rgba(15,23,42,0.08)",
  marginBottom: 16,
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 12,
};

const wideGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
  gap: 16,
  marginTop: 16,
};

const cardStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  background: "#ffffff",
  padding: 18,
  boxShadow: "0 8px 20px rgba(15,23,42,0.05)",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: "0 0 12px",
  fontSize: "1.25rem",
  fontWeight: 900,
};

const infoStyle: React.CSSProperties = {
  border: "1px solid #eef2f7",
  background: "#f8fafc",
  borderRadius: 12,
  padding: "10px 12px",
};

const noteStyle: React.CSSProperties = {
  border: "1px solid #fde68a",
  background: "#fffbeb",
  borderRadius: 12,
  padding: "10px 12px",
  marginTop: 10,
  color: "#78350f",
  fontSize: 13,
  lineHeight: 1.45,
};

const emptyStyle: React.CSSProperties = {
  border: "1px dashed #cbd5e1",
  background: "#f8fafc",
  borderRadius: 14,
  padding: 14,
  color: "#64748b",
  fontWeight: 800,
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

const miniInfoBoxStyle: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  background: "#f8fafc",
  padding: 12,
};

const goldPillStyle: React.CSSProperties = {
  ...pillStyle,
  background: "#fffbeb",
  border: "1px solid #fde68a",
  color: "#78350f",
};

const smallGoldPillStyle: React.CSSProperties = {
  ...goldPillStyle,
  padding: "4px 8px",
  fontSize: 11,
  lineHeight: 1,
};

const smallGoldTagStyle: React.CSSProperties = {
  display: "inline-flex",
  marginLeft: 8,
  borderRadius: 999,
  padding: "3px 7px",
  background: "#fffbeb",
  border: "1px solid #fde68a",
  color: "#78350f",
  fontSize: 11,
  fontWeight: 900,
};

const buttonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 14,
};

const buttonStyle: React.CSSProperties = {
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
  fontSize: 13,
};

const miniCardStyle: React.CSSProperties = {
  border: "1px solid #eef2f7",
  background: "#f8fafc",
  borderRadius: 14,
  padding: 12,
};

const truthGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 12,
  marginTop: 14,
};

const outlookGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
  marginTop: 14,
};

const outlookCardStyle: React.CSSProperties = {
  borderRadius: 16,
  padding: "14px 16px",
  background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
  color: "#ffffff",
  boxShadow: "0 8px 20px rgba(15,23,42,0.15)",
};

const outlookLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: 0.5,
  textTransform: "uppercase",
  opacity: 0.72,
  marginBottom: 6,
};

const outlookValueStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 950,
  lineHeight: 1.3,
};

const scoreBadgeStyle: React.CSSProperties = {
  minWidth: 112,
  borderRadius: 18,
  background: "#0f172a",
  color: "#ffffff",
  padding: "14px 16px",
  textAlign: "center",
  boxShadow: "0 10px 24px rgba(15,23,42,0.18)",
};

const subTitleStyle: React.CSSProperties = {
  margin: "0 0 9px",
  fontSize: "0.95rem",
  fontWeight: 950,
};

const compareIntroStyle: React.CSSProperties = {
  margin: "-3px 0 10px",
  color: "#64748b",
  fontSize: 13,
  fontWeight: 800,
  lineHeight: 1.45,
};

const compareRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "110px 130px 1fr",
  gap: 12,
  alignItems: "center",
  marginTop: 10,
};

const compareLabelStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#64748b",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: 0.4,
};

const compareValueStyle: React.CSSProperties = {
  marginTop: 3,
  fontSize: 18,
  fontWeight: 950,
  color: "#0f172a",
};

const compareTextStyle: React.CSSProperties = {
  marginTop: 3,
  color: "#475569",
  fontWeight: 800,
  fontSize: 13,
  lineHeight: 1.45,
};

const statusGoodStyle: React.CSSProperties = {
  ...smallGoldTagStyle,
  background: "#ecfdf5",
  border: "1px solid #bbf7d0",
  color: "#166534",
};

const statusMidStyle: React.CSSProperties = {
  ...smallGoldTagStyle,
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1d4ed8",
};

const statusGapStyle: React.CSSProperties = {
  ...smallGoldTagStyle,
  background: "#fff1f2",
  border: "1px solid #fecdd3",
  color: "#be123c",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  fontSize: 13,
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  color: "#64748b",
  fontSize: 12,
  fontWeight: 900,
  borderBottom: "1px solid #e5e7eb",
  padding: "8px 8px",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  borderBottom: "1px solid #f1f5f9",
  padding: "9px 8px",
  fontWeight: 800,
  verticalAlign: "top",
};

const sectionTitleLinkStyle: React.CSSProperties = {
  ...sectionTitleStyle,
  display: "inline-flex",
  color: "#0f172a",
  textDecoration: "none",
};

const coachHeadshotStyle: React.CSSProperties = {
  width: 58,
  height: 58,
  borderRadius: 16,
  objectFit: "contain",
  objectPosition: "center top",
  border: "1px solid #e5e7eb",
  background: "#ffffff",
  flexShrink: 0,
};

const coachHeadshotFallbackStyle: React.CSSProperties = {
  ...coachHeadshotStyle,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 950,
  color: "#92400e",
  background: "#fff7ed",
};

const coachSocialLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 24,
  height: 24,
  padding: "0 7px",
  borderRadius: 999,
  border: "1px solid #e5e7eb",
  background: "#ffffff",
  color: "#0f172a",
  fontSize: 11,
  fontWeight: 950,
  textDecoration: "none",
};

const coachTopRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
};

const sectionTitleRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
};

const baseTrustBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "4px 8px",
  fontSize: 11,
  fontWeight: 950,
  border: "1px solid transparent",
};

const verifiedBadgeStyle: React.CSSProperties = {
  ...baseTrustBadgeStyle,
  background: "#ecfdf5",
  color: "#047857",
  borderColor: "#a7f3d0",
};

const needsReviewBadgeStyle: React.CSSProperties = {
  ...baseTrustBadgeStyle,
  background: "#fffbeb",
  color: "#92400e",
  borderColor: "#fde68a",
};

const unverifiedBadgeStyle: React.CSSProperties = {
  ...baseTrustBadgeStyle,
  background: "#f8fafc",
  color: "#475569",
  borderColor: "#e2e8f0",
};

const officialSiteBadgeStyle: React.CSSProperties = {
  ...baseTrustBadgeStyle,
  background: "#eff6ff",
  color: "#1d4ed8",
  borderColor: "#bfdbfe",
};

const verificationRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "8px 0",
  borderBottom: "1px solid #e5e7eb",
};

const verificationLabelStyle: React.CSSProperties = {
  color: "#334155",
  fontSize: 13,
  fontWeight: 900,
};

const coachListScrollStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
  maxHeight: 185,
  overflowY: "auto",
  paddingRight: 4,
};