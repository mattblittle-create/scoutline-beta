// app/dashboard/team/college-search/page.tsx
 
import Link from "next/link";
import CollegeSearchPage from "@/app/search/page";

export default async function TeamCollegeSearchPage() {
  return (
    <>
      <div style={headerShellStyle}>
        <div>
          <h1 style={titleStyle}>Team College Search</h1>
          <p style={subtitleStyle}>
            Explore the full ScoutLine college database to help players and
            families identify programs, divisions, regions, conferences, and
            potential recruiting fits.
          </p>
        </div>

        <div style={buttonRowStyle}>
          <Link href="/dashboard/team/roster" style={primaryButtonStyle}>
            Team Roster
          </Link>

          <Link href="/dashboard/team" style={secondaryButtonStyle}>
            Back to Team Dashboard
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "16px" }}>
        <CollegeSearchPage />
      </div>
    </>
  );
}

const headerShellStyle: React.CSSProperties = {
  maxWidth: 1180,
  margin: "0 auto",
  padding: "18px 16px 0",
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
  flexWrap: "wrap",
  alignItems: "flex-start",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "clamp(1.8rem, 4vw, 2.5rem)",
  fontWeight: 900,
  color: "#0f172a",
};

const subtitleStyle: React.CSSProperties = {
  margin: "6px 0 0",
  color: "#475569",
  fontWeight: 700,
  lineHeight: 1.45,
  maxWidth: 760,
};

const buttonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap",
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