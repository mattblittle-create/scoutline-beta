// app/coach/[email]/page.tsx
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import { notFound } from "next/navigation";

// ---- Types that match your Prisma JSON fields ----
type LinkItem = { label?: string; url: string };
type PositionNeed = { year?: number | string; needs?: string[] };
type SchoolMeta = {
  schoolType?: string;          // e.g., "Public"
  enrollment?: string | number; // "22,000"
  campusType?: string;          // "Urban"
  tuitionInState?: string;      // "$11,500"
  tuitionOutState?: string;     // "$29,400"
  tuitionIntl?: string;         // optional
  scholarships?: string;        // "Athletic + Academic"
};

// Utility: guard URL
function isHttpUrl(u?: string | null) {
  if (!u) return false;
  try {
    const x = new URL(u);
    return x.protocol === "http:" || x.protocol === "https:";
  } catch {
    return false;
  }
}

export const runtime = "nodejs";   // ensure server runtime
export const dynamic = "force-dynamic";

type PageProps = { params: { email: string } };

export default async function CoachPublicProfile({ params }: PageProps) {
  const emailParam = decodeURIComponent(params.email || "").toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: emailParam },
    select: {
      email: true,
      name: true,
      role: true,
      workPhone: true,
      phonePrivate: true,
      program: true,
      photoUrl: true,

      sport: true,
      division: true,
      conference: true,
      bio: true,
      questionnaireUrl: true,
      preferredContact: true,

      coachSocial: true,     // Json
      programSocial: true,   // Json

      programWebsiteUrl: true,
      campsUrl: true,
      recruitingUrl: true,

      positionNeeds: true,   // Json
      schoolMeta: true,      // Json
    },
  });

  if (!user) notFound();

  // Parse JSON fields safely
  const coachSocial = (user.coachSocial ?? []) as LinkItem[];
  const programSocial = (user.programSocial ?? []) as LinkItem[];
  const positionNeeds = (user.positionNeeds ?? []) as PositionNeed[];
  const schoolMeta = (user.schoolMeta ?? {}) as SchoolMeta;

  // Derived display values
  const displayPhone =
    user.workPhone && !user.phonePrivate ? user.workPhone : null;

  // Simple section helpers
  const hasTopMeta = user.sport || user.division || user.conference;
  const hasLinks =
    isHttpUrl(user.programWebsiteUrl) ||
    isHttpUrl(user.campsUrl) ||
    isHttpUrl(user.recruitingUrl) ||
    isHttpUrl(user.questionnaireUrl) ||
    (coachSocial && coachSocial.length > 0) ||
    (programSocial && programSocial.length > 0);

  const hasNeeds = positionNeeds && positionNeeds.length > 0;
  const hasSchool = Object.values(schoolMeta || {}).some(Boolean);

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "24px 16px" }}>
      {/* Header / Hero */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "120px 1fr",
          gap: 16,
          alignItems: "center",
          marginBottom: 18,
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 12, // square-ish per your request
            border: "1px solid #e5e7eb",
            overflow: "hidden",
            background: "#f8fafc",
            display: "grid",
            placeItems: "center",
          }}
        >
          {user.photoUrl && isHttpUrl(user.photoUrl) ? (
            // Using next/image for optimization; fallback to <img> if you prefer
            <Image
              src={user.photoUrl}
              alt={user.name || "Coach photo"}
              width={120}
              height={120}
              style={{ objectFit: "cover" }}
            />
          ) : (
            <span
              style={{
                fontWeight: 800,
                color: "#64748b",
                fontSize: 14,
                textAlign: "center",
                padding: "0 8px",
              }}
            >
              No Photo
            </span>
          )}
        </div>

        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "1.75rem",
              fontWeight: 800,
              lineHeight: 1.2,
              color: "#0f172a",
            }}
          >
            {user.name || user.email}
          </h1>
          <p style={{ margin: "6px 0 0", color: "#475569", fontWeight: 700 }}>
            {(user.role || "Coach") + (user.program ? ` • ${user.program}` : "")}
          </p>

          {hasTopMeta && (
            <p style={{ margin: "8px 0 0", color: "#64748b" }}>
              {[user.sport, user.division, user.conference]
                .filter(Boolean)
                .join(" • ")}
            </p>
          )}

          <div style={{ marginTop: 8, color: "#334155" }}>
            <p style={{ margin: 0 }}>
              <strong>Preferred contact:</strong>{" "}
              {user.preferredContact || "—"}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Email:</strong> {user.email}
            </p>
            {displayPhone && (
              <p style={{ margin: 0 }}>
                <strong>Phone:</strong> {displayPhone}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Bio */}
      {user.bio && (
        <section
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
            background: "#ffffff",
            marginBottom: 16,
          }}
        >
          <h2 style={{ margin: "0 0 8px", fontSize: "1.125rem", fontWeight: 800 }}>
            About the Program / Coach
          </h2>
          <p style={{ margin: 0, color: "#334155", whiteSpace: "pre-wrap" }}>
            {user.bio}
          </p>
        </section>
      )}

      {/* Links & Socials */}
      {hasLinks && (
        <section
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
            background: "#ffffff",
            marginBottom: 16,
          }}
        >
          <h2 style={{ margin: "0 0 10px", fontSize: "1.125rem", fontWeight: 800 }}>
            Links
          </h2>

          <div style={{ display: "grid", gap: 8 }}>
            {isHttpUrl(user.programWebsiteUrl) && (
              <LinkRow label="Program Website" url={user.programWebsiteUrl!} />
            )}
            {isHttpUrl(user.campsUrl) && (
              <LinkRow label="Camps" url={user.campsUrl!} />
            )}
            {isHttpUrl(user.recruitingUrl) && (
              <LinkRow label="Recruiting Page" url={user.recruitingUrl!} />
            )}
            {isHttpUrl(user.questionnaireUrl) && (
              <LinkRow label="Recruit Questionnaire" url={user.questionnaireUrl!} />
            )}

            {coachSocial?.length ? (
              <div style={{ marginTop: 4 }}>
                <h3 style={{ margin: "8px 0 6px", fontSize: "1rem", fontWeight: 800 }}>
                  Coach Social
                </h3>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {coachSocial.map((s, i) =>
                    isHttpUrl(s?.url) ? (
                      <li key={`coach-social-${i}`} style={{ marginBottom: 4 }}>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="sl-link"
                        >
                          {s.label || s.url}
                        </a>
                      </li>
                    ) : null
                  )}
                </ul>
              </div>
            ) : null}

            {programSocial?.length ? (
              <div style={{ marginTop: 4 }}>
                <h3 style={{ margin: "8px 0 6px", fontSize: "1rem", fontWeight: 800 }}>
                  Program Social
                </h3>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {programSocial.map((s, i) =>
                    isHttpUrl(s?.url) ? (
                      <li key={`program-social-${i}`} style={{ marginBottom: 4 }}>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="sl-link"
                        >
                          {s.label || s.url}
                        </a>
                      </li>
                    ) : null
                  )}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      )}

      {/* Position Needs */}
      {hasNeeds && (
        <section
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
            background: "#ffffff",
            marginBottom: 16,
          }}
        >
          <h2 style={{ margin: "0 0 10px", fontSize: "1.125rem", fontWeight: 800 }}>
            Position Needs
          </h2>
          <div style={{ display: "grid", gap: 10 }}>
            {positionNeeds.map((pn, i) => (
              <div
                key={`pn-${i}`}
                style={{
                  border: "1px dashed #e5e7eb",
                  borderRadius: 10,
                  padding: "10px 12px",
                }}
              >
                <div style={{ fontWeight: 800, color: "#0f172a" }}>
                  {pn.year ? `Class of ${pn.year}` : "Class: —"}
                </div>
                {pn.needs?.length ? (
                  <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                    {pn.needs.map((n, j) => (
                      <li key={`pn-${i}-need-${j}`}>{n}</li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ margin: "6px 0 0", color: "#64748b" }}>No specific needs listed.</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* School Meta */}
      {hasSchool && (
        <section
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
            background: "#ffffff",
            marginBottom: 16,
          }}
        >
          <h2 style={{ margin: "0 0 10px", fontSize: "1.125rem", fontWeight: 800 }}>
            School Info
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 10,
            }}
          >
            <MetaRow label="Type" value={schoolMeta.schoolType} />
            <MetaRow label="Enrollment" value={schoolMeta.enrollment} />
            <MetaRow label="Campus" value={schoolMeta.campusType} />
            <MetaRow label="Tuition (In-State)" value={schoolMeta.tuitionInState} />
            <MetaRow label="Tuition (Out-of-State)" value={schoolMeta.tuitionOutState} />
            <MetaRow label="Tuition (International)" value={schoolMeta.tuitionIntl} />
            <MetaRow label="Scholarships" value={schoolMeta.scholarships} />
          </div>
        </section>
      )}

      <style>{`
        .sl-link {
          color: #0f172a;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .sl-link:hover { opacity: .85; }
      `}</style>
    </main>
  );
}

// ---- Small presentational helpers ----

function LinkRow({ label, url }: { label: string; url: string }) {
  if (!isHttpUrl(url)) return null;
  return (
    <div>
      <strong style={{ display: "inline-block", minWidth: 180 }}>{label}:</strong>{" "}
      <a href={url} target="_blank" rel="noopener noreferrer" className="sl-link">
        {url}
      </a>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value?: string | number }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        padding: "10px 12px",
        background: "#f8fafc",
      }}
    >
      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>{label}</div>
      <div style={{ fontWeight: 800, color: "#0f172a" }}>{String(value)}</div>
    </div>
  );
}
