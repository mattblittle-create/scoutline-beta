// app/dashboard/parent/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export default async function ParentDashboardPage() {
  const user = await getCurrentUser();

  if (!user?.id) {
    redirect("/login?role=parent");
  }

  const parentProfile = await prisma.parentProfile.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      playerLinks: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        take: 1,
        select: {
          id: true,
          isPrimary: true,
          relationship: true,
          playerProfile: {
            select: {
              id: true,
              email: true,
              userId: true,
              data: true,
            },
          },
        },
      },
    },
  });

  const link = parentProfile?.playerLinks?.[0] ?? null;
  const playerProfile = link?.playerProfile ?? null;

  const playerData =
    playerProfile?.data && typeof playerProfile.data === "object"
      ? (playerProfile.data as Record<string, any>)
      : {};

  const firstName = String(
    playerData?.firstName ||
      playerData?.playerFirstName ||
      playerData?.nameFirst ||
      ""
  ).trim();

  const lastName = String(
    playerData?.lastName ||
      playerData?.playerLastName ||
      playerData?.nameLast ||
      ""
  ).trim();

  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  const displayName =
    fullName ||
    (playerProfile?.email ? playerProfile.email.split("@")[0] : "Your Player");

  const possessiveFirstName = firstName
    ? `${firstName}${firstName.endsWith("s") ? "'" : "'s"}`
    : "your player's";

  const playerProfileHref = playerProfile?.id
    ? `/dashboard/parent/player/${encodeURIComponent(playerProfile.id)}`
    : "/dashboard/player/profile";

  const billingHref = playerProfile?.id
    ? `/dashboard/parent/player/${encodeURIComponent(playerProfile.id)}/billing`
    : "/dashboard/player/profile/billing";

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
            maxWidth: 760,
            lineHeight: 1.55,
            fontWeight: 600,
          }}
        >
          Signed in as <strong>{user?.email || "—"}</strong>. Use this dashboard
          to review and update {possessiveFirstName} profile details and manage
          billing.
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
          player profile and billing pages.
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
          title="View / Edit Player Profile"
          body={`Open ${possessiveFirstName} ScoutLine profile to update recruiting info, academics, athletics, stats, and media.`}
          href={playerProfileHref}
          cta="Open Player Profile"
        />

        <Card
          title="Billing"
          body={`View and manage billing for ${possessiveFirstName} ScoutLine account including plan details and invoices.`}
          href={billingHref}
          cta="Open Billing"
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
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
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
      </div>
    </div>
  );
}