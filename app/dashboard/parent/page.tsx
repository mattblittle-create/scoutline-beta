// app/dashboard/parent/page.tsx

import Link from "next/link";
import {
  asRecord,
  getParentDashboardContext,
  getPlayerDisplayName,
  getPossessiveName,
  readString,
} from "@/lib/parent/getParentDashboardContext";

export default async function ParentDashboardPage() {
  const { user, activePlayerProfile } = await getParentDashboardContext();

  const playerProfile = activePlayerProfile;
  const playerData = asRecord(playerProfile?.data);

  const firstName = readString(
    playerData,
    "firstName",
    "playerFirstName",
    "nameFirst"
  );

  const displayName = playerProfile
    ? getPlayerDisplayName({
        data: playerData,
        fallbackName: playerProfile.user?.name,
        fallbackEmail: playerProfile.email,
      })
    : "Your Player";

  const possessiveFirstName = getPossessiveName(firstName);

  const playerOverviewHref = playerProfile?.id
    ? `/dashboard/parent/player/${encodeURIComponent(playerProfile.id)}`
    : "/dashboard/parent";

  const publicProfileHref =
    playerProfile?.user?.slug
      ? `/player/${encodeURIComponent(playerProfile.user.slug)}`
      : null;

  const recruitingHref = playerProfile?.id
    ? `/dashboard/parent/player/${encodeURIComponent(playerProfile.id)}/recruiting`
    : "/dashboard/parent";

  const collegeSearchHref = playerProfile?.id
    ? `/dashboard/parent/player/${encodeURIComponent(playerProfile.id)}/college-search`
    : "/dashboard/parent";

  const targetProgramsHref = playerProfile?.id
    ? `/dashboard/player/target-programs?playerProfileId=${encodeURIComponent(playerProfile.id)}`
    : "/dashboard/parent";

  const billingHref = playerProfile?.id
    ? `/dashboard/parent/player/${encodeURIComponent(playerProfile.id)}/billing`
    : "/dashboard/parent";

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
          Welcome
        </div>

        <div
          style={{
            margin: 0,
            fontSize: "1.6rem",
            fontWeight: 900,
            letterSpacing: "-0.02em",
            color: "#0f172a",
          }}
        >
          Parent Portal - {displayName}
        </div>

        <p
          style={{
            margin: "10px 0 0",
            color: "#475569",
            maxWidth: 780,
            lineHeight: 1.55,
            fontWeight: 600,
          }}
        >
          Signed in as <strong>{user?.email || "—"}</strong>. Use this dashboard
          to support {possessiveFirstName} recruiting journey, review profile
          progress, research colleges, and manage billing.
        </p>
      </section>

      {!playerProfile ? (
        <section
          style={{
            border: "1px solid #fde68a",
            background: "#fffbeb",
            color: "#78350f",
            borderRadius: 16,
            padding: 16,
            fontWeight: 700,
            lineHeight: 1.5,
          }}
        >
          No player is linked to this parent account yet. Once the parent-player
          link is created, this dashboard will route directly to the correct
          player profile, recruiting snapshot, college search, and billing pages.
        </section>
      ) : null}

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
<Card
  title="Player Profile"
  body={`Review and update ${possessiveFirstName} profile basics, academics, athletics, stats, video, and social links.`}
  href={playerOverviewHref}
  cta="Open Player Profile"
  disabled={!playerProfile}
/>

<Card
  title="Public Profile"
  body={`See what college coaches and evaluators can view on ${possessiveFirstName} public ScoutLine profile.`}
  href={publicProfileHref || playerOverviewHref}
  cta="View Public Profile"
  disabled={!publicProfileHref}
/>

<Card
  title="College Search"
  body="Research colleges from a family planning perspective including division, region, conference, and tuition."
  href={collegeSearchHref}
  cta="Search Colleges"
  disabled={!playerProfile}
/>

<Card
  title="Recruiting Snapshot"
  body={`View ${possessiveFirstName} recruiting readiness, profile completion, suggested lane, and parent-friendly next steps.`}
  href={recruitingHref}
  cta="Open Snapshot"
  disabled={!playerProfile}
/>

<Card
  title="Target Programs"
  body={`Review ${possessiveFirstName} saved target schools, recruiting priorities, and program list.`}
  href={targetProgramsHref}
  cta="Open Target Programs"
  disabled={!playerProfile}
/>

<Card
  title="Billing"
  body={`View and manage billing for ${possessiveFirstName} ScoutLine account including plan details and invoices.`}
  href={billingHref}
  cta="Open Billing"
  disabled={!playerProfile}
/>
      </section>
    </div>
  );
}

function Card({
  title,
  body,
  href,
  cta,
  disabled,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
  disabled?: boolean;
}) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 18,
        background: "#fff",
        padding: 18,
        boxShadow: "0 10px 24px rgba(15,23,42,0.05)",
        display: "grid",
        gap: 12,
        opacity: disabled ? 0.62 : 1,
      }}
    >
      <div>
        <div
          style={{
            fontSize: "1.05rem",
            fontWeight: 900,
            color: "#0f172a",
          }}
        >
          {title}
        </div>
        <div
          style={{
            marginTop: 8,
            color: "#475569",
            lineHeight: 1.5,
            fontWeight: 600,
          }}
        >
          {body}
        </div>
      </div>

      <div>
        {disabled ? (
          <span
            style={{
              display: "inline-block",
              padding: "11px 15px",
              borderRadius: 12,
              textDecoration: "none",
              fontWeight: 900,
              border: "1px solid #e5e7eb",
              background: "#f8fafc",
              color: "#64748b",
            }}
          >
            {cta}
          </span>
        ) : (
          <Link
            href={href}
            style={{
              display: "inline-block",
              padding: "11px 15px",
              borderRadius: 12,
              textDecoration: "none",
              fontWeight: 900,
              border: "1px solid #caa042",
              background: "#caa042",
              color: "#0f172a",
              boxShadow: "0 8px 18px rgba(202,160,66,0.22)",
            }}
          >
            {cta}
          </Link>
        )}
      </div>
    </div>
  );
}