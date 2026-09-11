// app/dashboard/parent/player/[playerProfileId]/college-search/page.tsx

import Link from "next/link";
import { notFound } from "next/navigation";
import CollegeSearchPage from "@/app/search/page";
import {
  asRecord,
  getParentDashboardContext,
  getPlayerDisplayName,
} from "@/lib/parent/getParentDashboardContext";

type PageProps = {
  params: {
    playerProfileId: string;
  };
};

export default async function ParentCollegeSearchPage({ params }: PageProps) {
  const playerProfileId = String(params?.playerProfileId || "").trim();

  if (!playerProfileId) notFound();

  const { activePlayerProfile } = await getParentDashboardContext({
    playerProfileId,
    requireLinkedPlayer: true,
  });

  const profile = activePlayerProfile!;
  const data = asRecord(profile.data);

  const fullName = getPlayerDisplayName({
    data,
    fallbackName: profile.user?.name,
    fallbackEmail: profile.email,
  });

  const parentOverviewHref = `/dashboard/parent/player/${encodeURIComponent(
    profile.id
  )}`;

  const recruitingHref = `/dashboard/parent/player/${encodeURIComponent(
    profile.id
  )}/recruiting`;

  const publicProfileHref = profile.user?.slug
    ? `/player/${encodeURIComponent(profile.user.slug)}`
    : null;

  return (
    <>
      <div style={headerShellStyle}>
        <div>
          <h1 style={titleStyle}>Parent College Search</h1>
          <p style={subtitleStyle}>
            Search the full ScoutLine college database for {fullName}. This uses
            the same college search engine available from the player dashboard.
          </p>
        </div>

        <div style={buttonRowStyle}>
          <Link href={parentOverviewHref} style={secondaryButtonStyle}>
            Player Overview
          </Link>

          <Link href={recruitingHref} style={primaryButtonStyle}>
            Recruiting Tool
          </Link>

          {publicProfileHref ? (
            <Link href={publicProfileHref} style={secondaryButtonStyle}>
              View Public Profile
            </Link>
          ) : null}
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