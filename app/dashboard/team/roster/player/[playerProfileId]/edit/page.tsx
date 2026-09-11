// app/dashboard/team/roster/player/[playerProfileId]/edit/page.tsx

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { PlayerProfileEditor } from "@/app/dashboard/player/profile/PlayerProfileEditor";

export const dynamic = "force-dynamic";

type PageProps = {
  params: {
    playerProfileId: string;
  };
};

function getNameFromData(data: any) {
  const normalized = data?.normalized || data || {};
  const firstName =
    String(normalized?.firstName || normalized?.core?.firstName || "").trim();
  const lastName =
    String(normalized?.lastName || normalized?.core?.lastName || "").trim();

  return [firstName, lastName].filter(Boolean).join(" ").trim() || "Player";
}

export default async function TeamRosterPlayerEditPage({ params }: PageProps) {
  const currentUser = await getCurrentUser().catch(() => null);

  if (!currentUser?.id) {
    redirect(
      `/login?role=team&next=${encodeURIComponent(
        `/dashboard/team/roster/player/${params.playerProfileId}/edit`
      )}`
    );
  }

  const teamAdminMembership = await prisma.teamMembership.findFirst({
    where: {
      userId: currentUser.id,
      role: "TEAM_ADMIN" as any,
      isActive: true,
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  if (!teamAdminMembership?.teamId) {
    notFound();
  }

  const playerMembership = await prisma.teamMembership.findFirst({
    where: {
      teamId: teamAdminMembership.teamId,
      playerProfileId: params.playerProfileId,
      role: "PLAYER" as any,
      isActive: true,
    },
    include: {
      playerProfile: {
        select: {
          id: true,
          email: true,
          data: true,
        },
      },
    },
  });

  if (!playerMembership?.playerProfile) {
    notFound();
  }

  const fullName = getNameFromData(playerMembership.playerProfile.data);

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "20px 16px" }}>
      <div style={{ display: "grid", gap: 12 }}>
        <div>
          <Link
            href="/dashboard/team/roster"
            style={{
              color: "#0f172a",
              fontWeight: 900,
              textDecoration: "none",
            }}
          >
            ← Back to Team Roster
          </Link>
        </div>

        <section
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            background: "#fff",
            padding: 16,
            boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: "1.35rem",
                  fontWeight: 950,
                  color: "#0f172a",
                }}
              >
                Edit Player Profile — {fullName}
              </h1>

              <p
                style={{
                  margin: "6px 0 0",
                  color: "#64748b",
                  fontWeight: 700,
                  lineHeight: 1.4,
                }}
              >
                Editing as Team Admin for {teamAdminMembership.team.name}.
                Team Admins can update roster-relevant athletic, metrics,
                stats, video, social, and reference information. Restricted
                profile fields remain player-controlled.
              </p>
            </div>

            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 999,
                padding: "8px 12px",
                background: "#f8fafc",
                color: "#475569",
                fontWeight: 900,
                fontSize: 12,
              }}
            >
              Team Admin Mode
            </div>

            <div
  style={{
    width: "100%",
    marginTop: 12,
    border: "1px solid #fde68a",
    borderRadius: 14,
    background: "#fffbeb",
    color: "#78350f",
    padding: "10px 12px",
    fontWeight: 800,
    lineHeight: 1.45,
  }}
>
  Viewing as Team Admin. Only roster-relevant fields can be updated from this
  page. Player-owned profile, academic, identity, and billing fields remain
  protected.
</div>
          </div>
        </section>

<PlayerProfileEditor
  mode="team-admin"
  profileEmailOverride={playerMembership.playerProfile.email}
  saveEndpoint={`/api/team/player-profile?playerProfileId=${encodeURIComponent(
    playerMembership.playerProfile.id
  )}`}
  saveMethod="PATCH"
  backHref="/dashboard/team/roster"
  backLabel="Back to Team Roster"
  heading={`Player Profile — ${fullName}`}
  intro="Use this team-authorized profile editor to keep roster-relevant recruiting information accurate and current. Some player-owned fields may be view-only for Team Admins."
/>
      </div>
    </main>
  );
}