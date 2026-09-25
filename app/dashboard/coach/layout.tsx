// app/dashboard/coach/layout.tsx
import type { ReactNode, CSSProperties } from "react";
import { redirect } from "next/navigation";
import CoachHeaderActions from "./CoachHeaderActions";
import CoachProgramBrand from "./coachProgramBrand";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export const metadata = {
  title: "Coach Dashboard • ScoutLine",
  description: "College coach dashboard for recruiting and program profile.",
};

export default async function CoachDashboardLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  // No more silent fallback into coach pages.
  // Must be a real authenticated user.
  if (!user) {
    redirect("/login?next=%2Fdashboard%2Fcoach");
  }

  const collegeName = user.college?.name || "Your Program";
  const logoUrl = user.college?.logoUrl || "";

  return (
    <section style={wrap}>
      <div style={headerRow}>
        <CoachProgramBrand collegeName={collegeName} logoUrl={logoUrl} />
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