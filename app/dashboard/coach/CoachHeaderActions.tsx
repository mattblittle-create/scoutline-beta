// app/dashboard/coach/CoachHeaderActions.tsx

"use client";

import Link from "next/link";
import React from "react";
import { usePathname, useRouter } from "next/navigation";
import type { CSSProperties } from "react";

type DashboardNotification = {
  id: string;
  type: string;
  message: string;
  data: any | null;
  readAt: string | null;
  createdAt: string;
};

type ApiChatConversation = {
  id: string;
  subject: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  preview: string;
  lastMessageCreatedAt: string | null;
  otherParticipant: {
    id: string;
    name: string;
    email: string;
    photoUrl: string;
    role: string;
    staffTitle: string;
    collegeName: string;
  } | null;
};

export default function CoachHeaderActions() {
  const pathname = usePathname() || "";
  const router = useRouter();

  const isCoachRoot = pathname === "/dashboard/coach";
  const show = !isCoachRoot && pathname.startsWith("/dashboard/coach");

  const [notifications, setNotifications] = React.useState<DashboardNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = React.useState(false);
  const [chatConversations, setChatConversations] = React.useState<ApiChatConversation[]>([]);
  const [chatLoading, setChatLoading] = React.useState(false);
  const [showNotifications, setShowNotifications] = React.useState(false);

  const notificationsRef = React.useRef<HTMLDivElement | null>(null);

  const isActive = (href: string) => pathname === href;

  React.useEffect(() => {
    if (!show) return;

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function loadNotifications(silent = false) {
      try {
        if (!silent) setNotificationsLoading(true);

        const res = await fetch("/api/notifications?limit=10", {
          cache: "no-store",
          credentials: "include",
        });

        const json = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !json?.ok) return;

        const rows: DashboardNotification[] = Array.isArray(json?.data?.notifications)
          ? json.data.notifications
          : [];

        setNotifications(rows);
      } catch {
        if (!cancelled && !silent) {
          setNotifications([]);
        }
      } finally {
        if (!cancelled && !silent) {
          setNotificationsLoading(false);
        }
      }
    }

    loadNotifications();
    intervalId = setInterval(() => {
      loadNotifications(true);
    }, 15000);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [show]);

  React.useEffect(() => {
    if (!show) return;

    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function loadChatConversations(silent = false) {
      try {
        if (!silent) setChatLoading(true);

        const res = await fetch("/api/chat/conversations", {
          cache: "no-store",
          credentials: "include",
        });

        const json = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !json?.ok) return;

        const rows: ApiChatConversation[] = Array.isArray(json?.data?.conversations)
          ? json.data.conversations
          : [];

        setChatConversations(rows);
      } catch {
        if (!cancelled && !silent) {
          setChatConversations([]);
        }
      } finally {
        if (!cancelled && !silent) {
          setChatLoading(false);
        }
      }
    }

    loadChatConversations();
    intervalId = setInterval(() => {
      loadChatConversations(true);
    }, 15000);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [show]);

  React.useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!showNotifications) return;

      const target = event.target as Node | null;
      if (!notificationsRef.current || !target) return;

      if (!notificationsRef.current.contains(target)) {
        setShowNotifications(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [showNotifications]);

  async function markAllNotificationsRead() {
    try {
      const res = await fetch("/api/notifications/read-all", {
        method: "POST",
        credentials: "include",
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) return;

      const now = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          readAt: n.readAt ?? now,
        }))
      );
    } catch {
      // no-op
    }
  }

  async function markNotificationRead(notificationId: string) {
    try {
      const res = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ notificationId }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) return;

      const now = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, readAt: n.readAt ?? now }
            : n
        )
      );
    } catch {
      // no-op
    }
  }

  const unreadNotificationCount = notifications.filter((n) => !n.readAt).length;
  const unreadChatCount = chatConversations.reduce(
    (sum, c) => sum + Number(c.unreadCount || 0),
    0
  );

  if (!show) return null;

  return (
    <div style={actionsShell}>
      <div style={actionsLeft}>
        <Link href="/dashboard/coach" style={btnBlue}>
          Back to Dashboard
        </Link>

        <Link
          href="/dashboard/coach/profile"
          style={isActive("/dashboard/coach/profile") ? btnGold : btnOutline}
        >
          Profile
        </Link>

        <Link
          href="/dashboard/coach/recruiting-board"
          style={isActive("/dashboard/coach/recruiting-board") ? btnGold : btnOutline}
        >
          Recruiting Board
        </Link>

        <Link
          href="/dashboard/coach/chat"
          style={isActive("/dashboard/coach/chat") ? btnGold : btnOutline}
        >
          Chat
        </Link>

        <Link
          href="/dashboard/coach/invites"
          style={isActive("/dashboard/coach/invites") ? btnGold : btnOutline}
        >
          Invites
        </Link>

        <Link
          href="/dashboard/coach/directory"
          style={isActive("/dashboard/coach/directory") ? btnGold : btnOutline}
        >
          Directory
        </Link>
      </div>

      <div style={actionsRight}>
        <div ref={notificationsRef} style={{ position: "relative" }}>
        <button
          type="button"
          title="Notifications"
          onClick={() => setShowNotifications((v) => !v)}
          style={btnIcon}
        >
          🔔
          {unreadNotificationCount > 0 ? (
            <span style={badgeRed}>
              {unreadNotificationCount}
            </span>
          ) : null}
        </button>

        {showNotifications && (
          <div style={notificationsPopover}>
            <div style={popoverHead}>
              <div style={popoverTitle}>Notifications</div>

              <button
                type="button"
                onClick={() => setShowNotifications(false)}
                style={popoverClose}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {notificationsLoading ? (
                <div style={emptyStateBox}>Loading notifications...</div>
              ) : notifications.length === 0 ? (
                <div style={emptyStateBox}>No notifications yet.</div>
              ) : (
                notifications.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => {
                      if (!note.readAt) {
                        markNotificationRead(note.id);
                      }
                    }}
                    style={{
                      ...notificationRow,
                      background: note.readAt ? "#ffffff" : "#f8fafc",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: note.readAt ? 600 : 800,
                        color: note.readAt ? "#64748b" : "#0f172a",
                        marginBottom: 4,
                      }}
                    >
                      {note.message}
                    </div>

                    <div style={notificationDate}>
                      {new Date(note.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                  </button>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={markAllNotificationsRead}
              disabled={unreadNotificationCount === 0}
              style={{
                ...markAllBtn,
                cursor: unreadNotificationCount === 0 ? "not-allowed" : "pointer",
                color: unreadNotificationCount === 0 ? "#94a3b8" : "#0f172a",
                opacity: unreadNotificationCount === 0 ? 0.7 : 1,
              }}
            >
              Mark all as read
            </button>
          </div>
        )}
      </div>

        <button
          type="button"
          title="ScoutLine Chat"
          onClick={() => router.push("/dashboard/coach/chat")}
          style={{
            ...btnChat,
            opacity: chatLoading ? 0.9 : 1,
          }}
        >
          ScoutLine Chat
          {unreadChatCount > 0 ? (
            <span style={badgeRedPill}>
              {unreadChatCount}
            </span>
          ) : null}
        </button>
      </div>
    </div>
  );
}

const actionsRow: CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap",
};

const btnBlue: CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #0ea5e9",
  background: "#0ea5e9",
  color: "#fff",
  fontWeight: 900,
  textDecoration: "none",
};

const btnGold: CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #caa042",
  background: "#caa042",
  color: "#0f182a",
  fontWeight: 900,
  textDecoration: "none",
};

const btnOutline: CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 900,
  textDecoration: "none",
};

const btnIcon: CSSProperties = {
  height: 42,
  minWidth: 42,
  padding: "0 12px",
  borderRadius: 999,
  border: "1px solid #e5e7eb",
  background: "#ffffff",
  color: "#0f172a",
  fontWeight: 800,
  cursor: "pointer",
  position: "relative",
};

const btnChat: CSSProperties = {
  height: 42,
  padding: "0 14px",
  borderRadius: 999,
  border: "1px solid #0ea5e9",
  background: "#e0f2fe",
  color: "#0f172a",
  fontWeight: 900,
  cursor: "pointer",
  position: "relative",
};

const badgeRed: CSSProperties = {
  position: "absolute",
  top: -4,
  right: -2,
  minWidth: 18,
  height: 18,
  borderRadius: 999,
  background: "#ef4444",
  color: "#ffffff",
  fontSize: 11,
  fontWeight: 900,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 5px",
};

const badgeRedPill: CSSProperties = {
  position: "absolute",
  top: -6,
  right: -6,
  minWidth: 18,
  height: 18,
  borderRadius: 999,
  background: "#ef4444",
  color: "#ffffff",
  fontSize: 11,
  fontWeight: 900,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "0 5px",
};

const notificationsPopover: CSSProperties = {
  position: "absolute",
  top: 52,
  right: 0,
  width: 360,
  maxWidth: "90vw",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  boxShadow: "0 20px 40px rgba(0,0,0,0.12)",
  padding: 16,
  zIndex: 100,
};

const popoverHead: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 14,
};

const popoverTitle: CSSProperties = {
  fontWeight: 900,
  fontSize: 16,
  color: "#0f172a",
};

const popoverClose: CSSProperties = {
  border: "none",
  background: "transparent",
  cursor: "pointer",
  fontWeight: 900,
  color: "#64748b",
};

const emptyStateBox: CSSProperties = {
  padding: 12,
  borderRadius: 12,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  fontSize: 14,
  color: "#64748b",
};

const notificationRow: CSSProperties = {
  padding: 12,
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  fontSize: 14,
  color: "#334155",
  lineHeight: 1.4,
  textAlign: "left",
  width: "100%",
  cursor: "pointer",
};

const notificationDate: CSSProperties = {
  fontSize: 12,
  color: "#64748b",
};

const markAllBtn: CSSProperties = {
  marginTop: 14,
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#ffffff",
  fontWeight: 800,
};

const actionsShell: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  width: "100%",
};

const actionsLeft: CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap",
};

const actionsRight: CSSProperties = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  marginLeft: "auto",
  flexWrap: "wrap",
};