// app/dashboard/player/college-search/page.tsx

"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import CollegeSearchPage from "@/app/search/page";

function PlayerCollegeSearchPageInner() {
  const search = useSearchParams();

  const from = search.get("from") || "";
  const returnTo = search.get("returnTo") || "";
  const playerProfileId = search.get("playerProfileId") || "";

  const isFromTeamRoster = from === "team-roster";

  const teamRosterQuery = playerProfileId
    ? `?playerProfileId=${encodeURIComponent(
        playerProfileId
      )}&from=team-roster&returnTo=${encodeURIComponent(
        returnTo || "/dashboard/team/roster"
      )}`
    : "";

  return (
    <>
      <div style={headerShellStyle}>
        <div>
          <h1 style={titleStyle}>College Search</h1>
          <p style={subtitleStyle}>
            Explore college programs, then use Truth Fit and Target Programs to build your recruiting plan.
          </p>
        </div>

        <div style={buttonRowStyle}>
          <Link
            href={
              isFromTeamRoster
                ? `/dashboard/player/recruiting-tool${teamRosterQuery}`
                : "/dashboard/player/recruiting-tool"
            }
            style={primaryButtonStyle}
          >
            Recruiting Tool
          </Link>

          <Link
            href={
              isFromTeamRoster
                ? `/dashboard/player/target-programs${teamRosterQuery}`
                : "/dashboard/player/target-programs"
            }
            style={secondaryButtonStyle}
          >
            Target Programs
          </Link>

          <Link
            href={
              isFromTeamRoster
                ? returnTo || "/dashboard/team/roster"
                : "/dashboard/player"
            }
            style={backToDashboardStyle}
          >
            {isFromTeamRoster ? "Back to Team Roster" : "Back to Dashboard"}
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "16px" }}>
        <CollegeSearchPage />
      </div>
    </>
  );
}

export default function PlayerCollegeSearchPage() {
  return (
    <Suspense fallback={null}>
      <PlayerCollegeSearchPageInner />
    </Suspense>
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
  maxWidth: 680,
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