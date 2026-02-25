// app/team/[slug]/page.tsx
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import ShareProfileWidget from "./ShareProfileWidget";
import RosterClient from "./RosterClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PublicTeam = {
  id: string;
  name: string;
  slug: string;
  teamType: string;
  city?: string | null;
  state?: string | null;
  websiteUrl?: string | null;
  logoUrl?: string | null;
  xUrl?: string | null;
  instagramUrl?: string | null;
  contactEmail?: string | null;
  phone?: string | null;
  phoneExt?: string | null;

  // comes from API
  phonePrivate?: boolean | null;
};

type PublicPlayerRow = {
  playerProfileId: string;
  publicSlug: string;
  firstName: string;
  lastName: string;
  gradYear?: number | null;
  primaryPos?: string | null;
  secondaryPos?: string | null;
  committed?: boolean;
  committedCollege?: string | null;
  photoUrl?: string | null;
};

async function getTeamPublic(slug: string) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "";

  if (base) {
    const res = await fetch(`${base}/api/team/public?slug=${encodeURIComponent(slug)}`, {
      cache: "no-store",
    }).catch(() => null);

    if (res && res.ok) return res.json();
  }

  const res2 = await fetch(`/api/team/public?slug=${encodeURIComponent(slug)}`, {
    cache: "no-store",
  }).catch(() => null);

  if (res2 && res2.ok) return res2.json();
  return null;
}

function safeText(v: any) {
  return String(v ?? "").trim();
}

/**
 * Accept:
 * - https://...
 * - http://...
 * - //...
 * - /relative
 * - bare domain like "example.com" or "www.example.com" (we'll prefix https://)
 */
function safeUrl(u: string | null | undefined) {
  const s = (u || "").trim();
  if (!s) return null;

  if (s.startsWith("/")) return s;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith("//")) return `https:${s}`;

  if (/^[a-z0-9.-]+\.[a-z]{2,}([/].*)?$/i.test(s)) return `https://${s}`;
  return null;
}

function digitsOnly(v: any) {
  return String(v ?? "").replace(/\D+/g, "");
}

function formatPhoneUS(phoneDigits: string) {
  const d = digitsOnly(phoneDigits).slice(0, 10);
  if (d.length !== 10) return d || "";
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function formatPhoneWithExt(phone: string | null | undefined, ext: string | null | undefined) {
  const p = digitsOnly(phone).slice(0, 10);
  if (!p) return "";
  const base = formatPhoneUS(p);

  const e = digitsOnly(ext).slice(0, 6);
  return e ? `${base}, ext ${e}` : base;
}

function locLine(team: PublicTeam) {
  const city = safeText(team.city);
  const state = safeText(team.state);
  if (city && state) return `${city}, ${state}`;
  if (city) return city;
  if (state) return state;
  return "";
}

function teamTypeLabel(raw: string) {
  const s = safeText(raw).toUpperCase();
  if (s === "HS" || s === "HIGH_SCHOOL" || s === "HIGHSCHOOL") return "High School";
  if (s === "TRAVEL") return "Travel";
  if (s === "COLLEGE") return "College";
  if (s === "TRAINING") return "Training";
  if (s === "OTHER") return "Other";
  return safeText(raw) || "Team";
}

function getOriginFromHeaders() {
  const h = headers();
  const proto = (h.get("x-forwarded-proto") || "http").split(",")[0].trim();
  const host = (h.get("x-forwarded-host") || h.get("host") || "").split(",")[0].trim();
  if (!host) return "";
  return `${proto}://${host}`;
}

/* ------------------- icons ------------------- */

function IconX(props: { size?: number }) {
  const s = props.size ?? 18;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="#000000"
        d="M18.9 2H22l-6.78 7.74L23 22h-6.2l-4.86-6.36L6.3 22H3.2l7.26-8.3L1 2h6.36l4.4 5.75L18.9 2Zm-1.09 18h1.72L6.42 3.9H4.58L17.8 20Z"
      />
    </svg>
  );
}

function IconInstagram(props: { size?: number }) {
  const s = props.size ?? 18;
  const gid = "igGradientTeam";
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gid} x1="0" y1="24" x2="24" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FEDA75" />
          <stop offset="0.25" stopColor="#FA7E1E" />
          <stop offset="0.5" stopColor="#D62976" />
          <stop offset="0.75" stopColor="#962FBF" />
          <stop offset="1" stopColor="#4F5BD5" />
        </linearGradient>
      </defs>

      <path
        fill={`url(#${gid})`}
        d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2Zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9ZM12 7a5 5 0 1 1 0 10a5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6a3 3 0 0 0 0-6Zm6.25-2.5a1.25 1.25 0 1 1 0 2.5a1.25 1.25 0 0 1 0-2.5Z"
      />
    </svg>
  );
}

function IconMail(props: { size?: number }) {
  const s = props.size ?? 18;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="#0ea5e9"
        d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 4.2-8 5.1-8-5.1V6l8 5.1L20 6v2.2Z"
      />
    </svg>
  );
}

function IconPhone(props: { size?: number }) {
  const s = props.size ?? 18;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="#0ea5e9"
        d="M6.6 10.8c1.4 2.7 3.6 4.9 6.3 6.3l2.1-2.1c.3-.3.8-.4 1.2-.2 1 .4 2 .6 3.1.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.4 21 3 13.6 3 4c0-.6.4-1 1-1h3.3c.6 0 1 .4 1 1 0 1.1.2 2.1.6 3.1.1.4.1.9-.2 1.2l-2.1 2.1Z"
      />
    </svg>
  );
}

function IconChat(props: { size?: number }) {
  const s = props.size ?? 18;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="#0ea5e9"
        d="M20 3H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h3v3a1 1 0 0 0 1.7.7L13.4 18H20a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Zm0 13h-7.1l-3.9 3.6V16H4V5h16v11Z"
      />
    </svg>
  );
}

export default async function PublicTeamPage({ params }: { params: { slug: string } }) {
  const rawSlug = String(params.slug || "").trim();
  const slugLower = rawSlug.toLowerCase();

  // ✅ canonical: force lowercase canonical URL
  if (rawSlug && rawSlug !== slugLower) {
    redirect(`/team/${encodeURIComponent(slugLower)}`);
  }

  if (!slugLower) {
    return (
      <main style={{ padding: 16 }}>
        <div style={card}>
          <div style={{ fontWeight: 900 }}>Team not found</div>
        </div>
      </main>
    );
  }

  const json = await getTeamPublic(slugLower);
  const ok = Boolean(json?.ok);
  const team: PublicTeam | null = ok ? (json?.data?.team as any) : null;
  const roster: PublicPlayerRow[] = ok ? ((json?.data?.roster || []) as any[]) : [];

  if (!team) {
    return (
      <main style={{ padding: 16 }}>
        <div style={card}>
          <div style={{ fontWeight: 950, fontSize: 18 }}>Team not found</div>
          <div style={{ marginTop: 6, color: "#64748b", fontWeight: 700 }}>
            That team slug doesn’t exist (or isn’t public yet).
          </div>
          <div style={{ marginTop: 12 }}>
            <Link href="/" style={btnGhost}>
              Back to Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ✅ canonical slug collision handling:
  // If DB slug differs from requested slug (ex: collisions -> "-2"), redirect to canonical.
  const canonical = safeText(team.slug).toLowerCase();
  if (canonical && canonical !== slugLower) {
    redirect(`/team/${encodeURIComponent(canonical)}`);
  }

  const location = locLine(team);

  const websiteUrl = safeUrl(team.websiteUrl);
  const xUrl = safeUrl(team.xUrl);
  const instagramUrl = safeUrl(team.instagramUrl);

  const email = safeText(team.contactEmail) || "";
  const mailHref = email ? `mailto:${email}` : null;

  const isPhonePrivate = Boolean(team.phonePrivate);
  const phoneDigits = digitsOnly(team.phone).slice(0, 10);
  const phoneLabel = phoneDigits ? formatPhoneWithExt(phoneDigits, team.phoneExt || null) : "";
  const telHref = !isPhonePrivate && phoneDigits ? `tel:+1${phoneDigits}` : null;

  const typeLabel = teamTypeLabel(team.teamType);

  // ✅ Share button: show only to TEAM_ADMIN (and not SCOUTLINE_ADMIN)
  const viewer = await getCurrentUser();
  const viewerRole = String((viewer as any)?.role || "").toUpperCase();

  let canShowShare = false;
  if (viewer?.id && viewerRole !== "SCOUTLINE_ADMIN") {
    const adminMembership = await prisma.teamMembership.findFirst({
      where: {
        teamId: team.id,
        userId: viewer.id,
        role: "TEAM_ADMIN",
        isActive: true,
      },
      select: { id: true },
    });
    canShowShare = !!adminMembership;
  }

  const origin = getOriginFromHeaders();
  const shareUrl = origin && team.slug ? `${origin}/team/${team.slug}` : "";

  // ✅ consistent disabled tooltips: "disabled look" but allow hover tooltips
  const disabledIconBase: React.CSSProperties = { ...iconLink, ...iconDisabledSoft };

  return (
    <main style={{ padding: 16, display: "grid", gap: 14 }}>
      <section style={hero}>
        {/* ✅ Share Profile button (top-right in header block) */}
        {canShowShare && shareUrl ? (
          <div style={shareBtnWrap}>
            <ShareProfileWidget shareUrl={shareUrl} />
          </div>
        ) : null}

        <div style={headerRow}>
          <div style={logoWrap}>
            {team.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={team.logoUrl}
                alt={`${team.name} logo`}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover", // ✅ per request
                }}
              />
            ) : (
              <div style={{ fontWeight: 950, color: "#64748b" }}>TEAM</div>
            )}
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={teamName}>{team.name}</div>

            <div style={metaLine}>
              {typeLabel}
              {location ? ` • ${location}` : ""}
            </div>

            {websiteUrl ? (
              <div style={{ marginTop: 8 }}>
                <a href={websiteUrl} target="_blank" rel="noreferrer" style={metaLink}>
                  {websiteUrl}
                </a>
              </div>
            ) : null}

            <div style={iconRow}>
              {/* Email */}
              {mailHref ? (
                <a href={mailHref} style={iconLink} title={email || "Email"}>
                  <IconMail size={18} />
                </a>
              ) : (
                <span style={disabledIconBase} title="Email not provided" aria-disabled="true">
                  <IconMail size={18} />
                </span>
              )}

              {/* Phone */}
              {telHref ? (
                <a href={telHref} style={iconLink} title={phoneLabel ? `Call: ${phoneLabel}` : "Call"}>
                  <IconPhone size={18} />
                </a>
              ) : (
                <span
                  style={disabledIconBase}
                  title={isPhonePrivate ? "Phone is Private" : "Phone not provided"}
                  aria-disabled="true"
                >
                  <IconPhone size={18} />
                </span>
              )}

              {/* X */}
              {xUrl ? (
                <a href={xUrl} target="_blank" rel="noreferrer" style={iconLink} title="X">
                  <IconX size={18} />
                </a>
              ) : (
                <span style={disabledIconBase} title="X not provided" aria-disabled="true">
                  <IconX size={18} />
                </span>
              )}

              {/* Instagram */}
              {instagramUrl ? (
                <a href={instagramUrl} target="_blank" rel="noreferrer" style={iconLink} title="Instagram">
                  <IconInstagram size={18} />
                </a>
              ) : (
                <span style={disabledIconBase} title="Instagram not provided" aria-disabled="true">
                  <IconInstagram size={18} />
                </span>
              )}

              {/* Chat (coming soon, not clickable) */}
              <span style={disabledIconBase} title="ScoutLine Chat (coming soon)" aria-disabled="true">
                <IconChat size={18} />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ✅ Roster: sorting + search + committed tooltip */}
      <RosterClient roster={roster} />

      <section style={footer}>
        <div style={{ color: "#64748b", fontWeight: 700, fontSize: 12 }}>
          Powered by ScoutLine • Public team profile
        </div>
      </section>
    </main>
  );
}

/* ---------------- Styles ---------------- */

const hero: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  background: "#fff",
  padding: 18,
  boxShadow: "0 4px 12px rgba(15, 23, 42, 0.06)",
  position: "relative",
};

const shareBtnWrap: React.CSSProperties = {
  position: "absolute",
  top: 14,
  right: 14,
  zIndex: 2,
};

const card: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  background: "#fff",
  padding: 14,
  boxShadow: "0 4px 12px rgba(15, 23, 42, 0.06)",
};

const headerRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "160px minmax(0, 1fr)",
  gap: 16,
  alignItems: "stretch",
};

const logoWrap: React.CSSProperties = {
  width: 160,
  height: 160,
  borderRadius: 24,
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  display: "grid",
  placeItems: "center",
  overflow: "hidden",
  flex: "0 0 auto",
};

const teamName: React.CSSProperties = {
  fontWeight: 950,
  fontSize: 26,
  color: "#0f172a",
  lineHeight: 1.15,
  letterSpacing: "-0.02em",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  paddingRight: 190, // ✅ keeps name clear of Share button area
};

const metaLine: React.CSSProperties = {
  marginTop: 8,
  color: "#475569",
  fontWeight: 800,
};

const metaLink: React.CSSProperties = {
  color: "#0ea5e9",
  fontWeight: 900,
  fontSize: 13,
  textDecoration: "none",
  borderBottom: "1px solid rgba(14, 165, 233, 0.35)",
  wordBreak: "break-word",
};

const iconRow: React.CSSProperties = {
  marginTop: 12,
  display: "flex",
  gap: 16,
  flexWrap: "wrap",
  alignItems: "center",
};

const iconLink: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 34,
  height: 34,
  borderRadius: 10,
  border: "1px solid rgba(14, 165, 233, 0.25)",
  background: "#fff",
  textDecoration: "none",
};

const iconDisabledSoft: React.CSSProperties = {
  opacity: 0.55,
  cursor: "not-allowed",
};

const btnGhost: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 900,
  textDecoration: "none",
  cursor: "pointer",
};

const footer: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  padding: 8,
};
