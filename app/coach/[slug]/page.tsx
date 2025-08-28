// app/coach/[slug]/page.tsx
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PageProps = { params: { slug: string } };

// Small helper for safe phone display
function formatPhone(p: string) {
  const digits = p.replace(/\D/g, "");
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  return p;
}

export default async function CoachPublicPage({ params }: PageProps) {
  const slug = (params?.slug || "").trim().toLowerCase();
  if (!slug) notFound();

  const user = await prisma.user.findUnique({
    where: { slug },
    select: {
      name: true,
      role: true,
      program: true,
      photoUrl: true,
      workPhone: true,
      phonePrivate: true,
      email: true,
      // add new fields here later (bio, socials, etc.)
    },
  });

  if (!user) notFound();

  const showPhone = !!(user.workPhone && !user.phonePrivate);

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "28px 16px", color: "#0f172a" }}>
      {/* Header / Hero */}
      <header
        style={{
          display: "grid",
          gridTemplateColumns: "160px 1fr",
          gap: 20,
          alignItems: "center",
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 16,
        }}
      >
        {/* Square (not circle) photo */}
        <div
          style={{
            width: 160,
            height: 160,
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            overflow: "hidden",
            background: "#f8fafc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            color: "#94a3b8",
          }}
        >
          {user.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.photoUrl}
              alt={user.name || "Coach photo"}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            "No Photo"
          )}
        </div>

        <div>
          <h1 style={{ margin: 0, fontSize: "2rem", fontWeight: 900 }}>
            {user.name || "Coach"}
          </h1>
          <p style={{ margin: "6px 0 0", color: "#334155", fontSize: "1.05rem" }}>
            {user.role ? <strong>{user.role}</strong> : null}
            {user.role && user.program ? " • " : null}
            {user.program ? <span>{user.program}</span> : null}
          </p>

          {/* Contact row */}
          <div style={{ marginTop: 10, display: "flex", gap: 14, flexWrap: "wrap", color: "#475569" }}>
            {/* Email is public for now (change later if needed) */}
            {user.email && (
              <a
                href={`mailto:${user.email}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  textDecoration: "none",
                  border: "1px solid #e5e7eb",
                  padding: "8px 10px",
                  borderRadius: 10,
                  background: "#fff",
                  fontWeight: 700,
                }}
              >
                📧 {user.email}
              </a>
            )}
            {/* Respect phone privacy */}
            {showPhone && (
              <a
                href={`tel:${user.workPhone}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  textDecoration: "none",
                  border: "1px solid #e5e7eb",
                  padding: "8px 10px",
                  borderRadius: 10,
                  background: "#fff",
                  fontWeight: 700,
                }}
                title="Work phone"
              >
                📞 {formatPhone(user.workPhone!)}
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Content Sections */}
      <section style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginTop: 16 }}>
        {/* Left column: About / placeholder for future fields */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
            minHeight: 160,
          }}
        >
          <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800 }}>About</h2>
          <p style={{ marginTop: 8, color: "#475569" }}>
            This coach hasn’t added a bio yet. Check back soon.
          </p>
          {/* Later: render user.bio, achievements, recruitingAreas, etc. */}
        </div>

        {/* Right column: Quick Facts */}
        <aside
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
            minHeight: 160,
          }}
        >
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800 }}>Quick facts</h3>
          <ul style={{ margin: "10px 0 0", paddingLeft: 18, color: "#475569", lineHeight: 1.6 }}>
            {user.program && <li>Program: {user.program}</li>}
            {user.role && <li>Role: {user.role}</li>}
            {/* Add more as you add fields (city/state, division, conference, etc.) */}
          </ul>
        </aside>
      </section>

      {/* Footer CTA (optional) */}
      <div
        style={{
          marginTop: 16,
          padding: 14,
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          background: "#fff",
          color: "#64748b",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <span>Are you this coach? Claim your profile to customize and share more details.</span>
        <a
          href="/onboarding/coach"
          style={{
            display: "inline-block",
            padding: "10px 14px",
            borderRadius: 10,
            background: "#caa042",
            color: "#0f172a",
            border: "1px solid #caa042",
            textDecoration: "none",
            fontWeight: 800,
          }}
        >
          Claim profile
        </a>
      </div>
    </main>
  );
}
