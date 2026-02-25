"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";

type NotificationItem = {
  id: string;
  type: string;
  message: string;
  data: any | null;
  readAt: string | null;
  createdAt: string;
};

type ListResponse = {
  ok: boolean;
  data?: {
    notifications: NotificationItem[];
  };
  error?: string;
};

const POLL_INTERVAL_MS = 60_000; // 1 minute

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // UI error message (shown in dropdown)
  const [error, setError] = useState<string | null>(null);

  // If we hit 401, stop polling to avoid console spam
  const [authBlocked, setAuthBlocked] = useState(false);

  // Avoid setState on unmounted
  const mountedRef = useRef(true);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const fetchNotifications = useCallback(async () => {
    if (authBlocked) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/notifications?onlyUnread=false&limit=20", {
        method: "GET",
        cache: "no-store",
      });

      // 401 is an expected state (logged out / no cookie) — do not spam console
      if (res.status === 401) {
        if (!mountedRef.current) return;
        setAuthBlocked(true);
        setNotifications([]);
        setError("Please sign in to view notifications.");
        return;
      }

      if (!res.ok) {
        // Unexpected server error — log once
        console.error("Failed to fetch notifications", res.status);
        if (!mountedRef.current) return;
        setError("Failed to load notifications.");
        return;
      }

      const json: ListResponse = await res.json();
      if (!json.ok || !json.data) {
        if (!mountedRef.current) return;
        setError(json.error || "Failed to load notifications.");
        return;
      }

      if (!mountedRef.current) return;
      setNotifications(json.data.notifications);
    } catch (err) {
      // Network / parse errors — log once
      console.error("Error fetching notifications", err);
      if (!mountedRef.current) return;
      setError("Failed to load notifications.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [authBlocked]);

  useEffect(() => {
    mountedRef.current = true;

    // Initial load
    fetchNotifications();

    // Polling (stops automatically if authBlocked flips true)
    const id = window.setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => {
      mountedRef.current = false;
      window.clearInterval(id);
    };
  }, [fetchNotifications]);

  const toggleOpen = () => {
    setIsOpen((prev) => !prev);
  };

  const markOneRead = async (id: string) => {
    if (authBlocked) return;

    try {
      const res = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });

      if (res.status === 401) {
        setAuthBlocked(true);
        setError("Please sign in to view notifications.");
        return;
      }

      if (!res.ok) {
        console.error("Failed to mark notification read", res.status);
        return;
      }

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      );
    } catch (err) {
      console.error("Error marking notification read", err);
    }
  };

  const markAllRead = async () => {
    if (authBlocked) return;

    try {
      const res = await fetch("/api/notifications/read-all", {
        method: "POST",
      });

      if (res.status === 401) {
        setAuthBlocked(true);
        setError("Please sign in to view notifications.");
        return;
      }

      if (!res.ok) {
        console.error("Failed to mark all notifications read", res.status);
        return;
      }

      setNotifications((prev) =>
        prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() }))
      );
    } catch (err) {
      console.error("Error marking all notifications read", err);
    }
  };

  const deleteOne = async (id: string) => {
    if (authBlocked) return;

    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
      });

      if (res.status === 401) {
        setAuthBlocked(true);
        setError("Please sign in to view notifications.");
        return;
      }

      if (!res.ok) {
        console.error("Failed to delete notification", res.status);
        return;
      }

      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error("Error deleting notification", err);
    }
  };

  const hasNotifications = notifications.length > 0;

  return (
    <div className="relative inline-block text-left">
      {/* Bell button */}
      <button
        type="button"
        onClick={toggleOpen}
        className="relative inline-flex items-center justify-center rounded-full p-2 hover:bg-slate-100 border border-slate-200"
        aria-label="Notifications"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-slate-700"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 01-3.46 0" />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-amber-500 text-white text-[10px] font-semibold flex items-center justify-center px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 origin-top-right rounded-xl border border-slate-200 bg-white shadow-lg z-50">
          <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-800">Notifications</div>
            <div className="flex items-center gap-2">
              {hasNotifications && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-[11px] text-sky-700 hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && (
              <div className="px-3 py-3 text-xs text-slate-500">Loading notifications...</div>
            )}

            {error && !loading && (
              <div className="px-3 py-3 text-xs text-red-500">{error}</div>
            )}

            {!loading && !error && !hasNotifications && (
              <div className="px-3 py-3 text-xs text-slate-500">No notifications yet.</div>
            )}

            {!loading &&
              !error &&
              hasNotifications &&
              notifications.map((n) => {
                const isUnread = !n.readAt;
                return (
                  <div
                    key={n.id}
                    className={`px-3 py-2 text-xs border-b border-slate-100 flex items-start gap-2 ${
                      isUnread ? "bg-slate-50" : "bg-white"
                    }`}
                  >
                    <div className="mt-[3px]">
                      <span
                        className={`inline-block w-2 h-2 rounded-full ${
                          isUnread ? "bg-amber-500" : "bg-slate-300"
                        }`}
                      />
                    </div>

                    <div className="flex-1">
                      <div className="text-slate-800">{n.message}</div>
                      <div className="mt-1 text-[10px] text-slate-400">
                        {formatRelativeTime(n.createdAt)}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 ml-1">
                      {isUnread && (
                        <button
                          type="button"
                          onClick={() => markOneRead(n.id)}
                          className="text-[10px] text-sky-700 hover:underline"
                        >
                          Read
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteOne(n.id)}
                        className="text-[10px] text-slate-400 hover:text-red-500"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Tiny helper: "3h ago", "2d ago", etc.
 */
function formatRelativeTime(isoDate: string): string {
  const created = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min${diffMin === 1 ? "" : "s"} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek < 4) return `${diffWeek} week${diffWeek === 1 ? "" : "s"} ago`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth} month${diffMonth === 1 ? "" : "s"} ago`;
  const diffYear = Math.floor(diffDay / 365);
  return `${diffYear} year${diffYear === 1 ? "" : "s"} ago`;
}
