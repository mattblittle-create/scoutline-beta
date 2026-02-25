// app/dashboard/team/layout.tsx

import type { ReactNode, CSSProperties } from "react";
import { getCurrentTeam } from "@/lib/team/getCurrentTeam";
import TeamHeader from "./TeamHeader";

export const metadata = {
  title: "Team Dashboard • ScoutLine",
  description: "Manage your team / organization profile, roster, invites, and billing.",
};

function clean(v: any) {
  const s = String(v ?? "").trim();
  return s || "";
}

/**
 * Accept:
 * - data:image/... (from onboarding upload)
 * - https://...
 * - http://...
 * - //...
 * - /relative
 * - bare domain like "example.com" or "www.example.com" (prefix https://)
 */
function safeUrl(u: any) {
  const s = clean(u);
  if (!s) return "";

  if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(s)) return s;

  if (s.startsWith("/")) return s;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("//")) return `https:${s}`;

  if (/^[a-z0-9.-]+\.[a-z]{2,}([/].*)?$/i.test(s)) return `https://${s}`;

  return "";
}

function initialsFrom(name: string) {
  return (
    (name || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "TD"
  );
}

export default async function TeamDashboardLayout({ children }: { children: ReactNode }) {
  const team = await getCurrentTeam({ teamSlug: null });

  const rawName = clean(team?.name);
  const teamName = rawName || "Your Organization";

  const logoUrl = safeUrl((team as any)?.logoUrl);

  const initials = initialsFrom(teamName);

  return (
    <section style={wrap}>
      <TeamHeader teamName={teamName} logoUrl={logoUrl} initials={initials} />
      <div style={contentWrap}>{children}</div>
    </section>
  );
}

const wrap: CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  padding: "24px 16px",
  color: "#0f172a",
};

const contentWrap: CSSProperties = {
  background: "transparent",
  borderRadius: 14,
};
