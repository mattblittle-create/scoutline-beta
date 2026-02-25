// app/staff/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export default async function StaffPortalPage() {
  const user = await getCurrentUser();

  // If logged in and is staff, go straight to admin
  if (user?.id) {
    const admin = await prisma.adminUser.findUnique({ where: { userId: user.id } });
    if (admin?.isActive) redirect("/admin");
  }

  return (
    <main style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div
        style={{
          width: "min(520px, 100%)",
          border: "1px solid rgba(0,0,0,0.12)",
          borderRadius: 14,
          padding: 22,
          background: "rgba(255,255,255,0.9)",
        }}
      >
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>ScoutLine Staff Portal</div>
          <div style={{ opacity: 0.75, marginTop: 4 }}>
            Admin · Support · Billing · Marketing · Dev
          </div>
        </div>

        <div style={{ lineHeight: 1.55, marginBottom: 14, opacity: 0.9 }}>
          This login is for internal ScoutLine staff accounts only.
        </div>

        {/* Uses your existing login route. If your route is different, we’ll swap it. */}
        <Link
          href={`/login?next=${encodeURIComponent("/admin")}`}
          style={{
            display: "inline-block",
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid rgba(0,0,0,0.18)",
            textDecoration: "none",
          }}
        >
          Continue to Staff Sign In
        </Link>

        <div style={{ marginTop: 14, fontSize: 11, opacity: 0.75 }}>
          Tip: keep this unlinked publicly, or add a subtle footer link labeled “Staff”.
        </div>
      </div>
    </main>
  );
}
