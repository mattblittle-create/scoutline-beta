// app/coach/[slug]/page.tsx
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import ShareProfileWidget from "./ShareProfileWidget";

export const dynamic = "force-dynamic";

type RecruitingTarget = { gradYear: number; positions: string[] };

function clean(s: string | null | undefined) {
  const v = (s || "").trim();
  return v || null;
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

  // bare domain -> add https://
  if (/^[a-z0-9.-]+\.[a-z]{2,}([/].*)?$/i.test(s)) return `https://${s}`;

  return null;
}

function normalizeRecruitingTargets(input: any): RecruitingTarget[] {
  if (!Array.isArray(input)) return [];

  const cleaned = input
    .map((x) => {
      const gradYear = Number(x?.gradYear);
      const positions = Array.isArray(x?.positions)
        ? x.positions.map((p: any) => String(p || "").trim()).filter(Boolean)
        : [];
      if (!Number.isFinite(gradYear) || gradYear < 1900 || gradYear > 3000) return null;
      const uniq = Array.from(new Set(positions));
      return { gradYear, positions: uniq };
    })
    .filter(Boolean) as RecruitingTarget[];

  const byYear = new Map<number, Set<string>>();
  for (const row of cleaned) {
    if (!byYear.has(row.gradYear)) byYear.set(row.gradYear, new Set<string>());
    const set = byYear.get(row.gradYear)!;
    row.positions.forEach((p) => set.add(p));
  }

  return Array.from(byYear.entries())
    .map(([gradYear, set]) => ({ gradYear, positions: Array.from(set) }))
    .sort((a, b) => a.gradYear - b.gradYear);
}

function digitsOnly(v: any) {
  return String(v ?? "").replace(/\D+/g, "");
}

function formatPhoneUS(phoneDigits: string) {
  const d = digitsOnly(phoneDigits).slice(0, 10);
  if (d.length !== 10) return d || "";
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function formatPhoneWithExt(phone: string | null, ext: string | null) {
  const p = digitsOnly(phone).slice(0, 10);
  if (!p) return "";
  const base = formatPhoneUS(p);

  const e = digitsOnly(ext).slice(0, 6);
  return e ? `${base}, ext ${e}` : base;
}

function initialsFrom(name: string) {
  return (
    (name || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "SL"
  );
}

function toMoney(n: any) {
  const num = typeof n === "number" ? n : n == null ? NaN : Number(n);
  if (!Number.isFinite(num)) return null;
  return num.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function toInt(n: any) {
  const num = typeof n === "number" ? n : n == null ? NaN : Number(n);
  if (!Number.isFinite(num)) return null;
  return Math.round(num).toLocaleString("en-US");
}

function nonEmpty(v: any) {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

function getOriginFromHeaders() {
  const h = headers();
  const proto = (h.get("x-forwarded-proto") || "http").split(",")[0].trim();
  const host = (h.get("x-forwarded-host") || h.get("host") || "").split(",")[0].trim();
  if (!host) return "";
  return `${proto}://${host}`;
}

/* ------------------- small components ------------------- */

function SnapshotItem(props: { label: string; value: string }) {
  return (
    <div style={snapshotItem}>
      <div style={snapshotLabel}>{props.label}</div>
      <div style={snapshotValue}>{props.value}</div>
    </div>
  );
}

function IconX(props: { size?: number }) {
  const s = props.size ?? 16;
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
  const s = props.size ?? 16;
  const gid = "igGradient";
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

export default async function CoachPublicProfilePage({ params }: { params: { slug: string } }) {
  const slug = (params.slug || "").trim().toLowerCase();

  if (!slug) {
    return (
      <main style={wrap}>
        <div style={card}>
          <div style={title}>Coach not found</div>
          <div style={sub}>Missing slug.</div>
        </div>
      </main>
    );
  }

  const user = await prisma.user.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      email: true,
      workPhone: true,
      workPhoneExt: true,
      phonePrivate: true,
      photoUrl: true,
      collegeId: true,
      coachProfile: {
        select: {
          recruitingTargets: true,
          coachBio: true,
          staffTitle: true,
          contactEmail: true,
          coachXUrl: true,
          coachInstagramUrl: true,
        },
      },
      college: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          websiteUrl: true,
          programWebsiteUrl: true,
          division: true,
          conference: true,
          programBio: true,
          recruitingQuestionnaireUrl: true,
          programXUrl: true,
          programInstagramUrl: true,
        },
      },
    },
  });

  if (!user || !user.collegeId) {
    return (
      <main style={wrap}>
        <div style={card}>
          <div style={title}>Coach not found</div>
          <div style={sub}>This coach profile doesn’t exist or isn’t linked to a program yet.</div>
        </div>
      </main>
    );
  }

  // Viewer (to gate share button)
  const viewer = await getCurrentUser();
  const viewerRole = String((viewer as any)?.role || "").toUpperCase();
  const isSelfViewer = !!viewer?.id && viewer.id === user.id;
  const canShowShare = isSelfViewer && viewerRole !== "SCOUTLINE_ADMIN";

  const coachName = clean(user.name) || user.email.split("@")[0];
  const coachTitle = clean(user.coachProfile?.staffTitle) || "Coach";
  const coachPhoto = safeUrl(user.photoUrl);

  const coachEmail = clean((user.coachProfile as any)?.contactEmail) || user.email;
  const coachXUrl = safeUrl((user.coachProfile as any)?.coachXUrl);
  const coachInstagramUrl = safeUrl((user.coachProfile as any)?.coachInstagramUrl);

  const coachPhoneDigits = user.phonePrivate ? "" : digitsOnly(user.workPhone).slice(0, 10);
  const coachExtDigits = user.phonePrivate ? "" : digitsOnly(user.workPhoneExt).slice(0, 6);
  const coachPhoneLabel = user.phonePrivate
    ? "This coach has chosen not to share their phone number."
    : formatPhoneWithExt(coachPhoneDigits, coachExtDigits) || "—";

  const telHref = coachPhoneDigits ? `tel:+1${coachPhoneDigits}` : null;
  const mailHref = `mailto:${coachEmail}`;

  const coachBio = clean(user.coachProfile?.coachBio) || null;

  const collegeName = clean(user.college?.name) || "College / University";
  const collegeLogo = safeUrl(user.college?.logoUrl || null);

  const collegeWebsite = safeUrl(user.college?.websiteUrl || null);
  const programWebsite = safeUrl(user.college?.programWebsiteUrl || null);

  const recruitingQuestionnaireUrl = safeUrl((user.college as any)?.recruitingQuestionnaireUrl);
  const programXUrl = safeUrl((user.college as any)?.programXUrl);
  const programInstagramUrl = safeUrl((user.college as any)?.programInstagramUrl);

  const division = clean(user.college?.division) || null;
  const conference = clean(user.college?.conference) || null;

  const programBio = clean(user.college?.programBio) || null;

  // --- School Snapshot (future: real College fields) ---
  const c: any = user.college || {};

  const region = nonEmpty(c.region);
  const campusCity = nonEmpty(c.city);
  const campusState = nonEmpty(c.state);

  const studentBody = toInt(c.studentBodySize ?? c.enrollment);

  const tuitionInState = toMoney(c.tuitionInState);
  const tuitionOutState = toMoney(c.tuitionOutOfState);
  const tuitionInternational = toMoney(c.tuitionInternational);

  const roomAndBoard = toMoney(c.roomAndBoard);
  const booksAndMaterials = toMoney(c.booksAndMaterialsPerSemester ?? c.booksAndMaterials);

  const studentLifeUrl = safeUrl(c.studentLifeUrl);
  const admissionsUrl = safeUrl(c.admissionsUrl);
  const financialAidUrl = safeUrl(c.financialAidUrl);

  const hasSnapshot =
    !!region ||
    !!campusCity ||
    !!campusState ||
    !!studentBody ||
    !!tuitionInState ||
    !!tuitionOutState ||
    !!tuitionInternational ||
    !!roomAndBoard ||
    !!booksAndMaterials ||
    !!studentLifeUrl ||
    !!admissionsUrl ||
    !!financialAidUrl;

  const recruitingTargets = normalizeRecruitingTargets(user.coachProfile?.recruitingTargets);

  const origin = getOriginFromHeaders();
  const shareUrl = origin && user.slug ? `${origin}/coach/${user.slug}` : "";

  // ✅ Links row is links only now (socials moved to headers)
  const hasProgramLinksRow = !!collegeWebsite || !!programWebsite || !!recruitingQuestionnaireUrl;

  return (
    <main style={wrap}>
      {/* Program Brand (like dashboard header) */}
<section style={brandRow}>
  {/* Left side: logo + program name/meta + program socials (close to name) */}
  <div style={brandLeft}>
    <div style={collegeLogoWrap} aria-hidden="true">
      {collegeLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={collegeLogo} alt={`${collegeName} logo`} style={collegeLogoImg} />
      ) : (
        <div style={collegeLogoFallback}>{initialsFrom(collegeName)}</div>
      )}
    </div>

    <div style={brandMetaRow}>
      <div style={collegeNameText}>
        {collegeName}
        {division || conference ? (
          <span style={collegeMetaText}>
            {" "}
            — {division || "—"}
            {division && conference ? ", " : ""}
            {conference || ""}
          </span>
        ) : null}
      </div>

      {programXUrl || programInstagramUrl ? (
        <div style={programSocialRow}>
          {programXUrl ? (
            <a href={programXUrl} target="_blank" rel="noreferrer" style={iconLink} title="Program on X">
              <IconX size={18} />
            </a>
          ) : null}

          {programInstagramUrl ? (
            <a href={programInstagramUrl} target="_blank" rel="noreferrer" style={iconLink} title="Program on Instagram">
              <IconInstagram size={18} />
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  </div>

  {/* Right side: Share button (far right) */}
  {canShowShare && shareUrl ? (
    <div style={brandRight}>
      <ShareProfileWidget shareUrl={shareUrl} />
    </div>
  ) : null}
</section>

      {/* Main Header */}
      <section style={headerCard}>
        <div style={headerRow}>
          <div style={avatarWrapLg}>
            {coachPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coachPhoto} alt={`${coachName} headshot`} style={avatarImg} />
            ) : (
              <div style={avatarFallback}>{initialsFrom(coachName)}</div>
            )}
          </div>

          <div style={{ minWidth: 0, flex: "1 1 auto" }}>
            {/* ✅ Coach socials in header line with name */}
            <div style={coachTitleRow}>
              <div style={h1}>
                {coachName}
                {coachTitle ? <span style={h1Role}>, {coachTitle}</span> : null}
              </div>

              {coachXUrl || coachInstagramUrl ? (
                <div style={coachSocialRow}>
                  {coachXUrl ? (
                    <a href={coachXUrl} target="_blank" rel="noreferrer" style={iconLink} title="Coach on X">
                      <IconX size={18} />
                    </a>
                  ) : null}

                  {coachInstagramUrl ? (
                    <a href={coachInstagramUrl} target="_blank" rel="noreferrer" style={iconLink} title="Coach on Instagram">
                      <IconInstagram size={18} />
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>

            {/* Contact row (Line 1) — ONLY email + phone */}
            <div style={contactRow}>
              <span style={contactItem}>
                <a href={mailHref} style={contactLink}>
                  {coachEmail}
                </a>
              </span>

              <span style={contactItem}>
                {user.phonePrivate || !telHref ? (
                  <span style={contactMuted}>{coachPhoneLabel}</span>
                ) : (
                  <a href={telHref} style={contactLink}>
                    {coachPhoneLabel}
                  </a>
                )}
              </span>
            </div>

            {/* Program links row (Line 2) — ONLY links */}
            {hasProgramLinksRow ? (
              <div style={linksRow}>
                {collegeWebsite ? (
                  <a href={collegeWebsite} target="_blank" rel="noreferrer" style={metaLink}>
                    View School Website
                  </a>
                ) : null}

                {programWebsite ? (
                  <a href={programWebsite} target="_blank" rel="noreferrer" style={metaLink}>
                    View Program Website
                  </a>
                ) : null}

                {recruitingQuestionnaireUrl ? (
                  <a href={recruitingQuestionnaireUrl} target="_blank" rel="noreferrer" style={metaLink}>
                    Recruiting Questionnaire
                  </a>
                ) : null}
              </div>
            ) : null}

            {/* Bios */}
            {coachBio || programBio ? (
              <div style={bioBlock}>
                {coachBio ? (
                  <div style={bioSection}>
                    <div style={bioTitle}>Coach Bio</div>
                    <div style={bioText}>{coachBio}</div>
                  </div>
                ) : null}

                {programBio ? (
                  <div style={bioSection}>
                    <div style={bioTitle}>Program Bio</div>
                    <div style={bioText}>{programBio}</div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Recruiting Targets */}
      {recruitingTargets.length > 0 ? (
        <section style={card}>
          <div style={sectionTitle}>Recruiting Targets</div>
          <div style={sub}>Grad year(s) and position(s) this coach / program is actively recruiting.</div>

          <div style={{ display: "grid", gap: 12, marginTop: 6 }}>
            {recruitingTargets.map((t) => (
              <div key={t.gradYear} style={targetBox}>
                <div style={{ fontWeight: 900, color: "#0f172a" }}>Class of {t.gradYear}</div>

                <div style={chipsWrap}>
                  {(t.positions || []).length === 0 ? (
                    <span style={mutedSmall}>Positions not specified</span>
                  ) : (
                    t.positions.map((p) => (
                      <span key={`${t.gradYear}-${p}`} style={chip}>
                        {p}
                      </span>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* School Snapshot (future: populated from ScoutLine college DB) */}
      <section style={card}>
        <div style={sectionTitle}>School Snapshot</div>

        {!hasSnapshot ? (
          <div style={mutedSmall}>School details aren’t available yet for this program. Check back soon.</div>
        ) : (
          <>
            <div style={snapshotGrid}>
              {region ? <SnapshotItem label="Region" value={region} /> : null}

              {campusCity || campusState ? (
                <SnapshotItem
                  label="Location"
                  value={`${campusCity || "—"}${campusCity && campusState ? ", " : ""}${campusState || ""}`.trim()}
                />
              ) : null}

              {studentBody ? <SnapshotItem label="Student Body" value={studentBody} /> : null}

              {tuitionInState ? <SnapshotItem label="Avg Tuition (In-State)" value={tuitionInState} /> : null}
              {tuitionOutState ? <SnapshotItem label="Avg Tuition (Out-of-State)" value={tuitionOutState} /> : null}
              {tuitionInternational ? <SnapshotItem label="Avg Tuition (International)" value={tuitionInternational} /> : null}

              {roomAndBoard ? <SnapshotItem label="Room & Board" value={roomAndBoard} /> : null}
              {booksAndMaterials ? <SnapshotItem label="Books / Materials" value={booksAndMaterials} /> : null}
            </div>

            {studentLifeUrl || admissionsUrl || financialAidUrl ? (
              <div style={snapshotLinksRow}>
                {studentLifeUrl ? (
                  <a href={studentLifeUrl} target="_blank" rel="noreferrer" style={metaLink}>
                    Student Life
                  </a>
                ) : null}
                {admissionsUrl ? (
                  <a href={admissionsUrl} target="_blank" rel="noreferrer" style={metaLink}>
                    Admissions
                  </a>
                ) : null}
                {financialAidUrl ? (
                  <a href={financialAidUrl} target="_blank" rel="noreferrer" style={metaLink}>
                    Financial Aid
                  </a>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </section>

      <div style={footerNote}>ScoutLine Coach Profile • Public View</div>
    </main>
  );
}

/* ------------------- styles ------------------- */

const wrap: React.CSSProperties = {
  maxWidth: 980,
  margin: "0 auto",
  padding: "24px 16px",
  color: "#0f172a",
};

const card: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  background: "#fff",
  padding: 16,
  boxShadow: "0 4px 12px rgba(15,23,42,0.06)",
  display: "grid",
  gap: 10,
  marginTop: 12,
};

const headerCard: React.CSSProperties = {
  ...card,
  padding: 18,
  marginTop: 12,
};

const programSocialRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  flex: "0 0 auto",
};

const collegeLogoWrap: React.CSSProperties = {
  width: 56,
  height: 56,
  borderRadius: 14,
  overflow: "hidden",
  border: "1px solid #e5e7eb",
  background: "#fff",
  display: "grid",
  placeItems: "center",
  flex: "0 0 auto",
};

const collegeLogoImg: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const collegeLogoFallback: React.CSSProperties = {
  width: "100%",
  height: "100%",
  display: "grid",
  placeItems: "center",
  fontWeight: 900,
  color: "#0f172a",
  background: "#f8fafc",
};

const collegeNameText: React.CSSProperties = {
  fontSize: "1.75rem",
  fontWeight: 900,
  letterSpacing: "-0.02em",
  lineHeight: 1.15,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const collegeMetaText: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  color: "#0f172a",
};

const headerRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "160px minmax(0, 1fr)",
  gap: 18,
  alignItems: "stretch",
};

const avatarWrapLg: React.CSSProperties = {
  width: 160,
  height: "100%",
  minHeight: 160,
  borderRadius: 24,
  overflow: "hidden",
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  display: "grid",
  placeItems: "center",
  alignSelf: "stretch",
};

const avatarImg: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const avatarFallback: React.CSSProperties = {
  width: "100%",
  height: "100%",
  display: "grid",
  placeItems: "center",
  fontWeight: 900,
  color: "#0f172a",
  fontSize: 34,
};

const h1: React.CSSProperties = {
  fontSize: 26,
  fontWeight: 900,
  letterSpacing: "-0.02em",
  lineHeight: 1.15,
  margin: 0,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const h1Role: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  color: "#0f172a",
};

const coachTitleRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const coachSocialRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  flex: "0 0 auto",
};

const contactRow: React.CSSProperties = {
  marginTop: 10,
  display: "flex",
  gap: 35,
  flexWrap: "wrap",
  alignItems: "center",
};

const contactItem: React.CSSProperties = {
  fontSize: 13,
  color: "#0f172a",
  fontWeight: 800,
};

const contactLink: React.CSSProperties = {
  color: "#0ea5e9",
  fontWeight: 900,
  textDecoration: "none",
  borderBottom: "1px solid rgba(14,165,233,0.35)",
};

const contactMuted: React.CSSProperties = {
  color: "#94a3b8",
  fontWeight: 800,
};

const linksRow: React.CSSProperties = {
  marginTop: 8,
  display: "flex",
  gap: 35,
  flexWrap: "wrap",
  alignItems: "center",
};

const metaLink: React.CSSProperties = {
  color: "#0ea5e9",
  fontWeight: 900,
  fontSize: 13,
  textDecoration: "none",
  borderBottom: "1px solid rgba(14,165,233,0.35)",
};

const brandMetaRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  minWidth: 0,
};

const brandRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between", // ✅ creates far-right area for Share
  gap: 12,
  minWidth: 0,
};

const brandLeft: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  minWidth: 0,
  flex: "1 1 auto",
};

const brandRight: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flex: "0 0 auto",
};

const iconLink: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 34,
  height: 34,
  borderRadius: 10,
  border: "1px solid rgba(14,165,233,0.25)",
  background: "#fff",
  textDecoration: "none",
};

const bioBlock: React.CSSProperties = {
  marginTop: 12,
  display: "grid",
  gap: 14,
};

const bioSection: React.CSSProperties = {
  borderTop: "1px solid #eef2f7",
  paddingTop: 12,
};

const bioTitle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 900,
  color: "#0f172a",
};

const bioText: React.CSSProperties = {
  marginTop: 6,
  whiteSpace: "pre-wrap",
  lineHeight: 1.5,
  color: "#0f172a",
  fontSize: 14,
};

const snapshotGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10,
  marginTop: 6,
};

const snapshotItem: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  background: "#fff",
  borderRadius: 12,
  padding: 12,
};

const snapshotLabel: React.CSSProperties = {
  fontSize: 11,
  color: "#64748b",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const snapshotValue: React.CSSProperties = {
  marginTop: 6,
  fontSize: 14,
  fontWeight: 900,
  color: "#0f172a",
  wordBreak: "break-word",
};

const snapshotLinksRow: React.CSSProperties = {
  marginTop: 10,
  display: "flex",
  gap: 35,
  flexWrap: "wrap",
  alignItems: "center",
};

const targetBox: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  background: "#fff",
  padding: 12,
};

const chipsWrap: React.CSSProperties = {
  marginTop: 10,
  display: "flex",
  gap: 8,
  flexWrap: "wrap",
};

const chip: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 900,
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  color: "#0f172a",
};

const sectionTitle: React.CSSProperties = { fontSize: 14, fontWeight: 900 };
const title: React.CSSProperties = { fontSize: 16, fontWeight: 900 };
const sub: React.CSSProperties = { color: "#64748b", fontSize: 13, lineHeight: 1.35 };

const mutedSmall: React.CSSProperties = { color: "#94a3b8", fontSize: 12, lineHeight: 1.3 };

const footerNote: React.CSSProperties = { marginTop: 14, fontSize: 12, color: "#94a3b8", textAlign: "center" };
