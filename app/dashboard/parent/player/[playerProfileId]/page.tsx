// app/dashboard/parent/player/[playerProfileId]/page.tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

type PageProps = {
  params: {
    playerProfileId: string;
  };
};

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function readString(obj: Record<string, any>, ...keys: string[]) {
  for (const key of keys) {
    const value = obj?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function readNumber(obj: Record<string, any>, ...keys: string[]) {
  for (const key of keys) {
    const value = obj?.[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function readStringArray(obj: Record<string, any>, ...keys: string[]) {
  for (const key of keys) {
    const value = obj?.[key];
    if (Array.isArray(value)) {
      const cleaned = value
        .map((v) => (typeof v === "string" ? v.trim() : ""))
        .filter(Boolean);
      if (cleaned.length) return cleaned;
    }
  }
  return [] as string[];
}

function labelValue(label: string, value?: string | number | null) {
  if (value === null || value === undefined || value === "") return null;
  return { label, value: String(value) };
}

function sectionCard(
  title: string,
  items: Array<{ label: string; value: string }>,
  emptyText = "No information added yet."
) {
  return (
    <section style={card}>
      <div style={cardTitle}>{title}</div>
      {items.length ? (
        <div style={infoGrid}>
          {items.map((item) => (
            <div key={`${title}-${item.label}`} style={infoRow}>
              <div style={infoLabel}>{item.label}</div>
              <div style={infoValue}>{item.value}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={emptyState}>{emptyText}</div>
      )}
    </section>
  );
}

export default async function ParentPlayerProfilePage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user?.id) {
    redirect("/login?role=parent");
  }

  const playerProfileId = String(params?.playerProfileId || "").trim();
  if (!playerProfileId) notFound();

  const parentProfile = await prisma.parentProfile.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
    },
  });

  if (!parentProfile?.id) {
    return (
      <div style={{ display: "grid", gap: 18 }}>
        <section style={hero}>
          <div style={eyebrow}>Parent Portal</div>
          <h1 style={h1}>Player Profile</h1>
          <p style={heroText}>
            This parent account is not linked to a player yet.
          </p>
        </section>

        <section style={warningCard}>
          No parent-player link was found for this account. Complete the parent
          invite flow again or backfill the link in admin/dev tools.
        </section>

        <div>
          <Link href="/dashboard/parent" style={goldBtn}>
            Back to Parent Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const link = await prisma.parentPlayerLink.findUnique({
    where: {
      parentProfileId_playerProfileId: {
        parentProfileId: parentProfile.id,
        playerProfileId,
      },
    },
    select: {
      id: true,
      relationship: true,
      isPrimary: true,
      playerProfile: {
        select: {
          id: true,
          email: true,
          userId: true,
          playerPlanTier: true,
          playerBillingCadence: true,
          playerBillingStatus: true,
          updatedAt: true,
          createdAt: true,
          data: true,
          user: {
            select: {
              slug: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!link?.playerProfile) {
    notFound();
  }

  const profile = link.playerProfile;
  const data = asRecord(profile.data);

  const firstName = readString(data, "firstName", "playerFirstName", "nameFirst");
  const lastName = readString(data, "lastName", "playerLastName", "nameLast");
  const fullName =
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    profile.user?.name?.trim() ||
    profile.email.split("@")[0];

  const gradYear = readString(data, "gradYear", "graduationYear", "classYear");
  const school = readString(data, "school", "highSchool", "hsName");
  const gpa = readString(data, "gpa", "GPA");
  const positions = readStringArray(
    data,
    "positions",
    "primaryPositions",
    "positionGroups"
  );
  const primaryPosition = readString(data, "primaryPosition", "primaryPos", "position");
  const secondaryPosition = readString(
    data,
    "secondaryPosition",
    "secondaryPos"
  );
  const bats = readString(data, "bats");
  const throwsHand = readString(data, "throws", "throwingHand");
  const height = readString(data, "height", "heightDisplay");
  const weight = readString(data, "weight", "weightDisplay");
  const hometown = readString(data, "hometown", "city");
  const state = readString(data, "state");
  const travelTeam = readString(data, "travelTeam", "teamName");
  const committedCollege = readString(
    data,
    "committedCollege",
    "committedSchool",
    "committedProgram"
  );
  const commitmentStatus =
    typeof data?.isCommitted === "boolean"
      ? data.isCommitted
      : String(readString(data, "committed")).toLowerCase() === "true";

  const sixty = readString(data, "sixty", "sixtyYard", "sixtyTime");
  const exitVelo = readString(data, "exitVelo", "exitVelocity");
  const pitchingVelo = readString(data, "pitchingVelo", "pitchingVelocity");
  const popTime = readString(data, "popTime");
  const fb = readString(data, "fastballVelo", "fbVelo");
  const infVelo = readString(data, "infieldVelo");
  const ofVelo = readString(data, "outfieldVelo");
  const catcherVelo = readString(data, "catcherVelo");

  const xUrl = readString(data, "xUrl", "twitterUrl");
  const instagramUrl = readString(data, "instagramUrl");
  const youtubeUrl = readString(data, "youtubeUrl");
  const tiktokUrl = readString(data, "tiktokUrl");
  const highlightVideo = readString(
    data,
    "highlightVideoUrl",
    "videoUrl",
    "primaryVideoUrl"
  );
  const recruitingBio = readString(data, "bio", "playerBio", "summary");
  const slug = profile.user?.slug?.trim() || "";

  const basics = [
    labelValue("Player Name", fullName),
    labelValue("Email", profile.email),
    labelValue("Graduation Year", gradYear),
    labelValue("School", school),
    labelValue("Travel Team", travelTeam),
    labelValue("Hometown", [hometown, state].filter(Boolean).join(", ")),
    labelValue("GPA", gpa),
    labelValue("Plan", formatPlan(profile.playerPlanTier)),
    labelValue("Billing", formatCadence(profile.playerBillingCadence)),
    labelValue("Billing Status", profile.playerBillingStatus),
    labelValue("Relationship", link.relationship || "Parent"),
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const athletics = [
    labelValue(
      "Positions",
      [primaryPosition, secondaryPosition]
        .filter(Boolean)
        .join(" / ") || positions.join(", ")
    ),
    labelValue("Bats", bats),
    labelValue("Throws", throwsHand),
    labelValue("Height", height),
    labelValue("Weight", weight),
    labelValue(
      "Commitment",
      commitmentStatus
        ? committedCollege || "Committed"
        : "Not committed"
    ),
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const metrics = [
    labelValue("60 Yard", sixty),
    labelValue("Exit Velocity", exitVelo),
    labelValue("Pitching Velocity", pitchingVelo || fb),
    labelValue("Pop Time", popTime),
    labelValue("Infield Velocity", infVelo),
    labelValue("Outfield Velocity", ofVelo),
    labelValue("Catcher Velocity", catcherVelo),
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const links = [
    labelValue("Highlight Video", highlightVideo),
    labelValue("Instagram", instagramUrl),
    labelValue("X", xUrl),
    labelValue("YouTube", youtubeUrl),
    labelValue("TikTok", tiktokUrl),
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const publicProfileHref = slug ? `/player/${encodeURIComponent(slug)}` : null;
  const billingHref = `/dashboard/parent/player/${encodeURIComponent(profile.id)}/billing`;

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <section style={hero}>
        <div style={eyebrow}>Parent Portal</div>

        <h1 style={h1}>{fullName}</h1>

        <p style={heroText}>
          Review {firstName ? `${firstName}'s` : "your player's"} ScoutLine
          profile details, academics, athletics, metrics, and billing access
          from one place.
        </p>

        <div style={actionRow}>
          <Link href="/dashboard/parent" style={ghostBtn}>
            Back to Parent Dashboard
          </Link>

          <Link href={billingHref} style={goldBtn}>
            Open Billing
          </Link>

          <Link
  href={`/dashboard/parent/player/${encodeURIComponent(profile.id)}/edit`}
  style={goldBtn}
>
  Edit Profile
</Link>

          {publicProfileHref ? (
            <Link href={publicProfileHref} style={ghostBtn}>
              View Public Profile
            </Link>
          ) : null}
        </div>
      </section>

      {recruitingBio ? (
        <section style={card}>
          <div style={cardTitle}>Player Summary</div>
          <div style={bodyText}>{recruitingBio}</div>
        </section>
      ) : null}

      {sectionCard("Overview", basics)}
      {sectionCard("Athletics", athletics)}
      {sectionCard("Metrics", metrics)}
      {sectionCard("Social / Video", links, "No social or video links added yet.")}

      <section style={card}>
        <div style={cardTitle}>Profile Status</div>

        <div style={infoGrid}>
          <div style={infoRow}>
            <div style={infoLabel}>Parent Link</div>
            <div style={infoValue}>
              {link.isPrimary ? "Primary linked player" : "Linked player"}
            </div>
          </div>

          <div style={infoRow}>
            <div style={infoLabel}>Profile Created</div>
            <div style={infoValue}>
              {new Date(profile.createdAt).toLocaleString()}
            </div>
          </div>

          <div style={infoRow}>
            <div style={infoLabel}>Last Updated</div>
            <div style={infoValue}>
              {new Date(profile.updatedAt).toLocaleString()}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function formatPlan(value?: string | null) {
  const v = String(value || "").trim().toUpperCase();
  if (v === "REDSHIRT") return "Redshirt";
  if (v === "WALK_ON") return "Walk-On";
  if (v === "ALL_AMERICAN") return "All-American";
  if (v === "TEAM") return "Team";
  return value || "—";
}

function formatCadence(value?: string | null) {
  const v = String(value || "").trim().toLowerCase();
  if (v === "monthly") return "Monthly";
  if (v === "annual" || v === "yearly") return "Annual";
  return value || "—";
}

const hero: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  background: "linear-gradient(180deg, #fffdf7 0%, #ffffff 100%)",
  padding: 20,
  boxShadow: "0 12px 30px rgba(15,23,42,0.06)",
};

const eyebrow: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 900,
  color: "#8a6a21",
  textTransform: "uppercase",
  letterSpacing: ".06em",
  marginBottom: 8,
};

const h1: React.CSSProperties = {
  margin: 0,
  fontSize: "1.8rem",
  fontWeight: 900,
  letterSpacing: "-0.02em",
  color: "#0f172a",
};

const heroText: React.CSSProperties = {
  margin: "10px 0 0",
  color: "#475569",
  maxWidth: 820,
  lineHeight: 1.55,
  fontWeight: 600,
};

const actionRow: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  marginTop: 16,
};

const card: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  background: "#fff",
  padding: 18,
  boxShadow: "0 10px 24px rgba(15,23,42,0.05)",
  display: "grid",
  gap: 14,
};

const cardTitle: React.CSSProperties = {
  fontSize: "1.05rem",
  fontWeight: 900,
  color: "#0f172a",
};

const bodyText: React.CSSProperties = {
  color: "#475569",
  lineHeight: 1.6,
  fontWeight: 600,
  whiteSpace: "pre-wrap",
};

const infoGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};

const infoRow: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 12,
  background: "#fff",
  display: "grid",
  gap: 6,
};

const infoLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: ".04em",
};

const infoValue: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 800,
  color: "#0f172a",
  lineHeight: 1.45,
  wordBreak: "break-word",
};

const emptyState: React.CSSProperties = {
  color: "#64748b",
  fontWeight: 700,
  lineHeight: 1.5,
};

const goldBtn: React.CSSProperties = {
  display: "inline-block",
  padding: "11px 15px",
  borderRadius: 12,
  textDecoration: "none",
  fontWeight: 900,
  border: "1px solid #caa042",
  background: "#caa042",
  color: "#0f172a",
  boxShadow: "0 8px 18px rgba(202,160,66,0.22)",
};

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

const warningCard: React.CSSProperties = {
  border: "1px solid #fde68a",
  background: "#fffbeb",
  color: "#78350f",
  borderRadius: 16,
  padding: 16,
  fontWeight: 700,
  lineHeight: 1.5,
};