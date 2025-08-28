// app/coach/by-email/[email]/page.tsx
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function CoachByEmailPage({
  params,
}: {
  params: { email: string };
}) {
  const email = decodeURIComponent(params.email || "").toLowerCase().trim();
  if (!email) notFound();

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      slug: true,
      name: true,
      role: true,
      program: true,
      photoUrl: true,
    },
  });

  if (!user) notFound();

  // If the user has a vanity slug, send to the canonical public profile
  if (user.slug) redirect(`/coach/${user.slug}`);

  // Fallback view if there's no slug yet — render a lightweight public card instead of redirecting home
  return (
    <main style={{ maxWidth: 860, margin: "0 auto", padding: "24px 16px" }}>
      <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800 }}>
        Coach Profile
      </h1>
      <p style={{ color: "#64748b", marginTop: 6 }}>
        This profile hasn’t been fully published yet. Here’s what we can show for now.
      </p>

      <section
        style={{
          marginTop: 16,
          padding: 16,
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          background: "#fff",
          display: "grid",
          gridTemplateColumns: "140px 1fr",
          gap: 16,
        }}
      >
        <div
          style={{
            width: 140,
            height: 140,
            borderRadius: 12, // box (not circle)
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
          <h2 style={{ margin: "0 0 8px", fontSize: "1.35rem", fontWeight: 800 }}>
            {user.name || "Coach"}
          </h2>
          <div style={{ color: "#334155", lineHeight: 1.6 }}>
            {user.role ? <div><strong>Role:</strong> {user.role}</div> : null}
            {user.program ? <div><strong>Program:</strong> {user.program}</div> : null}
            <div style={{ marginTop: 8, color: "#64748b", fontSize: 14 }}>
              Claim your vanity URL to publish your full profile.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
