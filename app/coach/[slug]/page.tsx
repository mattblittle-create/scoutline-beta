import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

// ✅ Force Node runtime; Prisma won't work on edge
export const runtime = "nodejs";
// ✅ Don’t try to prerender this at build time
export const dynamic = "force-dynamic";

type PageProps = { params: { slug: string } };

export default async function CoachPublicPage({ params }: PageProps) {
  const slug = (params?.slug || "").toLowerCase().trim();
  if (!slug) return notFound();

  // Be defensive against DB errors
  let user:
    | (Awaited<ReturnType<typeof prisma.user.findUnique>>)
    | null = null;

  try {
    user = await prisma.user.findUnique({
      where: { slug },
      // include anything else you render here
    });
  } catch (err) {
    // Log server-side; show 404 to users (prevents 500 Application error)
    console.error("coach/[slug] DB error:", err);
    return notFound();
  }

  if (!user) return notFound();

  // Render safely: guard nullables
  const name = user.name || "Coach";
  const title = user.role || "Coach";
  const photo = (user as any).photoUrl || null; // adjust if your column is named differently

  return (
    <main style={{ maxWidth: 880, margin: "0 auto", padding: "24px 16px", color: "#0f172a" }}>
      <header style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 12,
            overflow: "hidden",
            background: "#f1f5f9",
            border: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            color: "#94a3b8",
          }}
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={`${name} photo`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            name.charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 900 }}>{name}</h1>
          <p style={{ margin: "4px 0 0", color: "#475569", fontWeight: 700 }}>{title}</p>
          {user.collegeProgram ? (
            <p style={{ margin: "4px 0 0", color: "#334155" }}>{user.collegeProgram}</p>
          ) : null}
        </div>
      </header>

      {/* Add whatever public details you want here */}
      <section style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
        <p style={{ margin: 0, color: "#475569" }}>
          Welcome to {name}&apos;s public profile on ScoutLine.
        </p>
      </section>
    </main>
  );
}
