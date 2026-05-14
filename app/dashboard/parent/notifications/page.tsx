// app/dashboard/parent/notifications/page.tsx

import Link from "next/link";
import React from "react";
import { prisma } from "@/lib/prisma";
import { getParentDashboardContext } from "@/lib/parent/getParentDashboardContext";
import { sanitizeParentNotification } from "@/lib/parent/sanitizeParentNotification";

function formatDateTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function tone(severity: string) {
  if (severity === "success") {
    return {
      bg: "#f0fdf4",
      border: "#bbf7d0",
      text: "#166534",
    };
  }

  if (severity === "warning") {
    return {
      bg: "#fffbeb",
      border: "#fde68a",
      text: "#78350f",
    };
  }

  return {
    bg: "#eff6ff",
    border: "#bfdbfe",
    text: "#1d4ed8",
  };
}

export default async function ParentNotificationsPage() {
  const { activePlayerProfile } = await getParentDashboardContext({
    requireLinkedPlayer: true,
  });

  const notifications = activePlayerProfile?.userId
    ? await prisma.notification.findMany({
        where: {
          userId: activePlayerProfile.userId,
        },
        orderBy: [{ createdAt: "desc" }],
        take: 25,
      })
    : [];

  const safeNotifications = notifications.map(sanitizeParentNotification);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <section style={hero}>
        <div style={eyebrow}>Parent Notifications</div>

        <h1 style={h1}>Activity Oversight</h1>

        <p style={heroText}>
          See parent-safe activity alerts for your linked player. This view is
          read-only and does not expose private message contents, allow replies,
          or let parents clear player notifications.
        </p>

        <div style={actionRow}>
          <Link href="/dashboard/parent" style={ghostBtn}>
            Parent Dashboard
          </Link>
        </div>
      </section>

      <section style={card}>
        <div style={cardHeaderRow}>
          <div style={cardTitle}>Recent Activity</div>
          <div style={smallMuted}>
            Showing {safeNotifications.length} alert
            {safeNotifications.length === 1 ? "" : "s"}
          </div>
        </div>

        {safeNotifications.length === 0 ? (
          <div style={emptyState}>
            No parent-visible notifications yet. When coach activity, profile
            reminders, or billing alerts are available, they will appear here.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {safeNotifications.map((notification) => {
              const t = tone(notification.severity);

              return (
                <article
                  key={notification.id}
                  style={{
                    ...notificationCard,
                    borderColor: t.border,
                    background: t.bg,
                    color: t.text,
                  }}
                >
                  <div style={notificationTopRow}>
                    <span style={categoryPill}>{notification.category}</span>
                    <span style={dateText}>
                      {formatDateTime(notification.createdAt)}
                    </span>
                  </div>

                  <div style={notificationTitle}>{notification.title}</div>
                  <div style={notificationSummary}>
                    {notification.summary}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section style={card}>
        <div style={cardTitle}>Privacy Boundary</div>

        <div style={bodyText}>
          Parents can see that activity happened, but cannot read protected
          message content, respond as the player, remove alerts, or manage coach
          interactions from this page.
        </div>
      </section>
    </div>
  );
}

const hero: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  background: "linear-gradient(180deg, #fffdf7 0%, #ffffff 100%)",
  padding: 20,
  boxShadow: "0 12px 30px rgba(15,23,42,0.06)",
};

const eyebrow: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 900,
  color: "#8a6a21",
  textTransform: "uppercase",
  letterSpacing: ".06em",
  marginBottom: 8,
};

const h1: React.CSSProperties = {
  margin: 0,
  fontSize: "1.8rem",
  fontWeight: 900,
  letterSpacing: "-0.02em",
  color: "#0f172a",
};

const heroText: React.CSSProperties = {
  margin: "10px 0 0",
  color: "#475569",
  maxWidth: 860,
  lineHeight: 1.55,
  fontWeight: 600,
};

const actionRow: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  marginTop: 16,
};

const card: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 18,
  background: "#fff",
  padding: 18,
  boxShadow: "0 10px 24px rgba(15,23,42,0.05)",
  display: "grid",
  gap: 14,
};

const cardHeaderRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
};

const cardTitle: React.CSSProperties = {
  fontSize: "1.05rem",
  fontWeight: 900,
  color: "#0f172a",
};

const smallMuted: React.CSSProperties = {
  color: "#64748b",
  fontWeight: 700,
  fontSize: 12,
};

const emptyState: React.CSSProperties = {
  color: "#64748b",
  fontWeight: 700,
  lineHeight: 1.5,
};

const notificationCard: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 14,
  display: "grid",
  gap: 8,
};

const notificationTopRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

const categoryPill: React.CSSProperties = {
  display: "inline-block",
  padding: "5px 9px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.72)",
  border: "1px solid rgba(15,23,42,0.08)",
  fontSize: 12,
  fontWeight: 900,
};

const dateText: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  opacity: 0.78,
};

const notificationTitle: React.CSSProperties = {
  fontSize: "1rem",
  fontWeight: 950,
};

const notificationSummary: React.CSSProperties = {
  fontWeight: 700,
  lineHeight: 1.45,
};

const bodyText: React.CSSProperties = {
  color: "#475569",
  lineHeight: 1.6,
  fontWeight: 600,
};

const ghostBtn: React.CSSProperties = {
  display: "inline-block",
  padding: "11px 15px",
  borderRadius: 12,
  textDecoration: "none",
  fontWeight: 900,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#0f172a",
};