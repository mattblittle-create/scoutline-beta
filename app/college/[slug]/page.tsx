// app/college/[slug]/page.tsx

import Link from "next/link";
import CollegeSaveStar from "@/app/components/college/CollegeSaveStar";

type PageProps = {
  params: {
    slug: string;
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

async function getCollege(slug: string) {
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
        <Link href="/search">← Back to College Search</Link>
      </main>
    );
  }

  const baseball = college.baseballProgram;

  return (
    <main style={{ color: "#0f172a", fontFamily: "Arial, sans-serif" }}>
      <section style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 16px 56px" }}>
<Link href="/dashboard/player/college-search" style={backLinkStyle}>
  ← Back to College Search
</Link>

        <div style={heroStyle}>
          <div>
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
            </div>
          </div>
        </div>

        <div style={gridStyle}>
          <section style={cardStyle}>
            <h2 style={sectionTitleStyle}>General School Info</h2>

            <Info label="In-State Tuition" value={money(college.tuitionInState)} />
            <Info label="Out-of-State Tuition" value={money(college.tuitionOutOfState)} />
            <Info label="International Tuition" value={money(college.tuitionInternational)} />
            <Info label="Enrollment" value={college.enrollmentTotal?.toLocaleString?.() || "—"} />
            <Info label="Undergrad Enrollment" value={college.enrollmentUndergrad?.toLocaleString?.() || "—"} />
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
            <Info label="Average GPA" value={baseball?.averageGpa || "—"} />
            <Info label="Transfer Heavy" value={baseball?.transferHeavy ? "Yes" : "No"} />
            <Info label="JUCO Friendly" value={baseball?.jucoFriendly ? "Yes" : "No"} />

            <div style={buttonRowStyle}>
              {baseball?.baseballWebsiteUrl ? <ExternalButton href={baseball.baseballWebsiteUrl}>Baseball Website</ExternalButton> : null}
              {baseball?.rosterUrl ? <ExternalButton href={baseball.rosterUrl}>Roster</ExternalButton> : null}
              {baseball?.questionnaireUrl ? <ExternalButton href={baseball.questionnaireUrl}>Recruiting Questionnaire</ExternalButton> : null}
              {baseball?.campsUrl ? <ExternalButton href={baseball.campsUrl}>Camps</ExternalButton> : null}
            </div>
          </section>
        </div>
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

function ExternalButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" style={buttonStyle}>
      {children}
    </a>
  );
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
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 16,
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
  marginBottom: 8,
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
};