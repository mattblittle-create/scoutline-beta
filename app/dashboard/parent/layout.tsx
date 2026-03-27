// app/dashboard/parent/layout.tsx
import { redirect } from "next/navigation";
import React from "react";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import ParentHeader from "./ParentHeader";

export default async function ParentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user?.id) {
    redirect("/login?next=%2Fdashboard%2Fparent");
  }

  const userRole = String(user.role || "").trim().toUpperCase();

  // allow parent users + admins (useful for support/impersonation)
  const canAccess = userRole === "PARENT" || userRole === "ADMIN";

  if (!canAccess) {
    redirect("/login?next=%2Fdashboard%2Fparent");
  }

  return (
    <main
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        padding: "24px 16px 40px",
        color: "#0f172a",
      }}
    >
      <div style={{ marginBottom: 14 }}>
        <h1
          style={{
            margin: 0,
            fontSize: "1.9rem",
            fontWeight: 900,
            letterSpacing: "-0.02em",
          }}
        >
          Parent Dashboard
        </h1>
        <p
          style={{
            margin: "8px 0 0",
            color: "#475569",
            lineHeight: 1.45,
            fontWeight: 600,
          }}
        >
          Manage your player’s ScoutLine profile and billing from one place.
        </p>
      </div>

      <ParentHeader />

      {children}
    </main>
  );
}