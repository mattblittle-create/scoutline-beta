// app/dashboard/parent/player/[playerProfileId]/edit/page.tsx

import Link from "next/link";
import React, { Suspense } from "react";
import { notFound } from "next/navigation";
import { PlayerProfileEditor } from "@/app/dashboard/player/profile/PlayerProfileEditor";
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

export default async function ParentPlayerEditPage({ params }: PageProps) {
  const playerProfileId = String(params?.playerProfileId || "").trim();

  if (!playerProfileId) notFound();

  const { activePlayerProfile } = await getParentDashboardContext({
    playerProfileId,
    requireLinkedPlayer: true,
  });

  const playerProfile = activePlayerProfile!;
  const data = asRecord(playerProfile.data);

  const fullName = getPlayerDisplayName({
    data,
    fallbackName: playerProfile.user?.name,
    fallbackEmail: playerProfile.email,
  });

  const parentOverviewHref = `/dashboard/parent/player/${encodeURIComponent(
    playerProfile.id
  )}`;

  const parentBillingHref = `/dashboard/parent/player/${encodeURIComponent(
    playerProfile.id
  )}/billing`;

  const parentSaveEndpoint = `/api/parent/player/${encodeURIComponent(
    playerProfile.id
  )}/profile`;

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <section
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 18,
          background: "linear-gradient(180deg, #fffdf7 0%, #ffffff 100%)",
          padding: 20,
          boxShadow: "0 12px 30px rgba(15,23,42,0.06)",
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 900,
            color: "#8a6a21",
            textTransform: "uppercase",
            letterSpacing: ".06em",
            marginBottom: 8,
          }}
        >
          Parent Portal
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: "1.8rem",
            fontWeight: 900,
            letterSpacing: "-0.02em",
            color: "#0f172a",
          }}
        >
          Edit Player Profile — {fullName}
        </h1>

        <p
          style={{
            margin: "10px 0 0",
            color: "#475569",
            maxWidth: 860,
            lineHeight: 1.55,
            fontWeight: 600,
          }}
        >
          Parents can help maintain the full player profile, including core
          info, academics, athletics, metrics, stats, video/social links, and
          references. Commitment status remains player/admin controlled.
        </p>

        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            marginTop: 16,
          }}
        >
          <Link href={parentOverviewHref} style={ghostBtn}>
            Back to Player Overview
          </Link>

          <Link href="/dashboard/parent" style={ghostBtn}>
            Parent Dashboard
          </Link>
        </div>
      </section>

      <Suspense fallback={null}>
        <PlayerProfileEditor
          mode="parent"
          profileEmailOverride={playerProfile.email}
          saveEndpoint={parentSaveEndpoint}
          saveMethod="PATCH"
          backHref={parentOverviewHref}
          backLabel="Back to Player Overview"
          billingHref={parentBillingHref}
          heading={`Player Profile — ${fullName}`}
          intro="Use this full profile editor to help keep your player’s ScoutLine profile accurate and current. Updates made here are saved through parent-authorized access for this linked player account."
        />
      </Suspense>
    </div>
  );
}

const ghostBtn: React.CSSProperties = {
  display: "inline-block",
  padding: "11px 15px",
  borderRadius: 12,
  textDecoration: "none",
  fontWeight: 900,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#0f172a",
};