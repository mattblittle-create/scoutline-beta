// app/dashboard/parent/notifications/page.tsx

import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { prisma } from "@/lib/prisma";
import { sanitizeParentNotification } from "@/lib/parent/sanitizeParentNotification";

function tone(severity: string) {
  if (severity === "success") {
    return { bg: "#f0fdf4", border: "#bbf7d0", text: "#166534" };
  }

  if (severity === "warning") {
    return { bg: "#fff7ed", border: "#fed7aa", text: "#9a3412" };
  }

  return { bg: "#eff6ff", border: "#bfdbfe", text: "#1d4ed8" };
}

function fmt(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

export default async function ParentNotificationsPage() {
  const user = await getCurrentUser();

  if (!user?.id) {
    redirect("/login?role=parent");
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 75,
    select: {
      id: true,
      type: true,
      message: true,
      data: true,
      readAt: true,
      createdAt: true,
    },
  });

  const items = notifications.map((n) => ({
    ...sanitizeParentNotification(n),
    read: Boolean(n.readAt),
  }));

  const unreadCount = items.filter((item) => !item.read).length;

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <section style={hero}>
        <div style={eyebrow}>Parent Portal</div>
        <h1 style={h1}>Notifications</h1>
        <p style={heroText}>
          Parent-safe activity alerts for recruiting, profile updates, messaging badges,
          and billing items. Message contents and coach-only details stay private.
        </p>

        <div style={actionRow}>
          <Link href="/dashboard/parent" style={ghostBtn}>
            Parent Dashboard
          </Link>

          <span style={badge}>{unreadCount} unread</span>
        </div>
      </section>

      <section style={card}>
        <div style={cardHeader}>
          <div>
            <div style={cardTitle}>Activity Center</div>
            <div style={muted}>
              Showing {items.length} recent notification{items.length === 1 ? "" : "s"}.
            </div>
          </div>
        </div>

        {items.length === 0 ? (
          <div style={emptyState}>No parent notifications yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {items.map((item) => {
              const t = tone(item.severity);

              return (
                <article
                  key={item.id}
                  style={{
                    ...notificationCard,
                    borderColor: item.read ? "#e5e7eb" : t.border,
                    background: item.read ? "#fff" : t.bg,
                  }}
                >
                  <div style={notificationTopRow}>
                    <span
                      style={{
                        ...pill,
                        background: t.bg,
                        borderColor: t.border,
                        color: t.text,
                      }}
                    >
                      {item.category}
                    </span>

                    {!item.read ? <span style={unreadPill}>New</span> : null}
                  </div>

                  <div style={notificationTitle}>{item.title}</div>
                  <div style={notificationSummary}>{item.summary}</div>
                  <div style={notificationDate}>{fmt(item.createdAt)}</div>
                </article>
              );
            })}
          </div>
        )}
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
  maxWidth: 850,
  lineHeight: 1.55,
  fontWeight: 600,
};

const actionRow: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  alignItems: "center",
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

const cardHeader: React.CSSProperties = {
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

const muted: React.CSSProperties = {
  color: "#64748b",
  fontWeight: 700,
  fontSize: 13,
  marginTop: 4,
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
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap",
};

const notificationTitle: React.CSSProperties = {
  color: "#0f172a",
  fontWeight: 950,
  fontSize: 16,
};

const notificationSummary: React.CSSProperties = {
  color: "#475569",
  fontWeight: 650,
  lineHeight: 1.5,
};

const notificationDate: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: 12,
  fontWeight: 800,
};

const pill: React.CSSProperties = {
  display: "inline-block",
  padding: "5px 10px",
  borderRadius: 999,
  border: "1px solid #e5e7eb",
  fontWeight: 900,
  fontSize: 12,
  whiteSpace: "nowrap",
};

const unreadPill: React.CSSProperties = {
  ...pill,
  background: "#caa042",
  borderColor: "#caa042",
  color: "#0f172a",
};

const badge: React.CSSProperties = {
  ...pill,
  background: "#0f172a",
  borderColor: "#0f172a",
  color: "#fff",
};

const emptyState: React.CSSProperties = {
  color: "#64748b",
  fontWeight: 700,
  lineHeight: 1.5,
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