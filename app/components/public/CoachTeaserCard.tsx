// app/components/public/CoachTeaserCard.tsx
"use client";

import React from "react";
import { QRCodeSVG } from "qrcode.react";

const GOLD = "#eab308"; // tweak if your button gold is different
const NAVY = "#0f172a";

export type CoachTeaserCardProps = {
  photoUrl: string;
  fullName: string;
  gradYear?: number | null;

  positions: {
    primary: string;
    secondary?: string | null;
    pitcherHand?: "RHP" | "LHP" | null;
  };

  height?: string; // e.g. 6'1
  weight?: string; // e.g. 185 lb
  dob?: string; // formatted mm/dd/yyyy or similar (accepted but not displayed)
  gpa?: string; // e.g. 4.33
  highSchool?: string | null; // unused but kept for compatibility

  bats?: string; // R / L / S
  throws?: string; // R / L / S

  hometownCity?: string | null;
  hometownState?: string | null;

  // Single-season stats (intended to be the most recent season)
  hitting?:
    | {
        ab?: number | null;
        r?: number | null;
        h?: number | null;
        rbi?: number | null;
        avg?: number | null;
        obp?: number | null;
        slg?: number | null;
      }
    | null;

  pitching?:
    | {
        ip?: number | null;
        bf?: number | null;
        h?: number | null;
        er?: number | null;
        bb?: number | null;
        so?: number | null;
        era?: number | null;
      }
    | null;

  // Fielding (single season)
  fielding?:
    | {
        a?: number | null;
        po?: number | null;
        e?: number | null;
        tc?: number | null;
        fpct?: number | null;
      }
    | null;

  // Catching (single season)
  catching?:
    | {
        inn?: number | null;
        sb?: number | null;
        cs?: number | null;
        pb?: number | null;
      }
    | null;

  // Season label + team name for stat headers
  // Example: seasonLabel = "Summer 2025", teamName = "The Battery HS"
  seasonLabel?: string | null;
  teamName?: string | null;

  academicBio?: string;
  athleticBio?: string;
  highSchoolName?: string | null;

  profileUrl: string;
  onSendCardClick?: () => void; // kept for future use
  /** Optional override if you ever change the asset path */
  logoUrl?: string;
};

function formatRate(
  value: number | null | undefined,
  digits: number = 3
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(digits);
}

function formatInt(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return String(Math.round(n));
}

function truncateForCard(
  text: string | undefined | null,
  maxChars = 400
): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return trimmed.slice(0, maxChars).trim() + "…";
}

const CoachTeaserCard: React.FC<CoachTeaserCardProps> = (props) => {
  const {
    photoUrl,
    fullName,
    gradYear,
    positions,
    height,
    weight,
    dob, // still accepted but not rendered
    gpa,
    bats,
    throws,
    hometownCity,
    hometownState,
    hitting,
    pitching,
    fielding,
    catching,
    seasonLabel,
    teamName,
    academicBio,
    athleticBio,
    highSchoolName,
    profileUrl,
    onSendCardClick: _onSendCardClick, // accepted but not used (for future)
    logoUrl = "/scoutline-logo-gold.png",
  } = props;

  const gradLabel =
    typeof gradYear === "number" ? `c/o ${String(gradYear).slice(0)}` : "";

  const hometownLabel = [
    (hometownCity || "").trim(),
    (hometownState || "").trim(),
  ]
    .filter(Boolean)
    .join(", ");

  const positionParts = [
    positions.primary,
    positions.secondary || undefined,
    positions.pitcherHand || undefined,
  ].filter(Boolean) as string[];

  const positionLine = positionParts.join(" | ");

  const hasHitting = !!hitting;
  const hasPitching = !!pitching;
  const hasFielding = !!fielding;
  const hasCatching = !!catching;

  // How many stat blocks will actually render?
  // Hitting + Fielding blocks are always shown (even if "No stats to show yet").
  const statsBlockCount =
    1 + // Hitting block
    1 + // Fielding block
    (hasPitching ? 1 : 0) +
    (hasCatching ? 1 : 0);

  // Dynamic bio length based on how crowded the stats area is.
  function bioMaxCharsForBlocks(blocks: number): number {
    if (blocks >= 4) return 350; // tightest when all 4 blocks show
    if (blocks === 3) return 450;
    if (blocks === 2) return 600;
    if (blocks === 1) return 750;
    return 750; // no stats blocks – plenty of room
  }

  const bioMax = bioMaxCharsForBlocks(statsBlockCount);
  const truncatedAcademicBio = truncateForCard(academicBio, bioMax);
  const truncatedAthleticBio = truncateForCard(athleticBio, bioMax);

  const seasonTeamLabel = [seasonLabel, teamName]
    .map((s) => (s || "").trim())
    .filter(Boolean)
    .join(" \u2022 "); // " • "

  const statHeaderBase: React.CSSProperties = {
    background: GOLD,
    color: NAVY,
    padding: "4px 6px",
    fontSize: 13,
    fontWeight: 900,
    letterSpacing: 1,
    textTransform: "uppercase",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  };

  const statHeaderSeasonStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    textTransform: "none",
    color: "#111827",
    opacity: 0.9,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    flex: "0 1 auto",
  };

  return (
    <div
      style={{
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        display: "flex",
        justifyContent: "center",
        padding: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          background: "#fdfaf3",
          border: `4px solid ${GOLD}`,
          borderRadius: 12,
          padding: 12,
          maxWidth: 1100,
          width: "100%",
          boxShadow: "0 10px 25px rgba(15,23,42,0.12)",
        }}
      >
        {/* FRONT SIDE (LEFT) */}
        <section
          style={{
            flex: "1 1 320px",
            minWidth: 280,
            background: "#ffffff",
            borderRadius: 10,
            border: `3px solid ${GOLD}`,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Name bar */}
          <div
            style={{
              background: "#fef3c7",
              borderBottom: `2px solid ${GOLD}`,
              padding: "8px 12px",
            }}
          >
            {/* Line 1: Name + Hometown (same line) */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "baseline",
                gap: 6,
              }}
            >
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 900,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  color: NAVY,
                  lineHeight: 1.2,
                }}
              >
                {fullName}
              </span>
              {hometownLabel && (
                <>
                  <span
                    style={{
                      color: "#9ca3af",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    •
                  </span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#6b7280",
                      textTransform: "uppercase",
                    }}
                  >
                    {hometownLabel}
                  </span>
                </>
              )}
            </div>

            {/* Line 2: c/o yyyy • High School */}
            {(gradLabel || highSchoolName) && (
              <div
                style={{
                  marginTop: 2,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#6b7280",
                  textTransform: "uppercase",
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 4,
                  alignItems: "center",
                }}
              >
                {gradLabel && <span>{gradLabel}</span>}
                {gradLabel && highSchoolName && (
                  <span style={{ color: "#9ca3af" }}>•</span>
                )}
                {highSchoolName && <span>{highSchoolName}</span>}
              </div>
            )}
          </div>

          {/* Photo */}
          <div
            style={{
              position: "relative",
              flex: "1 1 auto",
              minHeight: 260,
              background: "#0f172a",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl}
              alt={fullName}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>

          {/* Positions, Bats/Throws & logo */}
          <div
            style={{
              borderTop: `2px solid ${GOLD}`,
              padding: "8px 10px 10px 10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            {/* Left: positions */}
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: NAVY,
                textTransform: "uppercase",
                flex: "0 1 auto",
                minWidth: 0,
              }}
            >
              {positionLine}
            </div>

            {/* Center: Bats | Throws */}
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: NAVY,
                textTransform: "uppercase",
                flex: "0 0 auto",
                whiteSpace: "nowrap",
              }}
            >
              Bats:{" "}
              <span style={{ fontWeight: 800 }}>{bats || "—"}</span> | Throws:{" "}
              <span style={{ fontWeight: 800 }}>{throws || "—"}</span>
            </div>

            {/* Right: logo */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                flex: "0 0 auto",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt="ScoutLine"
                style={{
                  height: 26, // smaller logo
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </div>
          </div>
        </section>

        {/* BACK SIDE (RIGHT) */}
        <section
          style={{
            flex: "1 1 360px",
            minWidth: 300,
            background: "#fefce8",
            borderRadius: 10,
            border: `2px solid ${GOLD}`,
            padding: "12px 16px 14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {/* Line 1: Height, Weight, GPA */}
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: NAVY,
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              alignItems: "center",
            }}
          >
            {height && (
              <span>
                Height: <span style={{ fontWeight: 800 }}>{height}</span>
              </span>
            )}

            {height && weight && <span style={{ color: "#9ca3af" }}>•</span>}

            {weight && (
              <span>
                Weight: <span style={{ fontWeight: 800 }}>{weight}</span>
              </span>
            )}

            {(height || weight) && gpa && (
              <span style={{ color: "#9ca3af" }}>•</span>
            )}

            {gpa && (
              <span>
                GPA: <span style={{ fontWeight: 800 }}>{gpa}</span>
              </span>
            )}
          </div>

          {/* Stats tables – hitting / pitching / fielding / catching */}
          <div
            style={{
              marginTop: 4,
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            {/* Hitting (always present, may show "No stats to show yet") */}
            <div
              style={{
                flex:
                  hasPitching || hasFielding || hasCatching
                    ? "1 1 260px"
                    : "1 1 100%",
                minWidth: 230,
                borderRadius: 8,
                overflow: "hidden",
                border: "1px solid #e5e7eb",
                background: "#ffffff",
              }}
            >
              <div style={statHeaderBase}>
                <span>HITTING</span>
                {seasonTeamLabel && (
                  <span style={statHeaderSeasonStyle}>{seasonTeamLabel}</span>
                )}
              </div>
              {hasHitting ? (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 11,
                  }}
                >
                  <tbody>
                    <tr
                      style={{
                        background: "#f9fafb",
                        fontWeight: 700,
                      }}
                    >
                      <td style={{ padding: "4px 6px" }}>AB</td>
                      <td style={{ padding: "4px 6px" }}>R</td>
                      <td style={{ padding: "4px 6px" }}>H</td>
                      <td style={{ padding: "4px 6px" }}>RBI</td>
                      <td style={{ padding: "4px 6px" }}>AVG</td>
                      <td style={{ padding: "4px 6px" }}>OBP</td>
                      <td style={{ padding: "4px 6px" }}>SLG</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "4px 6px" }}>
                        {formatInt(hitting?.ab)}
                      </td>
                      <td style={{ padding: "4px 6px" }}>
                        {formatInt(hitting?.r)}
                      </td>
                      <td style={{ padding: "4px 6px" }}>
                        {formatInt(hitting?.h)}
                      </td>
                      <td style={{ padding: "4px 6px" }}>
                        {formatInt(hitting?.rbi)}
                      </td>
                      <td style={{ padding: "4px 6px" }}>
                        {formatRate(hitting?.avg)}
                      </td>
                      <td style={{ padding: "4px 6px" }}>
                        {formatRate(hitting?.obp)}
                      </td>
                      <td style={{ padding: "4px 6px" }}>
                        {formatRate(hitting?.slg)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <div
                  style={{
                    padding: "6px 8px",
                    fontSize: 11,
                    color: "#9ca3af",
                  }}
                >
                  No stats to show yet.
                </div>
              )}
            </div>

            {/* Pitching – ONLY render if latest season has pitching stats */}
            {hasPitching && (
              <div
                style={{
                  flex: "1 1 260px",
                  minWidth: 230,
                  borderRadius: 8,
                  overflow: "hidden",
                  border: "1px solid #e5e7eb",
                  background: "#ffffff",
                }}
              >
                <div style={statHeaderBase}>
                  <span>PITCHING</span>
                  {seasonTeamLabel && (
                    <span style={statHeaderSeasonStyle}>
                      {seasonTeamLabel}
                    </span>
                  )}
                </div>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 11,
                  }}
                >
                  <tbody>
                    <tr
                      style={{
                        background: "#f9fafb",
                        fontWeight: 700,
                      }}
                    >
                      <td style={{ padding: "4px 6px" }}>IP</td>
                      <td style={{ padding: "4px 6px" }}>BF</td>
                      <td style={{ padding: "4px 6px" }}>H</td>
                      <td style={{ padding: "4px 6px" }}>ER</td>
                      <td style={{ padding: "4px 6px" }}>BB</td>
                      <td style={{ padding: "4px 6px" }}>SO</td>
                      <td style={{ padding: "4px 6px" }}>ERA</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "4px 6px" }}>
                        {formatRate(pitching?.ip, 1)}
                      </td>
                      <td style={{ padding: "4px 6px" }}>
                        {formatInt(pitching?.bf)}
                      </td>
                      <td style={{ padding: "4px 6px" }}>
                        {formatInt(pitching?.h)}
                      </td>
                      <td style={{ padding: "4px 6px" }}>
                        {formatInt(pitching?.er)}
                      </td>
                      <td style={{ padding: "4px 6px" }}>
                        {formatInt(pitching?.bb)}
                      </td>
                      <td style={{ padding: "4px 6px" }}>
                        {formatInt(pitching?.so)}
                      </td>
                      <td style={{ padding: "4px 6px" }}>
                        {formatRate(pitching?.era, 2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Fielding (always present, may show "No stats to show yet") */}
            <div
              style={{
                flex: "1 1 260px",
                minWidth: 230,
                borderRadius: 8,
                overflow: "hidden",
                border: "1px solid #e5e7eb",
                background: "#ffffff",
              }}
            >
              <div style={statHeaderBase}>
                <span>FIELDING</span>
                {seasonTeamLabel && (
                  <span style={statHeaderSeasonStyle}>
                    {seasonTeamLabel}
                  </span>
                )}
              </div>
              {hasFielding ? (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 11,
                  }}
                >
                  <tbody>
                    <tr
                      style={{
                        background: "#f9fafb",
                        fontWeight: 700,
                      }}
                    >
                      <td style={{ padding: "4px 6px" }}>A</td>
                      <td style={{ padding: "4px 6px" }}>PO</td>
                      <td style={{ padding: "4px 6px" }}>E</td>
                      <td style={{ padding: "4px 6px" }}>TC</td>
                      <td style={{ padding: "4px 6px" }}>FPCT</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "4px 6px" }}>
                        {formatInt(fielding?.a)}
                      </td>
                      <td style={{ padding: "4px 6px" }}>
                        {formatInt(fielding?.po)}
                      </td>
                      <td style={{ padding: "4px 6px" }}>
                        {formatInt(fielding?.e)}
                      </td>
                      <td style={{ padding: "4px 6px" }}>
                        {formatInt(fielding?.tc)}
                      </td>
                      <td style={{ padding: "4px 6px" }}>
                        {formatRate(fielding?.fpct, 3)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <div
                  style={{
                    padding: "6px 8px",
                    fontSize: 11,
                    color: "#9ca3af",
                  }}
                >
                  No stats to show yet.
                </div>
              )}
            </div>

            {/* Catching – ONLY render if latest season has catching stats */}
            {hasCatching && (
              <div
                style={{
                  flex: "1 1 260px",
                  minWidth: 230,
                  borderRadius: 8,
                  overflow: "hidden",
                  border: "1px solid #e5e7eb",
                  background: "#ffffff",
                }}
              >
                <div style={statHeaderBase}>
                  <span>CATCHING</span>
                  {seasonTeamLabel && (
                    <span style={statHeaderSeasonStyle}>
                      {seasonTeamLabel}
                    </span>
                  )}
                </div>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 11,
                  }}
                >
                  <tbody>
                    <tr
                      style={{
                        background: "#f9fafb",
                        fontWeight: 700,
                      }}
                    >
                      <td style={{ padding: "4px 6px" }}>INN</td>
                      <td style={{ padding: "4px 6px" }}>SBA</td>
                      <td style={{ padding: "4px 6px" }}>CS</td>
                      <td style={{ padding: "4px 6px" }}>PB</td>
                    </tr>
                    <tr>
                      <td style={{ padding: "4px 6px" }}>
                        {formatRate(catching?.inn, 1)}
                      </td>
                      <td style={{ padding: "4px 6px" }}>
                        {formatInt(catching?.sb)}
                      </td>
                      <td style={{ padding: "4px 6px" }}>
                        {formatInt(catching?.cs)}
                      </td>
                      <td style={{ padding: "4px 6px" }}>
                        {formatInt(catching?.pb)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Bios */}
          {truncatedAcademicBio && (
            <div style={{ marginTop: 6 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: NAVY,
                  textTransform: "uppercase",
                  marginBottom: 2,
                }}
              >
                Academic Bio
              </div>
              <p
                style={{
                  fontSize: 12,
                  lineHeight: 1.4,
                  color: "#4b5563",
                  margin: 0,
                }}
              >
                {truncatedAcademicBio}
              </p>
            </div>
          )}

          {truncatedAthleticBio && (
            <div style={{ marginTop: 6 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: NAVY,
                  textTransform: "uppercase",
                  marginBottom: 2,
                }}
              >
                Athletic Bio
              </div>
              <p
                style={{
                  fontSize: 12,
                  lineHeight: 1.4,
                  color: "#4b5563",
                  margin: 0,
                }}
              >
                {truncatedAthleticBio}
              </p>
            </div>
          )}

          {/* Footer: Link + QR anchored to bottom */}
          <div
            style={{
              marginTop: "auto",
            }}
          >
            <div
              style={{
                marginTop: 8,
                paddingTop: 6,
                borderTop: "1px solid #e5e7eb",
                fontSize: 12,
                color: "#4b5563",
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ minWidth: 0, flex: "1 1 220px" }}>
                <div style={{ marginBottom: 2 }}>
                  View full profile on ScoutLine:
                </div>
                <a
                  href={profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: NAVY,
                    fontWeight: 700,
                    textDecoration: "underline",
                    wordBreak: "break-all",
                  }}
                >
                  {profileUrl}
                </a>
              </div>

              <div
                style={{
                  flex: "0 0 auto",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    textTransform: "uppercase",
                    fontWeight: 700,
                    color: "#6b7280",
                    marginBottom: 2,
                  }}
                >
                  Scan to view
                </div>
                <QRCodeSVG value={profileUrl} size={80} includeMargin={false} />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default CoachTeaserCard;
