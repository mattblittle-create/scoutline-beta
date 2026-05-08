// app/college/[slug]/page.tsx

import Link from "next/link";
import CollegeSaveStar from "@/app/components/college/CollegeSaveStar";

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
  academicAreas?: Array<{
    id: string;
    name: string;
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
    division?: string | null;
    conference?: string | null;
    currentRosterSize?: number | null;
    averageGpa?: number | string | null;
    scholarshipNotes?: string | null;
    scholarshipInfoUrl?: string | null;
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

function metricValue(metric: NonNullable<CollegeDetail["baseballProgram"]>["metricAverages"][number]) {
  const avg = formatDecimal(metric.averageValue);
  const min = formatDecimal(metric.minValue);
  const max = formatDecimal(metric.maxValue);
  const unit = metric.unit ? ` ${metric.unit}` : "";

  if (avg !== "—") return `${avg}${unit}`;
  if (min !== "—" && max !== "—") return `${min}-${max}${unit}`;
  return "—";
}

async function getCollege(slug: string): Promise<CollegeDetail | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.myscoutline.com";

  const res = await fetch(`${baseUrl}/api/colleges/${encodeURIComponent(slug)}`, {
    cache: "no-store",
  });

  const data = await res.json();

  if (!res.ok || !data?.ok) return null;

  return data.college;
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
  const coaches = baseball?.coaches || [];
  const rosterNeeds = baseball?.rosterNeeds || [];
  const metricAverages = baseball?.metricAverages || [];
  const academicAreas = college.academicAreas || [];

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
            <h2 style={sectionTitleStyle}>Baseball Program</h2>

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
              {baseball?.baseballWebsiteUrl ? <ExternalButton href={baseball.baseballWebsiteUrl}>Baseball Website</ExternalButton> : null}
              {baseball?.rosterUrl ? <ExternalButton href={baseball.rosterUrl}>Roster</ExternalButton> : null}
              {baseball?.scheduleUrl ? <ExternalButton href={baseball.scheduleUrl}>Schedule</ExternalButton> : null}
              {baseball?.questionnaireUrl ? <ExternalButton href={baseball.questionnaireUrl}>Recruiting Questionnaire</ExternalButton> : null}
              {baseball?.campsUrl ? <ExternalButton href={baseball.campsUrl}>Camps</ExternalButton> : null}
              {baseball?.scholarshipInfoUrl ? <ExternalButton href={baseball.scholarshipInfoUrl}>Scholarship Info</ExternalButton> : null}
            </div>
          </section>
        </div>

        <div style={wideGridStyle}>
          <section style={cardStyle}>
            <h2 style={sectionTitleStyle}>Coaches & Recruiting Contacts</h2>

            {coaches.length ? (
              <div style={{ display: "grid", gap: 10 }}>
                {coaches.map((coach) => (
                  <div key={coach.id} style={miniCardStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ fontWeight: 950 }}>
                          {coach.name}
                          {coach.isHeadCoach ? <span style={smallGoldTagStyle}>Head Coach</span> : null}
                        </div>
                        <div style={{ color: "#64748b", fontSize: 13, fontWeight: 800 }}>
                          {coach.title || "Coach"}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {coach.email ? <ExternalButton href={`mailto:${coach.email}`}>Email</ExternalButton> : null}
                        {coach.bioUrl ? <ExternalButton href={coach.bioUrl}>Bio</ExternalButton> : null}
                        {coach.contactUrl ? <ExternalButton href={coach.contactUrl}>Contact</ExternalButton> : null}
                      </div>
                    </div>

                    {coach.phone ? (
                      <div style={{ marginTop: 8, color: "#475569", fontWeight: 800, fontSize: 13 }}>
                        {coach.phone}
                      </div>
                    ) : null}
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
          <h2 style={sectionTitleStyle}>Data Verification</h2>

          <div style={gridStyle}>
            <Info label="School Verification" value={pretty(college.verificationStatus)} />
            <Info label="School Last Verified" value={formatDate(college.lastVerifiedAt)} />
            <Info label="Program Verification" value={pretty(baseball?.verificationStatus)} />
            <Info label="Program Last Verified" value={formatDate(baseball?.lastVerifiedAt)} />
          </div>

          <div style={buttonRowStyle}>
            {college.dataSourceUrl ? <ExternalButton href={college.dataSourceUrl}>School Data Source</ExternalButton> : null}
            {baseball?.dataSourceUrl ? <ExternalButton href={baseball.dataSourceUrl}>Program Data Source</ExternalButton> : null}
            {baseball?.generalContactUrl ? <ExternalButton href={baseball.generalContactUrl}>General Contact</ExternalButton> : null}
            {baseball?.generalContactEmail ? <ExternalButton href={`mailto:${baseball.generalContactEmail}`}>Program Email</ExternalButton> : null}
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

function ExternalButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" style={buttonStyle}>
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

const goldPillStyle: React.CSSProperties = {
  ...pillStyle,
  background: "#fffbeb",
  border: "1px solid #fde68a",
  color: "#78350f",
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