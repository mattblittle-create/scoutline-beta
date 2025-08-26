// app/coach/[email]/page.tsx
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PageProps = { params: { email: string } };

export default async function CoachPublicProfile({ params }: PageProps) {
  const emailParam = decodeURIComponent(params.email || "").toLowerCase();

  const user = await prisma.user.findFirst({
    where: { email: emailParam },
    select: {
      email: true,
      name: true,
      role: true,
      program: true,
      photoUrl: true,
    },
  });

  if (!user) {
    return (
      <main style={{ maxWidth: 860, margin: "40px auto", padding: "0 16px" }}>
        <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800 }}>Coach not found</h1>
        <p style={{ color: "#475569", marginTop: 8 }}>
          We couldn’t find a coach with that email.
        </p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 860, margin: "40px auto", padding: "0 16px", color: "#0f172a" }}>
      <header style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        {/* Only render the image block if a photo exists */}
        {user.photoUrl ? (
          <div
            style={{
              width: 240,
              height: 240,
              border: "1px solid #e5e7eb",
              borderRadius: 12, // <- boxed look (rounded rectangle)
              overflow: "hidden",
              background: "#fff",
              boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
              flexShrink: 0,
            }}
          >
            {/* Using plain img to keep it simple */}
            <img
              src={user.photoUrl}
              alt={user.name ? `${user.name} profile photo` : "Coach photo"}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          </div>
        ) : null}

        <div>
          <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800 }}>
            {user.name || user.email}
          </h1>
          {user.role ? (
            <p style={{ margin: "6px 0 0", color: "#475569", fontWeight: 700 }}>{user.role}</p>
          ) : null}
          {user.program ? (
            <p style={{ margin: "4px 0 0", color: "#64748b" }}>{user.program}</p>
          ) : null}
        </div>
      </header>

      {/* Add more public profile sections here as you build them */}
    </main>
  );
}
