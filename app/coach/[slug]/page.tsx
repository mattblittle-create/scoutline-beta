// app/coach/[slug]/page.tsx
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PageParams = { params: { slug: string } };

export default async function CoachPage({ params }: PageParams) {
  const slug = (params?.slug || "").trim().toLowerCase();
  if (!slug) notFound();

  // Main fetch: avoid selecting fields that might not exist in DB yet
  const user = await prisma.user.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      role: true,
      // program: true, // ← intentionally NOT selecting to avoid runtime crash if column is missing
      photoUrl: true,
      workPhone: true,
      phonePrivate: true,
      email: true,
      slug: true,
    },
  });

  if (!user) notFound();

  // Optional: try to read `program` separately; if the column doesn't exist, ignore gracefully.
  let program: string | null = null;
  try {
    const r = await prisma.user.findUnique({
      where: { slug },
      select: { program: true },
    });
    program = r?.program ?? null;
  } catch {
    // Column probably doesn't exist yet; do nothing.
  }

  const title = user.role || "Coach";

  return (
    <main
      style={{
        maxWidth: 980,
        margin: "0 auto",
        padding: "24px 16px",
        color: "#0f172a",
      }}
    >
      <header style={{ display: "flex", gap: 18, alignItems: "center" }}>
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 16,
            background: "#f1f5f9",
            border: "1px solid #e2e8f0",
            overflow: "hidden",
            flex: "0 0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
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

        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 900 }}>
            {user.name || "Coach"}
          </h1>
          <p style={{ margin: "4px 0 0", color: "#475569", fontWeight: 700 }}>
            {title}
          </p>
          {program ? (
            <p style={{ margin: "4px 0 0", color: "#334155" }}>{program}</p>
          ) : null}
        </div>
      </header>

      <section style={{ marginTop: 20 }}>
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: "1.25rem", fontWeight: 800 }}>
            Contact
          </h2>
          <ul style={{ margin: 0, paddingLeft: 18, color: "#334155" }}>
            <li>Email: {user.email}</li>
            {user.workPhone && !user.phonePrivate ? (
              <li>Phone: {user.workPhone}</li>
            ) : (
              <li>Phone: (private)</li>
            )}
          </ul>
        </div>
      </section>
    </main>
  );
}
