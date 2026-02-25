// app/dashboard/coach/CoachHeaderActions.tsx

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties } from "react";

export default function CoachHeaderActions() {
  const pathname = usePathname() || "";

  const isCoachRoot = pathname === "/dashboard/coach";

  // Only show on sub-pages (NOT on /dashboard/coach)
  const show = !isCoachRoot && pathname.startsWith("/dashboard/coach");

  if (!show) return null;

  const isActive = (href: string) => {
    // Exact match for these pages
    return pathname === href;
  };

return (
  <div style={actionsRow}>
    {/* Back to Dashboard (only on sub-pages) */}
    <Link href="/dashboard/coach" style={btnBlue}>
      Back to Dashboard
    </Link>

    {/* Quick links: only active one is gold */}
    <Link
      href="/dashboard/coach/profile"
      style={isActive("/dashboard/coach/profile") ? btnGold : btnOutline}
    >
      Profile
    </Link>

    <Link
      href="/dashboard/coach/recruiting-board"
      style={isActive("/dashboard/coach/recruiting-board") ? btnGold : btnOutline}
    >
      Recruiting Board
    </Link>

    <Link
      href="/dashboard/coach/invites"
      style={isActive("/dashboard/coach/invites") ? btnGold : btnOutline}
    >
      Invites
    </Link>

    <Link
      href="/dashboard/coach/directory"
      style={isActive("/dashboard/coach/directory") ? btnGold : btnOutline}
    >
      Directory
    </Link>
  </div>
);
}

const actionsRow: CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap",
};

const btnBlue: CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #0ea5e9",
  background: "#0ea5e9",
  color: "#fff",
  fontWeight: 900,
  textDecoration: "none",
};

const btnGold: CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #caa042",
  background: "#caa042",
  color: "#0f182a",
  fontWeight: 900,
  textDecoration: "none",
};

const btnOutline: CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 900,
  textDecoration: "none",
};
