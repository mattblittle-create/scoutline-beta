// app/dashboard/player/suggested-programs/page.tsx

import Link from "next/link";

export default function PlayerSuggestedProgramsPage() {
  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px 40px" }}>
      <section style={shellStyle}>
        <div style={headerStyle}>
          <div>
            <h1 style={titleStyle}>Suggested Programs</h1>

            <p style={subtitleStyle}>
              ScoutLine-recommended college programs based on your profile, metrics,
              academics, recruiting lane, and available program data.
            </p>
          </div>

          <div style={buttonRowStyle}>
            <Link href="/dashboard/player/recruiting-tool" style={secondaryButtonStyle}>
              Recruiting Tool
            </Link>

            <Link href="/dashboard/player/college-search" style={secondaryButtonStyle}>
              College Search
            </Link>

            <Link href="/dashboard/player" style={backButtonStyle}>
              Back to Dashboard
            </Link>
          </div>
        </div>

        <div style={placeholderStyle}>
          Suggested Programs will move here next. This page will include filters,
          Recommended For You schools, save-to-target actions, and Truth Fit program cards.
        </div>
      </section>
    </main>
  );
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
  fontWeight: 700,
};

const buttonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap",
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

const backButtonStyle: React.CSSProperties = {
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

const placeholderStyle: React.CSSProperties = {
  marginTop: 24,
  padding: 18,
  borderRadius: 16,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  color: "#475569",
  fontWeight: 800,
  lineHeight: 1.6,
};