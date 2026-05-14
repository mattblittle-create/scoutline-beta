// app/dashboard/parent/player/[playerProfileId]/college-search/page.tsx

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import React from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

type PageProps = {
  params: {
    playerProfileId: string;
  };
  searchParams?: {
    q?: string;
    division?: string;
    state?: string;
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

function formatMoneyFromCents(cents?: number | null) {
  if (!cents || !Number.isFinite(cents)) return "—";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function getFitLabel(score: number) {
  if (score >= 80) return "Strong Family Fit";
  if (score >= 65) return "Good Fit";
  if (score >= 50) return "Possible Fit";
  return "Explore Carefully";
}

function estimateFamilyFit({
  college,
  playerState,
  playerRegion,
}: {
  college: any;
  playerState: string;
  playerRegion: string;
}) {
  let score = 50;

  if (playerState && college.state === playerState) score += 18;
  if (playerRegion && college.region === playerRegion) score += 10;

const tuition = Number(
  college.tuitionOutOfStateCents ?? college.tuitionInStateCents ?? 0
) / 100;

  if (tuition > 0 && tuition <= 20000) score += 14;
  else if (tuition > 0 && tuition <= 35000) score += 8;
  else if (tuition > 50000) score -= 8;

  if (college.division) score += 4;
  if (college.conference) score += 4;

  return Math.max(0, Math.min(100, score));
}

export default async function ParentCollegeSearchPage({
  params,
  searchParams,
}: PageProps) {
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
      playerProfile: {
        select: {
          id: true,
          email: true,
          data: true,
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

  const playerState = readString(data, "state");
  const playerRegion = readString(data, "region");

  const q = String(searchParams?.q || "").trim();
  const division = String(searchParams?.division || "").trim();
  const state = String(searchParams?.state || "").trim().toUpperCase();

  const colleges = await prisma.college.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { city: { contains: q, mode: "insensitive" } },
              { state: { contains: q, mode: "insensitive" } },
              { conference: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(division ? { division } : {}),
      ...(state ? { state } : {}),
    },
    orderBy: [{ name: "asc" }],
    take: 50,
    select: {
      id: true,
      name: true,
      slug: true,
      city: true,
      state: true,
      region: true,
      division: true,
      conference: true,
      control: true,
      tuitionInStateCents: true,
      tuitionOutOfStateCents: true,
    },
  });

  const publicProfileHref = profile.user?.slug
    ? `/player/${encodeURIComponent(profile.user.slug)}`
    : null;

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <section style={hero}>
        <div style={eyebrow}>Parent College Search</div>
        <h1 style={h1}>{fullName}</h1>
        <p style={heroText}>
          Explore colleges from a family planning perspective — division, region,
          conference, tuition, and general fit. This parent view is for discovery
          only and does not change the player’s recruiting board or Truth Fit
          calculations.
        </p>

        <div style={actionRow}>
          <Link
            href={`/dashboard/parent/player/${encodeURIComponent(profile.id)}`}
            style={ghostBtn}
          >
            Player Overview
          </Link>

          <Link
            href={`/dashboard/parent/player/${encodeURIComponent(
              profile.id
            )}/recruiting`}
            style={ghostBtn}
          >
            Recruiting Snapshot
          </Link>

          {publicProfileHref ? (
            <Link href={publicProfileHref} style={goldBtn}>
              View Public Profile
            </Link>
          ) : null}
        </div>
      </section>

      <section style={card}>
        <div style={cardTitle}>Search Filters</div>

        <form style={filterGrid}>
          <label style={label}>
            School / City / Conference
            <input
              name="q"
              defaultValue={q}
              placeholder="Search colleges..."
              style={input}
            />
          </label>

          <label style={label}>
            Division
            <select name="division" defaultValue={division} style={input}>
              <option value="">All Divisions</option>
              <option value="NCAA D1">NCAA D1</option>
              <option value="NCAA D2">NCAA D2</option>
              <option value="NCAA D3">NCAA D3</option>
              <option value="NAIA">NAIA</option>
              <option value="NJCAA D1">NJCAA D1</option>
              <option value="NJCAA D2">NJCAA D2</option>
              <option value="NJCAA D3">NJCAA D3</option>
            </select>
          </label>

          <label style={label}>
            State
            <input
              name="state"
              defaultValue={state}
              placeholder="SC, NC, GA..."
              style={input}
            />
          </label>

          <div style={{ display: "flex", gap: 10, alignItems: "end" }}>
            <button type="submit" style={goldBtn}>
              Search
            </button>

            <Link
              href={`/dashboard/parent/player/${encodeURIComponent(
                profile.id
              )}/college-search`}
              style={ghostBtn}
            >
              Reset
            </Link>
          </div>
        </form>
      </section>

      <section style={card}>
        <div style={cardHeaderRow}>
          <div style={cardTitle}>College Results</div>
          <div style={smallMuted}>
            Showing {colleges.length} result{colleges.length === 1 ? "" : "s"}
          </div>
        </div>

        {colleges.length === 0 ? (
          <div style={emptyState}>
            No colleges matched those filters. Try a broader search.
          </div>
        ) : (
          <div style={resultsGrid}>
            {colleges.map((college) => {
              const fitScore = estimateFamilyFit({
                college,
                playerState,
                playerRegion,
              });

              return (
                <article key={college.id} style={resultCard}>
                  <div>
                    <div style={schoolName}>{college.name}</div>
                    <div style={schoolMeta}>
                      {[college.city, college.state].filter(Boolean).join(", ") ||
                        "Location not added"}
                    </div>
                  </div>

                  <div style={infoGrid}>
                    <InfoItem label="Division" value={college.division || "—"} />
                    <InfoItem label="Conference" value={college.conference || "—"} />
                    <InfoItem label="Region" value={college.region || "—"} />
                    <InfoItem label="Control" value={college.control || "—"} />
                    <InfoItem
                      label="In-State Tuition"
                      value={formatMoneyFromCents(college.tuitionInStateCents)}
                    />
                    <InfoItem
                      label="Out-of-State Tuition"
                      value={formatMoneyFromCents(college.tuitionOutOfStateCents)}
                    />
                  </div>

                  <div style={fitBox}>
                    <div style={fitLabel}>{getFitLabel(fitScore)}</div>
                    <div style={fitScoreText}>{fitScore}/100 family fit score</div>
                  </div>

                  <div style={actionRow}>
                    {college.slug ? (
                      <Link
                        href={`/college/${encodeURIComponent(college.slug)}`}
                        style={goldBtn}
                      >
                        View College
                      </Link>
                    ) : null}

                    <Link
                      href={`/dashboard/parent/player/${encodeURIComponent(
                        profile.id
                      )}/recruiting`}
                      style={ghostBtn}
                    >
                      Back to Snapshot
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
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

const cardHeaderRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
};

const smallMuted: React.CSSProperties = {
  color: "#64748b",
  fontWeight: 700,
  fontSize: 12,
};

const filterGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: 14,
  alignItems: "end",
};

const label: React.CSSProperties = {
  display: "grid",
  gap: 7,
  fontWeight: 900,
  color: "#0f172a",
  fontSize: 13,
};

const input: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: "10px 12px",
  background: "#fff",
  outline: "none",
};

const resultsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: 16,
};

const resultCard: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  background: "#fff",
  padding: 16,
  display: "grid",
  gap: 14,
  boxShadow: "0 8px 20px rgba(15,23,42,0.045)",
};

const schoolName: React.CSSProperties = {
  fontSize: "1.1rem",
  fontWeight: 950,
  color: "#0f172a",
  letterSpacing: "-0.02em",
};

const schoolMeta: React.CSSProperties = {
  marginTop: 4,
  color: "#64748b",
  fontWeight: 700,
};

const infoGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
  gap: 10,
};

const infoRow: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 10,
  background: "#fff",
  display: "grid",
  gap: 5,
};

const infoLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 900,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: ".04em",
};

const infoValue: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 800,
  color: "#0f172a",
  lineHeight: 1.35,
  wordBreak: "break-word",
};

const fitBox: React.CSSProperties = {
  border: "1px solid #fde68a",
  background: "#fffbeb",
  color: "#78350f",
  borderRadius: 14,
  padding: 12,
  display: "grid",
  gap: 4,
};

const fitLabel: React.CSSProperties = {
  fontWeight: 950,
  color: "#78350f",
};

const fitScoreText: React.CSSProperties = {
  color: "#92400e",
  fontWeight: 800,
  fontSize: 13,
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