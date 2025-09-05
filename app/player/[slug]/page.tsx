// app/player/[slug]/page.tsx
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PageParams = { params: { slug: string } };

function formatHeight(ft?: number | null, inch?: number | null) {
  if (ft == null && inch == null) return null;
  const f = typeof ft === "number" ? ft : 0;
  const i = typeof inch === "number" ? inch : 0;
  return `${f}ft ${i}in`;
}

export default async function PlayerPage({ params }: PageParams) {
  const slug = (params?.slug || "").trim().toLowerCase();
  if (!slug) notFound();

  // Look up the user by slug and include the linked player
  const user = await prisma.user.findUnique({
    where: { slug },
    select: {
      name: true,
      email: true,
      photoUrl: true,
      Player: {
        select: {
          gradYear: true,
          primaryPos: true,
          secondaryPos: true,
          throws: true,
          bats: true,
          heightFt: true,
          heightIn: true,
          weightLb: true,
          gpa: true,
          plan: true,
        },
      },
    },
  });

  if (!user || !user.Player) {
    // If no user or no linked player record, show 404
    notFound();
  }

  const p = user.Player;
  const height = formatHeight(p.heightFt, p.heightIn);

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
              alt={user.name || "Player photo"}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            "No Photo"
          )}
        </div>

        <div style={{ minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 900 }}>
            {user.name || "Player"}
          </h1>
          <p style={{ margin: "4px 0 0", color: "#475569", fontWeight: 700 }}>
            {p.primaryPos ?? "Position"}{p.secondaryPos ? ` / ${p.secondaryPos}` : ""}
          </p>
          <p style={{ margin: "4px 0 0", color: "#334155" }}>
            {[
              p.gradYear ? `Class of ${p.gradYear}` : null,
              p.throws ? `Throws: ${p.throws}` : null,
              p.bats ? `Bats: ${p.bats}` : null,
            ]
              .filter(Boolean)
              .join(" • ")}
          </p>
        </div>
      </header>

      <section style={{ marginTop: 20, display: "grid", gap: 16 }}>
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <h2 style={{ marginTop: 0, fontSize: "1.25rem", fontWeight: 800 }}>
            Bio
          </h2>
          <ul style={{ margin: 0, paddingLeft: 18, color: "#334155" }}>
            {height ? <li>Height: {height}</li> : null}
            {typeof p.weightLb === "number" ? <li>Weight: {p.weightLb} lb</li> : null}
            {typeof p.gpa === "number" ? <li>GPA: {p.gpa}</li> : null}
            {p.plan ? <li>Plan: {p.plan}</li> : null}
          </ul>
        </div>

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
          </ul>
        </div>
      </section>
    </main>
  );
}
