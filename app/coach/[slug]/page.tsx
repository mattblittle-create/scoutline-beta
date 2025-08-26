// app/coach/[slug]/page.tsx
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import { notFound } from "next/navigation";

type LinkItem = { label?: string; url: string };
type PositionNeed = { year?: number | string; needs?: string[] };
type SchoolMeta = {
  schoolType?: string;
  enrollment?: string | number;
  campusType?: string;
  tuitionInState?: string;
  tuitionOutState?: string;
  tuitionIntl?: string;
  scholarships?: string;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isHttpUrl(u?: string | null) {
  if (!u) return false;
  try { const x = new URL(u); return x.protocol === "http:" || x.protocol === "https:"; } catch { return false; }
}

export default async function CoachBySlugPage({ params }: { params: { slug: string } }) {
  const slug = (params.slug || "").toLowerCase().trim();
  if (!slug) notFound();

  const user = await prisma.user.findFirst({
    where: { slug },
    select: {
      email: true, name: true, role: true, program: true,
      workPhone: true, phonePrivate: true, photoUrl: true,
      sport: true, division: true, conference: true, bio: true, preferredContact: true,
      programWebsiteUrl: true, campsUrl: true, recruitingUrl: true, questionnaireUrl: true,
      coachSocial: true, programSocial: true, positionNeeds: true, schoolMeta: true,
    }
  });

  if (!user) notFound();

  const coachSocial = (user.coachSocial ?? []) as LinkItem[];
  const programSocial = (user.programSocial ?? []) as LinkItem[];
  const positionNeeds = (user.positionNeeds ?? []) as PositionNeed[];
  const schoolMeta = (user.schoolMeta ?? {}) as SchoolMeta;

  const displayPhone = user.workPhone && !user.phonePrivate ? user.workPhone : null;
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
      <section style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 16, alignItems: "center", marginBottom: 18 }}>
        <div style={{ width: 120, height: 120, borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden", background: "#f8fafc", display: "grid", placeItems: "center" }}>
          {user.photoUrl && isHttpUrl(user.photoUrl) ? (
            <Image src={user.photoUrl} alt={user.name || "Coach photo"} width={120} height={120} style={{ objectFit: "cover" }} />
          ) : <span style={{ fontWeight: 800, color: "#64748b", fontSize: 14 }}>No Photo</span>}
        </div>

        <div>
          <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800, lineHeight: 1.2, color: "#0f172a" }}>
            {user.name || user.email}
          </h1>
          <p style={{ margin: "6px 0 0", color: "#475569", fontWeight: 700 }}>
            {(user.role || "Coach") + (user.program ? ` • ${user.program}` : "")}
          </p>
          {hasTopMeta && (
            <p style={{ margin: "8px 0 0", color: "#64748b" }}>
              {[user.sport, user.division, user.conference].filter(Boolean).join(" • ")}
            </p>
          )}
          <div style={{ marginTop: 8, color: "#334155" }}>
            <p style={{ margin: 0 }}><strong>Preferred contact:</strong> {user.preferredContact || "—"}</p>
            <p style={{ margin: 0 }}><strong>Email:</strong> {user.email}</p>
            {displayPhone && <p style={{ margin: 0 }}><strong>Phone:</strong> {displayPhone}</p>}
          </div>
        </div>
      </section>

      {user.bio && (
        <section className="card">
          <h2>About the Program / Coach</h2>
          <p style={{ margin: 0, color: "#334155", whiteSpace: "pre-wrap" }}>{user.bio}</p>
        </section>
      )}

      {hasLinks && (
        <section className="card">
          <h2>Links</h2>
          <div style={{ display: "grid", gap: 8 }}>
            {isHttpUrl(user.programWebsiteUrl) && <LinkRow label="Program Website" url={user.programWebsiteUrl!} />}
            {isHttpUrl(user.campsUrl) && <LinkRow label="Camps" url={user.campsUrl!} />}
            {isHttpUrl(user.recruitingUrl) && <LinkRow label="Recruiting Page" url={user.recruitingUrl!} />}
            {isHttpUrl(user.questionnaireUrl) && <LinkRow label="Recruit Questionnaire" url={user.questionnaireUrl!} />}
            {coachSocial?.length ? (
              <div style={{ marginTop: 4 }}>
                <h3>Coach Social</h3>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {coachSocial.map((s, i) => isHttpUrl(s?.url) ? (
                    <li key={`cs-${i}`}><a href={s.url} target="_blank" rel="noopener noreferrer" className="sl-link">{s.label || s.url}</a></li>
                  ) : null)}
                </ul>
              </div>
            ) : null}
            {programSocial?.length ? (
              <div style={{ marginTop: 4 }}>
                <h3>Program Social</h3>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {programSocial.map((s, i) => isHttpUrl(s?.url) ? (
                    <li key={`ps-${i}`}><a href={s.url} target="_blank" rel="noopener noreferrer" className="sl-link">{s.label || s.url}</a></li>
                  ) : null)}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      )}

      {hasNeeds && (
        <section className="card">
          <h2>Position Needs</h2>
          <div style={{ display: "grid", gap: 10 }}>
            {positionNeeds.map((pn, i) => (
              <div key={`pn-${i}`} style={{ border: "1px dashed #e5e7eb", borderRadius: 10, padding: "10px 12px" }}>
                <div style={{ fontWeight: 800, color: "#0f172a" }}>{pn.year ? `Class of ${pn.year}` : "Class: —"}</div>
                {pn.needs?.length ? (
                  <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                    {pn.needs.map((n, j) => <li key={`need-${i}-${j}`}>{n}</li>)}
                  </ul>
                ) : <p style={{ margin: "6px 0 0", color: "#64748b" }}>No specific needs listed.</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {hasSchool && (
        <section className="card">
          <h2>School Info</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
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
        .card { border:1px solid #e5e7eb; border-radius:12px; background:#fff; padding:16px; margin-bottom:16px; }
        .sl-link { color:#0f172a; text-decoration: underline; text-underline-offset:2px; }
      `}</style>
    </main>
  );
}

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
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: "10px 12px", background: "#f8fafc" }}>
      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>{label}</div>
      <div style={{ fontWeight: 800, color: "#0f172a" }}>{String(value)}</div>
    </div>
  );
}
