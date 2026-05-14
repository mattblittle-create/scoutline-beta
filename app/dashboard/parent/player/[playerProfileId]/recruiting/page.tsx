// app/dashboard/parent/player/[playerProfileId]/recruiting/page.tsx

import Link from "next/link";
import React from "react";
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
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function hasValue(value: unknown) {
  return typeof value === "string" ? Boolean(value.trim()) : Boolean(value);
}

function labelValue(label: string, value?: string | number | null) {
  if (value === null || value === undefined || value === "") return null;
  return { label, value: String(value) };
}

function getCompletion(data: Record<string, any>) {
  const checks = [
    readString(data, "firstName", "playerFirstName", "nameFirst"),
    readString(data, "lastName", "playerLastName", "nameLast"),
    readString(data, "gradYear", "graduationYear", "classYear"),
    readString(data, "school", "highSchool", "hsName"),
    readString(data, "gpa", "GPA"),
    readString(data, "primaryPosition", "primaryPos", "position"),
    readString(data, "height", "heightDisplay"),
    readString(data, "weight", "weightDisplay"),
    readString(data, "bats"),
    readString(data, "throws", "throwingHand"),
    readString(data, "bio", "playerBio", "summary"),
    readString(data, "highlightVideoUrl", "videoUrl", "primaryVideoUrl"),
    readString(data, "sixty", "sixtyYard", "sixtyTime"),
    readString(data, "exitVelo", "exitVelocity"),
    readString(data, "infieldVelo", "outfieldVelo", "pitchingVelo", "fastballVelo"),
  ];

  const completed = checks.filter(hasValue).length;
  return Math.round((completed / checks.length) * 100);
}

function getReadinessLabel(score: number) {
  if (score >= 90) return "Recruiting Ready";
  if (score >= 75) return "Strong Foundation";
  if (score >= 55) return "Needs a Few Updates";
  return "Needs Profile Work";
}

function getDivisionLane(data: Record<string, any>) {
  const exitVelo = Number(readString(data, "exitVelo", "exitVelocity") || 0);
  const sixty = Number(readString(data, "sixty", "sixtyYard", "sixtyTime") || 0);
  const gpa = Number(readString(data, "gpa", "GPA") || 0);

  if (exitVelo >= 92 || (sixty > 0 && sixty <= 6.9)) return "NCAA D1 / High D2 Watch";
  if (exitVelo >= 86 || (sixty > 0 && sixty <= 7.2)) return "NCAA D2 / Strong D3 / NAIA Lane";
  if (gpa >= 3.4) return "Academic D3 / NAIA / JUCO Fit Lane";
  return "Development + Exposure Lane";
}

export default async function ParentRecruitingSnapshotPage({ params }: PageProps) {
  const user = await getCurrentUser();

  if (!user?.id) {
    redirect("/login?role=parent");
  }

  const playerProfileId = String(params?.playerProfileId || "").trim();
  if (!playerProfileId) notFound();

  const parentProfile = await prisma.parentProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  if (!parentProfile?.id) notFound();

  const link = await prisma.parentPlayerLink.findUnique({
    where: {
      parentProfileId_playerProfileId: {
        parentProfileId: parentProfile.id,
        playerProfileId,
      },
    },
    select: {
      relationship: true,
      isPrimary: true,
      playerProfile: {
        select: {
          id: true,
          email: true,
          data: true,
          updatedAt: true,
          user: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
      },
    },
  });

  if (!link?.playerProfile) notFound();

  const profile = link.playerProfile;
  const data = asRecord(profile.data);

  const firstName = readString(data, "firstName", "playerFirstName", "nameFirst");
  const lastName = readString(data, "lastName", "playerLastName", "nameLast");
  const fullName =
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    profile.user?.name?.trim() ||
    profile.email.split("@")[0];

  const gradYear = readString(data, "gradYear", "graduationYear", "classYear");
  const primaryPosition = readString(data, "primaryPosition", "primaryPos", "position");
  const school = readString(data, "school", "highSchool", "hsName");
  const gpa = readString(data, "gpa", "GPA");
  const exitVelo = readString(data, "exitVelo", "exitVelocity");
  const sixty = readString(data, "sixty", "sixtyYard", "sixtyTime");
  const highlightVideo = readString(data, "highlightVideoUrl", "videoUrl", "primaryVideoUrl");
  const bio = readString(data, "bio", "playerBio", "summary");

  const completion = getCompletion(data);
  const readiness = getReadinessLabel(completion);
  const lane = getDivisionLane(data);

  const publicProfileHref = profile.user?.slug
    ? `/player/${encodeURIComponent(profile.user.slug)}`
    : null;

  const actionItems = [
    !highlightVideo ? "Upload a current highlight or skills video." : null,
    !exitVelo ? "Add current exit velocity or verified hitting metric." : null,
    !sixty ? "Add a current 60-yard dash time." : null,
    !gpa ? "Add academic information so schools can evaluate fit." : null,
    !bio ? "Add a short player summary written for college coaches." : null,
    completion < 90 ? "Keep profile completion moving toward 90%+." : null,
  ].filter(Boolean) as string[];

  const snapshotItems = [
    labelValue("Profile Completion", `${completion}%`),
    labelValue("Readiness", readiness),
    labelValue("Suggested Lane", lane),
    labelValue("Graduation Year", gradYear || "Not added"),
    labelValue("Primary Position", primaryPosition || "Not added"),
    labelValue("School", school || "Not added"),
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  const metricItems = [
    labelValue("GPA", gpa || "Not added"),
    labelValue("Exit Velocity", exitVelo || "Not added"),
    labelValue("60 Yard", sixty || "Not added"),
    labelValue("Video", highlightVideo ? "Added" : "Not added"),
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <section style={hero}>
        <div style={eyebrow}>Parent Recruiting Snapshot</div>
        <h1 style={h1}>{fullName}</h1>
        <p style={heroText}>
          A parent-friendly view of recruiting readiness, profile completion, and
          next steps. This page is read-only and does not allow parents to manage
          coach conversations or manipulate Truth Fit calculations.
        </p>

        <div style={actionRow}>
          <Link
            href={`/dashboard/parent/player/${encodeURIComponent(profile.id)}`}
            style={ghostBtn}
          >
            Player Overview
          </Link>

          {publicProfileHref ? (
            <Link href={publicProfileHref} style={goldBtn}>
              View Public Profile
            </Link>
          ) : null}
        </div>
      </section>

      <section style={grid2}>
        <div style={card}>
          <div style={cardTitle}>Recruiting Readiness</div>
          <div style={bigNumber}>{completion}%</div>
          <div style={bodyText}>{readiness}</div>

          <div style={meterTrack}>
            <div style={{ ...meterFill, width: `${completion}%` }} />
          </div>
        </div>

        <div style={card}>
          <div style={cardTitle}>Suggested Recruiting Lane</div>
          <div style={laneText}>{lane}</div>
          <div style={bodyText}>
            This is a directional parent snapshot based on available profile data.
            The full player recruiting tool remains player-facing.
          </div>
        </div>
      </section>

      <section style={card}>
        <div style={cardTitle}>Top Snapshot</div>
        <div style={infoGrid}>
          {snapshotItems.map((item) => (
            <InfoItem key={item.label} label={item.label} value={item.value} />
          ))}
        </div>
      </section>

      <section style={card}>
        <div style={cardTitle}>Key Recruiting Inputs</div>
        <div style={infoGrid}>
          {metricItems.map((item) => (
            <InfoItem key={item.label} label={item.label} value={item.value} />
          ))}
        </div>
      </section>

      <section style={card}>
        <div style={cardTitle}>What Moves the Meter?</div>

        {actionItems.length ? (
          <div style={{ display: "grid", gap: 10 }}>
            {actionItems.map((item) => (
              <div key={item} style={todoItem}>
                {item}
              </div>
            ))}
          </div>
        ) : (
          <div style={successBox}>
            Great shape. Keep metrics, video, and academic information updated
            throughout the season.
          </div>
        )}
      </section>

      <section style={card}>
        <div style={cardTitle}>Parent Accountability View</div>
        <div style={bodyText}>
          Future notifications can alert parents when coach activity happens —
          such as profile views, saves, or unread messages — without exposing
          private message contents or allowing parent interaction.
        </div>

        <div style={infoGrid}>
          <InfoItem label="Coach Activity" value="Coming soon" />
          <InfoItem label="Unread Messages" value="Badge-only view planned" />
          <InfoItem label="Profile Updated" value={new Date(profile.updatedAt).toLocaleString()} />
        </div>
      </section>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoRow}>
      <div style={infoLabel}>{label}</div>
      <div style={infoValue}>{value}</div>
    </div>
  );
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
  maxWidth: 860,
  lineHeight: 1.55,
  fontWeight: 600,
};

const actionRow: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  marginTop: 16,
};

const grid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: 16,
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

const bigNumber: React.CSSProperties = {
  fontSize: "3rem",
  fontWeight: 950,
  color: "#0f172a",
  letterSpacing: "-0.05em",
};

const laneText: React.CSSProperties = {
  fontSize: "1.45rem",
  fontWeight: 950,
  color: "#0f172a",
  letterSpacing: "-0.03em",
};

const bodyText: React.CSSProperties = {
  color: "#475569",
  lineHeight: 1.6,
  fontWeight: 600,
};

const meterTrack: React.CSSProperties = {
  height: 12,
  borderRadius: 999,
  background: "#f1f5f9",
  overflow: "hidden",
};

const meterFill: React.CSSProperties = {
  height: "100%",
  borderRadius: 999,
  background: "#caa042",
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

const todoItem: React.CSSProperties = {
  border: "1px solid #fde68a",
  background: "#fffbeb",
  color: "#78350f",
  borderRadius: 14,
  padding: 12,
  fontWeight: 800,
  lineHeight: 1.45,
};

const successBox: React.CSSProperties = {
  padding: "10px 12px",
  border: "1px solid #bbf7d0",
  background: "#f0fdf4",
  color: "#166534",
  borderRadius: 12,
  fontWeight: 800,
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