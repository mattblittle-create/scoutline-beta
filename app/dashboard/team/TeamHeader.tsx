// app/dashboard/team/TeamHeader.tsx

"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TeamHeader(props: { teamName: string; logoUrl: string; initials: string }) {
  const pathname = usePathname();

  const isHome = pathname === "/dashboard/team";

  const activeKey: "profile" | "roster" | "invites" | "billing" | null = (() => {
    if (isHome) return null;
    if (pathname.startsWith("/dashboard/team/org")) return "profile";
    if (pathname.startsWith("/dashboard/team/roster")) return "roster";
    if (pathname.startsWith("/dashboard/team/invites")) return "invites";
    if (pathname.startsWith("/dashboard/team/billing")) return "billing";
    return null;
  })();

  const tabStyle = (key: Exclude<typeof activeKey, null>) => (activeKey === key ? btnGold : btnTab);

  const [logoOk, setLogoOk] = React.useState(true);
  const hasLogo = Boolean(props.logoUrl) && logoOk;

  React.useEffect(() => {
    // if logoUrl changes, try again
    setLogoOk(true);
  }, [props.logoUrl]);

  return (
    <div style={headerBar}>
      {/* LEFT: logo + team name */}
      <div style={brandLeft}>
        <div style={brandLogoBox} aria-hidden="true">
          {hasLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={props.logoUrl}
              alt={`${props.teamName} logo`}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
              onError={() => setLogoOk(false)}
            />
          ) : (
            <div style={logoFallback}>{props.initials}</div>
          )}
        </div>

        <div style={brandTitle}>{props.teamName}</div>
      </div>

      {/* RIGHT: nav buttons (NOT on home) */}
      {!isHome ? (
        <div style={navRight}>
          <Link href="/dashboard/team" style={btnOutlineBlue}>
            Back to Dashboard
          </Link>

          <Link href="/dashboard/team/org" style={tabStyle("profile")}>
            Profile
          </Link>

          <Link href="/dashboard/team/roster" style={tabStyle("roster")}>
            Roster
          </Link>

          <Link href="/dashboard/team/invites" style={tabStyle("invites")}>
            Invites
          </Link>

          <Link href="/dashboard/team/billing" style={tabStyle("billing")}>
            Billing
          </Link>
        </div>
      ) : null}
    </div>
  );
}

/* ---------------- styles ---------------- */

const headerBar: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  paddingBottom: 2,
  marginBottom: 14,
};

const brandLeft: React.CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  minWidth: 0,
};

const brandLogoBox: React.CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: 14,
  border: "1px solid #e5e7eb",
  background: "#fff",
  display: "grid",
  placeItems: "center",
  padding: 8,
  flex: "0 0 auto",
};

const logoFallback: React.CSSProperties = {
  width: "100%",
  height: "100%",
  display: "grid",
  placeItems: "center",
  fontWeight: 900,
  fontSize: 18, // 👈 add this
  color: "#0f172a",
  background: "#f8fafc",
  borderRadius: 12,
};

const brandTitle: React.CSSProperties = {
  fontWeight: 900,
  fontSize: "2rem", // was 1.75rem
  letterSpacing: "-0.02em",
  lineHeight: 1.1,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: 760,
};

const navRight: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "center",
  marginLeft: "auto",
};

const btnOutlineBlue: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #0ea5e9",
  background: "#0ea5e9",
  color: "#fff",
  fontWeight: 900,
  textDecoration: "none",
};

const btnTab: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 900,
  textDecoration: "none",
};

const btnGold: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #caa042",
  background: "#caa042",
  color: "#0f172a",
  fontWeight: 900,
  textDecoration: "none",
};
