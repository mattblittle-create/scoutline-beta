// app/dashboard/coach/layout.tsx
import type { ReactNode, CSSProperties } from "react";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import CoachHeaderActions from "./CoachHeaderActions";
import CoachProgramBrand from "./coachProgramBrand";

export const metadata = {
  title: "Coach Dashboard • ScoutLine",
  description: "College coach dashboard for recruiting and program profile.",
};

function normalizeEmail(v: any) {
  return String(v ?? "").trim().toLowerCase();
}

async function getCurrentUser(): Promise<{ collegeName: string; logoUrl: string }> {
  const jar = cookies();

  const uid = jar.get("scoutline_uid")?.value?.trim() || "";
  const devEmailCookie = normalizeEmail(jar.get("scoutline_dev_email")?.value || "");
  const devEmailEnv = normalizeEmail(process.env.DEV_USER_EMAIL || "");

  // 1) Prefer real uid cookie
  if (uid) {
    const user = await prisma.user.findUnique({
      where: { id: uid },
      include: { college: true },
    });
    const collegeName = user?.college?.name || "Your Program";
    const logoUrl = user?.college?.logoUrl || "";
    return { collegeName, logoUrl };
  }

  // 2) Dev fallback by email (cookie or env)
  if (process.env.NODE_ENV !== "production") {
    const email = devEmailCookie || devEmailEnv;
    if (email) {
      const user = await prisma.user.findUnique({
        where: { email },
        include: { college: true },
      });
      const collegeName = user?.college?.name || "Your Program";
      const logoUrl = user?.college?.logoUrl || "";
      return { collegeName, logoUrl };
    }
  }

  return { collegeName: "Your Program", logoUrl: "" };
}

export default async function CoachDashboardLayout({ children }: { children: ReactNode }) {
  const { collegeName, logoUrl } = await getCurrentUser();

  return (
    <section style={wrap}>
      <div style={headerRow}>
        {/* ✅ Client component handles img onError */}
        <CoachProgramBrand collegeName={collegeName} logoUrl={logoUrl} />

        {/* ✅ Client-side: hides on /dashboard/coach, highlights active link, shows Back button only on sub-pages */}
        <CoachHeaderActions />
      </div>

      <div style={contentWrap}>{children}</div>
    </section>
  );
}

const wrap: CSSProperties = {
  maxWidth: 1100,
  margin: "0 auto",
  padding: "24px 16px",
  color: "#0f172a",
};

const headerRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 24,
  flexWrap: "wrap",
};

const contentWrap: CSSProperties = {
  background: "transparent",
  borderRadius: 14,
};
