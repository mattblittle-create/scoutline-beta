// app/dashboard/player/page.tsx

"use client";

import Link from "next/link";
import React from "react";
import { useRouter } from "next/navigation";
import SupportButton from "@/app/components/SupportButton";

type DashboardCardProps = {
  title: string;
  description: string;
  href?: string;
  disabled?: boolean;
  badge?: string;
};

type DashboardNotification = {
  id: string;
  type: string;
  message: string;
  data: any | null;
  readAt: string | null;
  createdAt: string;
};

type RecruitingActivitySummary = {
  totalCoachViews: number;
  uniquePrograms: number;
  recentPrograms: Array<{
    name: string;
    division: string | null;
    lastViewedAt: string;
    views: number;
  }>;
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

    playerGradYear: number | null;
    playerPrimaryPos: string;
    playerSecondaryPos: string;
    playerPitcherHand: string;
    playerHsName: string;
    playerHometown: string;
    playerState: string;

    playerMetaLine: string;
    coachMetaLine: string;
  } | null;
};

type ApiChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  senderUserId: string;
  senderUser: {
    id: string;
    name: string;
    email: string;
    photoUrl: string;
  };
};

function DashboardCard({
  title,
  description,
  href,
  disabled = false,
  badge,
}: DashboardCardProps) {
  const content = (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 16,
        padding: 18,
        background: disabled ? "#f8fafc" : "#ffffff",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        minHeight: 170,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        transition: "transform 120ms ease, box-shadow 120ms ease",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            marginBottom: 10,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "1.1rem",
              fontWeight: 900,
              color: "#0f172a",
            }}
          >
            {title}
          </h2>

          {badge ? (
            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                padding: "4px 8px",
                borderRadius: 999,
                background: "#e0f2fe",
                color: "#075985",
                whiteSpace: "nowrap",
              }}
            >
              {badge}
            </span>
          ) : null}
        </div>

        <p
          style={{
            margin: 0,
            color: "#475569",
            lineHeight: 1.5,
            fontSize: 14,
          }}
        >
          {description}
        </p>
      </div>

      <div
        style={{
          marginTop: 18,
          fontWeight: 800,
          fontSize: 14,
          color: disabled ? "#94a3b8" : "#0ea5e9",
        }}
      >
        {disabled ? "Coming Soon" : "Open →"}
      </div>
    </div>
  );

  if (disabled || !href) {
    return content;
  }

  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      {content}
    </Link>
  );
}

export default function PlayerDashboardPage() {
  const router = useRouter();

  const [playerProfileId, setPlayerProfileId] = React.useState<string>("");
  const [playerName, setPlayerName] = React.useState<string>("");
  const [playerPhotoUrl, setPlayerPhotoUrl] = React.useState<string>("");
  const [profileCompletion, setProfileCompletion] = React.useState<number>(0);
  const [profileStatusLabel, setProfileStatusLabel] = React.useState<string>("Getting Started");
  const [lastProfileUpdateLabel, setLastProfileUpdateLabel] = React.useState<string>("Not available");
  const [notifications, setNotifications] = React.useState<DashboardNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = React.useState(false);
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showChat, setShowChat] = React.useState(false);
  const [selectedChatId, setSelectedChatId] = React.useState<string>("");
  const [chatConversations, setChatConversations] = React.useState<ApiChatConversation[]>([]);
  const [chatMessages, setChatMessages] = React.useState<ApiChatMessage[]>([]);
  const [chatLoading, setChatLoading] = React.useState(false);
  const [chatMessagesLoading, setChatMessagesLoading] = React.useState(false);
  const [chatDraft, setChatDraft] = React.useState("");
  const [chatSending, setChatSending] = React.useState(false);
  const [currentUserId, setCurrentUserId] = React.useState<string>("");
  const [suggestedPrograms, setSuggestedPrograms] = React.useState<any[]>([]);
  const [loadingSuggestedPrograms, setLoadingSuggestedPrograms] = React.useState(false);

  const [recruitingActivity, setRecruitingActivity] =
  React.useState<RecruitingActivitySummary>({
    totalCoachViews: 0,
    uniquePrograms: 0,
    recentPrograms: [],
  });

const [loadingRecruitingActivity, setLoadingRecruitingActivity] =
  React.useState(false);

  const selectedConversation =
    chatConversations.find((c) => c.id === selectedChatId) ?? null;

  const notificationsRef = React.useRef<HTMLDivElement | null>(null);

    function computeCompletion(norm: any): number {
    const checks = [
      !!String(norm?.firstName ?? "").trim(),
      !!String(norm?.lastName ?? "").trim(),
      !!String(norm?.primaryPos ?? "").trim(),
      !!String(norm?.gradYear ?? "").trim(),
      !!String(norm?.gpa ?? "").trim(),
      !!String(norm?.hsName ?? "").trim(),
      !!String(norm?.travelTeamName ?? "").trim(),
      !!String(norm?.playerBio ?? "").trim(),
      Array.isArray(norm?.coaches) && norm.coaches.length > 0,
      Array.isArray(norm?.externalVideos) && norm.externalVideos.length > 0,
      Array.isArray(norm?.localVideos) && norm.localVideos.length > 0,
      !!norm?.photoUrl,
      !!norm?.metrics && Object.values(norm.metrics).some((arr: any) => Array.isArray(arr) && arr.length > 0),
      Array.isArray(norm?.statsSeasons) && norm.statsSeasons.length > 0,
    ];

    const completeCount = checks.filter(Boolean).length;
    return Math.round((completeCount / checks.length) * 100);
  }

  function completionLabel(score: number): string {
    if (score >= 85) return "Recruiting Ready";
    if (score >= 60) return "In Progress";
    if (score >= 30) return "Building";
    return "Getting Started";
  }

  function formatLastUpdated(value: unknown): string {
    const raw = String(value ?? "").trim();
    if (!raw) return "Not available";

    const dt = new Date(raw);
    if (Number.isNaN(dt.getTime())) return "Not available";

    return dt.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

function formatViewedAgo(isoDate: string) {
  const viewed = new Date(isoDate);
  const now = new Date();

  if (Number.isNaN(viewed.getTime())) return "Viewed recently";

  const diffMs = now.getTime() - viewed.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "Viewed today";
  if (diffDays === 1) return "Viewed yesterday";
  if (diffDays < 7) return `Viewed ${diffDays} days ago`;

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks === 1) return "Viewed 1 week ago";
  if (diffWeeks < 5) return `Viewed ${diffWeeks} weeks ago`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths <= 1) return "Viewed 1 month ago";
  return `Viewed ${diffMonths} months ago`;
}

  React.useEffect(() => {
    let cancelled = false;

    async function loadDashboardIdentity() {
      try {
        const meRes = await fetch("/api/auth/me", { cache: "no-store" });
        const meJson = await meRes.json().catch(() => null);

        const email = String(
          meJson?.user?.email ??
          meJson?.email ??
          ""
        ).trim().toLowerCase();

        if (!email || cancelled) return;

        const profileRes = await fetch(
          `/api/player/profile?email=${encodeURIComponent(email)}`,
          { cache: "no-store" }
        );

        const profileJson = await profileRes.json().catch(() => null);
        if (cancelled || !profileRes.ok || !profileJson?.ok) return;

        const norm = profileJson?.normalized ?? {};
        const user = profileJson?.user ?? {};

        const meId = String(meJson?.user?.id ?? "").trim();
        if (meId) setCurrentUserId(meId);

        const first = String(norm?.firstName ?? "").trim();
        const last = String(norm?.lastName ?? "").trim();
        const fullName = [first, last].filter(Boolean).join(" ").trim();

        const resolvedPlayerProfileId = String(
          profileJson?.playerProfile?.id ||
          profileJson?.profile?.id ||
          profileJson?.id ||
          ""
        ).trim();

        if (resolvedPlayerProfileId) setPlayerProfileId(resolvedPlayerProfileId);

        if (fullName) setPlayerName(fullName);

        const photo = String(user?.photoUrl ?? norm?.photoUrl ?? "").trim();
        if (photo) setPlayerPhotoUrl(photo);

        const completion = computeCompletion({
          ...norm,
          photoUrl: photo || norm?.photoUrl || "",
        });
        setProfileCompletion(completion);
        setProfileStatusLabel(completionLabel(completion));

        const updatedAt =
          profileJson?.playerProfile?.updatedAt ??
          profileJson?.updatedAt ??
          norm?.updatedAt ??
          user?.updatedAt ??
          "";

        setLastProfileUpdateLabel(formatLastUpdated(updatedAt));
      } catch {
        // no-op for dashboard shell
      }
    }

    loadDashboardIdentity();

    return () => {
      cancelled = true;
    };
  }, []);

    React.useEffect(() => {
    let cancelled = false;

    async function loadSuggestedPrograms() {
      try {
        setLoadingSuggestedPrograms(true);

        const res = await fetch("/api/player/truth-fit", {
          cache: "no-store",
        });

        const data = await res.json().catch(() => null);

        if (cancelled) return;

        if (!res.ok || !data?.ok) {
          setSuggestedPrograms([]);
          return;
        }

        setSuggestedPrograms((data.results || []).slice(0, 3));
      } catch {
        if (!cancelled) setSuggestedPrograms([]);
      } finally {
        if (!cancelled) setLoadingSuggestedPrograms(false);
      }
    }

    loadSuggestedPrograms();

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
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
  }, []);

  React.useEffect(() => {
  let cancelled = false;

  async function loadRecruitingActivity() {
    try {
      setLoadingRecruitingActivity(true);

      const res = await fetch("/api/player/recruiting-activity", {
        cache: "no-store",
        credentials: "include",
      });

      const json = await res.json().catch(() => null);

      if (cancelled) return;
      if (!res.ok || !json?.ok) return;

      setRecruitingActivity(json.data);
    } catch {
      if (!cancelled) {
        setRecruitingActivity({
          totalCoachViews: 0,
          uniquePrograms: 0,
          recentPrograms: [],
        });
      }
    } finally {
      if (!cancelled) {
        setLoadingRecruitingActivity(false);
      }
    }
  }

  loadRecruitingActivity();

  return () => {
    cancelled = true;
  };
}, []);

  React.useEffect(() => {
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

setSelectedChatId((prev) => {
  if (prev && rows.some((r) => r.id === prev)) return prev;
  return rows[0]?.id || "";
});
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
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    async function loadMessages() {
      if (!showChat) return;

      if (!selectedChatId) {
        setChatMessages([]);
        return;
      }

      try {
        setChatMessagesLoading(true);

        const res = await fetch(
          `/api/chat/messages?conversationId=${encodeURIComponent(selectedChatId)}`,
          {
            cache: "no-store",
            credentials: "include",
          }
        );

        const json = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok || !json?.ok) return;

        const rows: ApiChatMessage[] = Array.isArray(json?.data?.messages)
          ? json.data.messages
          : [];

        setChatMessages(rows);

        setChatConversations((prev) =>
          prev.map((c) =>
            c.id === selectedChatId ? { ...c, unreadCount: 0 } : c
          )
        );

        await markChatNotificationsReadForConversation(selectedChatId);
      } catch {
        if (!cancelled) {
          setChatMessages([]);
        }
      } finally {
        if (!cancelled) {
          setChatMessagesLoading(false);
        }
      }
    }

    loadMessages();

    return () => {
      cancelled = true;
    };
  }, [selectedChatId, showChat]);

const unreadNotificationCount = notifications.filter((n) => !n.readAt).length;
const unreadChatCount = chatConversations.reduce(
  (sum, c) => sum + Number(c.unreadCount || 0),
  0
);

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
      // no-op for now
    }
  }

  async function markChatNotificationsReadForConversation(conversationId: string) {
    const targetId = String(conversationId || "").trim();
    if (!targetId) return;

    const matching = notifications.filter(
      (n) =>
        !n.readAt &&
        n.type === "COACH_MESSAGE" &&
        String(n.data?.conversationId || "").trim() === targetId
    );

    if (matching.length === 0) return;

    await Promise.all(
      matching.map((n) =>
        fetch("/api/notifications/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ notificationId: n.id }),
        }).catch(() => null)
      )
    );

    const now = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) =>
        matching.some((m) => m.id === n.id)
          ? { ...n, readAt: n.readAt ?? now }
          : n
      )
    );
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
      // no-op for now
    }
  }

    async function sendChatMessage() {
    const message = chatDraft.trim();
    if (!selectedChatId || !message) return;

    try {
      setChatSending(true);

      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          conversationId: selectedChatId,
          message,
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) return;

      const created = json?.data?.message;
      if (!created) return;

      setChatMessages((prev) => [...prev, created]);
      setChatDraft("");

      setChatConversations((prev) =>
        prev.map((c) =>
          c.id === selectedChatId
            ? {
                ...c,
                preview: created.body,
                lastMessageAt: created.createdAt,
                lastMessageCreatedAt: created.createdAt,
                unreadCount: 0,
              }
            : c
        )
      );
    } catch {
      // no-op for now
    } finally {
      setChatSending(false);
    }
  }

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

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "8px 0 40px" }}>
      {/* Header */}
      <section
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "1.9rem",
              fontWeight: 900,
              margin: 0,
              color: "#0f172a",
            }}
          >
            {playerName ? `Player Dashboard - ${playerName}` : "Player Dashboard"}
          </h1>

          <p
            style={{
              marginTop: 8,
              marginBottom: 0,
              color: "#475569",
              maxWidth: 760,
              lineHeight: 1.5,
            }}
          >
            Welcome to ScoutLine. Manage your profile, access recruiting tools,
            explore colleges, review billing, and stay on top of activity and
            alerts from coaches.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div
            title={playerName || "Player photo"}
            style={{
              width: 42,
              height: 42,
              minWidth: 42,
              borderRadius: "50%",
              border: "1px solid #e5e7eb",
              overflow: "hidden",
              background: "#f8fafc",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {playerPhotoUrl ? (
              <img
                src={playerPhotoUrl}
                alt={playerName || "Player"}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            ) : (
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 900,
                  color: "#64748b",
                }}
              >
                {(playerName || "P").trim().charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div ref={notificationsRef} style={{ position: "relative" }}>
            <button
              type="button"
              title="Notifications"
              onClick={() => setShowNotifications((v) => !v)}
              style={{
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
              }}
            >
              🔔
              {unreadNotificationCount > 0 ? (
                <span
                  style={{
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
                  }}
                >
                  {unreadNotificationCount}
                </span>
              ) : null}
            </button>

            {showNotifications && (
              <div
                style={{
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
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 14,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 900,
                      fontSize: 16,
                      color: "#0f172a",
                    }}
                  >
                    Notifications
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowNotifications(false)}
                    style={{
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      fontWeight: 900,
                      color: "#64748b",
                    }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  {notificationsLoading ? (
                    <div
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        fontSize: 14,
                        color: "#64748b",
                      }}
                    >
                      Loading notifications...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        fontSize: 14,
                        color: "#64748b",
                      }}
                    >
                      No notifications yet.
                    </div>
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
                          padding: 12,
                          borderRadius: 12,
                          background: note.readAt ? "#ffffff" : "#f8fafc",
                          border: "1px solid #e2e8f0",
                          fontSize: 14,
                          color: "#334155",
                          lineHeight: 1.4,
                          textAlign: "left",
                          width: "100%",
                          cursor: note.readAt ? "default" : "pointer",
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

                        <div
                          style={{
                            fontSize: 12,
                            color: note.readAt ? "#94a3b8" : "#64748b",
                          }}
                        >
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
                    marginTop: 14,
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    background: "#ffffff",
                    cursor: unreadNotificationCount === 0 ? "not-allowed" : "pointer",
                    fontWeight: 800,
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
            onClick={() => setShowChat(true)}
            style={{
              height: 42,
              padding: "0 14px",
              borderRadius: 999,
              border: "1px solid #0ea5e9",
              background: "#e0f2fe",
              color: "#0f172a",
              fontWeight: 900,
              cursor: "pointer",
              position: "relative",
            }}
          >
            ScoutLine Chat
            {unreadChatCount > 0 ? (
              <span
                style={{
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
                }}
              >
                {unreadChatCount}
              </span>
            ) : null}
          </button>
        </div>
      </section>

      {/* Quick stats / callouts */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
          marginBottom: 22,
        }}
      >
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            padding: 16,
            background: "#ffffff",
          }}
        >
          <div style={{ fontSize: 13, color: "#64748b", fontWeight: 700 }}>
            Profile Status
          </div>
          <div style={{ marginTop: 6, fontSize: 24, fontWeight: 900, color: "#0f172a" }}>
            {profileStatusLabel}
          </div>
          <div style={{ marginTop: 6, color: "#475569", fontSize: 14 }}>
            {profileCompletion}% complete
          </div>
        </div>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            padding: 16,
            background: "#ffffff",
          }}
        >
          <div style={{ fontSize: 13, color: "#64748b", fontWeight: 700 }}>
            Last Profile Update
          </div>
          <div style={{ marginTop: 6, fontSize: 24, fontWeight: 900, color: "#0f172a" }}>
            {lastProfileUpdateLabel}
          </div>
          <div style={{ marginTop: 6, color: "#475569", fontSize: 14 }}>
            Keep metrics, stats, grades, video, and references current.
          </div>
        </div>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            padding: 16,
            background: "#ffffff",
          }}
        >
          <div style={{ fontSize: 13, color: "#64748b", fontWeight: 700 }}>
            Alerts
          </div>
          <div style={{ marginTop: 6, fontSize: 24, fontWeight: 900, color: "#0f172a" }}>
            {unreadNotificationCount} New
          </div>
          <div style={{ marginTop: 6, color: "#475569", fontSize: 14 }}>
            Profile views, messages, saves, ownership updates, and reminders.
          </div>
        </div>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            padding: 16,
            background: "#ffffff",
          }}
        >
          <div style={{ fontSize: 13, color: "#64748b", fontWeight: 700 }}>
            Quick Access
          </div>
<div
  style={{
    marginTop: 10,
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 8,
  }}
>
  <button
    type="button"
    onClick={() => router.push("/dashboard/player/profile")}
    style={{
      padding: "8px 12px",
      borderRadius: 10,
      border: "1px solid #0ea5e9",
      background: "#38bdf8",
      color: "#083344",
      fontWeight: 800,
      cursor: "pointer",
    }}
  >
    Edit Profile
  </button>

  <button
    type="button"
    onClick={() => router.push("/dashboard/player/profile/billing")}
    style={{
      padding: "8px 12px",
      borderRadius: 10,
      border: "1px solid #e5e7eb",
      background: "#ffffff",
      color: "#0f172a",
      fontWeight: 800,
      cursor: "pointer",
    }}
  >
    Plan Billing
  </button>

  <div style={{ gridColumn: "1 / span 2" }}>
    <SupportButton
      subjectPrefix="Account Support Request"
      playerName={playerName}
      targetId={playerProfileId}
    />
  </div>
</div>
</div>
      </section>

      {/* Main dashboard cards */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
        }}
      >

        <DashboardCard
          title="Recruiting Tool"
          description="Use this tool to better understand your recruiting level, best opportunities, and where you match."
          href="/dashboard/player/recruiting-tool"
        />

        <DashboardCard
          title="College Search"
          description="Search colleges by region, division, conference, tuition, admissions profile, and baseball fit."
          href="/dashboard/player/college-search"
        />

        <DashboardCard
          title="Suggested Programs"
          description="View ScoutLine-recommended college programs based on your profile, metrics, academics, and recruiting fit."
          href="/dashboard/player/suggested-programs"
        />

        <DashboardCard
          title="Target Programs"
          description="View and manage the college programs you saved from search."
          href="/dashboard/player/target-programs"
        />

        <DashboardCard
          title="Profile Editor"
          description="Open your player profile editor to update academics, athletics, metrics, stats, video, and references."
          href="/dashboard/player/profile"
        />

        <DashboardCard
          title="Plan Billing"
          description="Manage your ScoutLine plan, review billing details, payment info, and upgrade options."
          href="/dashboard/player/profile/billing"
        />

        <div
          style={{
            gridColumn: "span 2",
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            padding: 18,
            background: "#ffffff",
            boxShadow: "0 10px 24px rgba(15,23,42,0.06)",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 900, color: "#caa042", marginBottom: 6 }}>
            RECRUITING ACTIVITY
          </div>

          <h2 style={{ margin: "0 0 8px", fontSize: 20, color: "#0f172a" }}>
            Profile Views
          </h2>

          <p style={{ margin: "0 0 12px", color: "#64748b", fontSize: 13, fontWeight: 700 }}>
            Last 30 days
          </p>

          {loadingRecruitingActivity ? (
            <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>
              Loading activity...
            </p>
          ) : (
            <>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 950, color: "#0f172a" }}>
                    {recruitingActivity.totalCoachViews}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>
                    Coach Views
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 24, fontWeight: 950, color: "#0f172a" }}>
                    {recruitingActivity.uniquePrograms}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>
                    Unique Programs
                  </div>
                </div>
              </div>

              {recruitingActivity.recentPrograms.length ? (
                <div style={{ display: "grid", gap: 6 }}>
                  {recruitingActivity.recentPrograms.map((program) => (
<div
  key={program.name}
  style={{
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    fontSize: 13,
    color: "#334155",
    fontWeight: 800,
    alignItems: "flex-start",
  }}
>
  <div style={{ display: "grid", gap: 2 }}>
    <span>{program.name}</span>
    <span style={{ color: "#64748b", fontSize: 12, fontWeight: 700 }}>
      {formatViewedAgo(program.lastViewedAt)}
    </span>
  </div>

  <span style={{ color: "#64748b", fontWeight: 700, whiteSpace: "nowrap" }}>
    {program.views} view{program.views === 1 ? "" : "s"}
  </span>
</div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, color: "#64748b", fontSize: 13, lineHeight: 1.5 }}>
                  No college coach views yet. Share your profile with coaches to start tracking recruiting activity.
                </p>
              )}
            </>
          )}
        </div>
      </section>

      {/* Alerts / upcoming feature area */}
      <section
        style={{
          marginTop: 24,
          display: "grid",
          gridTemplateColumns: "1.2fr 0.8fr",
          gap: 16,
        }}
      >
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            padding: 18,
            background: "#ffffff",
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: "1.1rem", fontWeight: 900 }}>
            Notification Types
          </h2>

          <div style={{ display: "grid", gap: 8, color: "#334155", fontSize: 14 }}>
            <div>• Profile viewed by a coach</div>
            <div>• Profile saved to a recruiting board</div>
            <div>• Coaches searching for similar players</div>
            <div>• New coach email or ScoutLine Chat message</div>
            <div>• Profile stale for 6+ months</div>
            <div>• Video engagement from coaches</div>
            <div>• College matches added</div>
            <div>• Recruiting board status changes</div>
          </div>
        </div>

        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            padding: 18,
            background: "#ffffff",
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: 12, fontSize: "1.1rem", fontWeight: 900 }}>
            ScoutLine Chat
          </h2>

          <p style={{ marginTop: 0, color: "#475569", lineHeight: 1.5, fontSize: 14 }}>
            Chat will give players a single place to manage coach conversations,
            message history, and recruiting communication alerts.
          </p>

          <div
            style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 12,
              background: "#f8fafc",
              color: "#64748b",
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            ScoutLine Chat is available from the dashboard header.
          </div>
        </div>
      </section>

            {showChat && (
        <div
          style={{
            position: "fixed",
            right: 20,
            bottom: 20,
            width: 920,
            maxWidth: "calc(100vw - 24px)",
            height: 620,
            maxHeight: "calc(100vh - 40px)",
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 20,
            boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
            zIndex: 200,
            display: "grid",
            gridTemplateColumns: "300px 1fr",
            overflow: "hidden",
            minHeight: 0,
          }}
        >
          {/* Left rail */}
          <div
            style={{
              borderRight: "1px solid #e5e7eb",
              background: "#f8fafc",
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
            }}
          >
            <div
              style={{
                padding: 16,
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a" }}>
                  ScoutLine Chat
                </div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                  Coach conversations
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowChat(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "#64748b",
                  fontWeight: 900,
                  fontSize: 18,
                }}
              >
                ✕
              </button>
            </div>

<div
  style={{
    padding: 12,
    display: "grid",
    gap: 8,
    overflowY: "auto",
    maxHeight: 520,
    alignContent: "start",
  }}
>
  {chatLoading ? (
    <div style={{ padding: 12, color: "#64748b", fontSize: 14 }}>
      Loading conversations...
    </div>
  ) : chatConversations.length === 0 ? (
    <div style={{ padding: 12, color: "#64748b", fontSize: 14 }}>
      No conversations yet.
    </div>
  ) : (
    chatConversations.map((thread) => {
      const active = thread.id === selectedChatId;

      return (
        <button
          key={thread.id}
          type="button"
          onClick={() => setSelectedChatId(thread.id)}
          style={{
            textAlign: "left",
            border: active ? "1px solid #7dd3fc" : "1px solid #e5e7eb",
            background: active ? "#e0f2fe" : "#ffffff",
            borderRadius: 12,
            padding: "10px 12px",
            cursor: "pointer",
            minHeight: 56,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 8,
            }}
          >
            <div style={{ minWidth: 0, display: "grid", gap: 4, flex: 1 }}>
              <div
                style={{
                  fontWeight: 900,
                  color: "#0f172a",
                  fontSize: 14,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {thread.otherParticipant?.name || "Unknown"}
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: "#64748b",
                  fontWeight: 700,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {thread.otherParticipant?.coachMetaLine || ""}
              </div>
            </div>

            {thread.unreadCount > 0 ? (
              <span
                style={{
                  minWidth: 8,
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: "#ef4444",
                  display: "inline-block",
                  flexShrink: 0,
                  marginTop: 6,
                }}
              />
            ) : null}
          </div>
        </button>
      );
    })
  )}
</div>
          </div>

          {/* Main chat area */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
              minHeight: 0,
              background: "#ffffff",
            }}
          >
            <div
              style={{
                padding: 16,
                borderBottom: "1px solid #e5e7eb",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a" }}>
                  {selectedConversation?.otherParticipant?.name || "Conversation"}
                </div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                  {selectedConversation?.otherParticipant?.collegeName || ""}
                </div>
              </div>

              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#0369a1",
                  background: "#e0f2fe",
                  border: "1px solid #bae6fd",
                  borderRadius: 999,
                  padding: "6px 10px",
                }}
              >
                Chat Shell
              </div>
            </div>

            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                padding: 16,
                display: "grid",
                gap: 12,
                background: "#f8fafc",
                alignContent: "start",
              }}
            >
{chatMessagesLoading ? (
  <div style={{ color: "#64748b", fontSize: 14 }}>
    Loading messages...
  </div>
) : chatMessages.length === 0 ? (
  <div style={{ color: "#64748b", fontSize: 14 }}>
    No messages yet.
  </div>
) : (
  chatMessages.map((msg) => {
    const isPlayer = msg.senderUserId === currentUserId;

    return (
      <div
        key={msg.id}
        style={{
          display: "flex",
          justifyContent: isPlayer ? "flex-end" : "flex-start",
        }}
      >
        <div
          style={{
            maxWidth: "75%",
            padding: "12px 14px",
            borderRadius: 16,
            background: isPlayer ? "#e0f2fe" : "#ffffff",
            border: "1px solid #e5e7eb",
            color: "#0f172a",
            lineHeight: 1.45,
            fontSize: 14,
          }}
        >
          <div>{msg.body}</div>
          <div
            style={{
              marginTop: 6,
              fontSize: 11,
              color: "#64748b",
              fontWeight: 700,
            }}
          >
            {new Date(msg.createdAt).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </div>
        </div>
      </div>
    );
  })
)}
            </div>

            <div
              style={{
                padding: 16,
                borderTop: "1px solid #e5e7eb",
                background: "#ffffff",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 10,
                  alignItems: "end",
                }}
              >
<textarea
  value={chatDraft}
  onChange={(e) => setChatDraft(e.target.value)}
  placeholder="Compose a message..."
  style={{
    minHeight: 72,
    width: "100%",
    resize: "none",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    padding: 12,
    outline: "none",
  }}
/>

<button
  type="button"
  onClick={sendChatMessage}
  disabled={chatSending || !chatDraft.trim()}
  style={{
    height: 42,
    padding: "0 16px",
    borderRadius: 10,
    border: "1px solid #0ea5e9",
    background: "#38bdf8",
    color: "#083344",
    fontWeight: 800,
    cursor: chatSending ? "not-allowed" : "pointer",
    opacity: chatSending ? 0.7 : 1,
  }}
>
  {chatSending ? "Sending..." : "Send"}
</button>
              </div>

              <div
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  color: "#64748b",
                  fontWeight: 700,
                }}
              >
                Messaging workflow and live coach communication will be connected here next.
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}