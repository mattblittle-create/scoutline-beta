// app/dashboard/parent/layout.tsx

import { redirect } from "next/navigation";
import React from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import ParentHeader from "./ParentHeader";
import { getParentDashboardContext } from "@/lib/parent/getParentDashboardContext";

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

  const canAccess = userRole === "PARENT" || userRole === "ADMIN";

  if (!canAccess) {
    redirect("/login?next=%2Fdashboard%2Fparent");
  }

  const parentProfile = await prisma.parentProfile.findUnique({
    where: { userId: user.id },
    select: {
      playerLinks: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        take: 1,
        select: {
          playerProfileId: true,
        },
      },
    },
  });

  const linkedPlayerProfileId =
    parentProfile?.playerLinks?.[0]?.playerProfileId || null;

  const context = await getParentDashboardContext();

  const ctx: any = context;

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
          Support your player’s ScoutLine journey, review profile progress, and
          manage account billing from one place.
        </p>
      </div>

<ParentHeader
  linkedPlayerProfileId={linkedPlayerProfileId}
  linkedPlayerName={
    ctx?.playerName ||
    ctx?.player?.fullName ||
    ctx?.playerProfile?.fullName ||
    ctx?.linkedPlayer?.fullName ||
    null
  }
  notificationCount={ctx?.unreadNotificationCount || ctx?.notificationCount || 0}
/>

      {children}
    </main>
  );
}