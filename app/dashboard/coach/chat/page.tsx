// app/dashboard/coach/chat/page.tsx

"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

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

export default function CoachChatPage() {
  const searchParams = useSearchParams();
  const requestedConversationId = String(searchParams.get("conversationId") || "").trim();

  const [currentUserId, setCurrentUserId] = React.useState<string>("");
  const [conversations, setConversations] = React.useState<ApiChatConversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = React.useState<string>("");
  const [messages, setMessages] = React.useState<ApiChatMessage[]>([]);
  const [draft, setDraft] = React.useState("");
  const [conversationSearch, setConversationSearch] = React.useState("");
  const [loadingConversations, setLoadingConversations] = React.useState(false);
  const [loadingMessages, setLoadingMessages] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const selectedConversation =
    conversations.find((c) => c.id === selectedConversationId) ?? null;

  const filteredConversations = React.useMemo(() => {
    const q = conversationSearch.trim().toLowerCase();
    if (!q) return conversations;

    return conversations.filter((c) => {
      const name = String(c.otherParticipant?.name || "").toLowerCase();
      return name.includes(q);
    });
  }, [conversations, conversationSearch]);

  React.useEffect(() => {
    let cancelled = false;

    async function loadMe() {
      try {
        const res = await fetch("/api/auth/me", {
          cache: "no-store",
          credentials: "include",
        });

        const json = await res.json().catch(() => null);
        if (cancelled) return;

        const id = String(json?.user?.id ?? "").trim();
        if (id) setCurrentUserId(id);
      } catch {
        if (!cancelled) setCurrentUserId("");
      }
    }

    loadMe();

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    async function loadConversations() {
      try {
        setLoadingConversations(true);
        setError(null);

        const res = await fetch("/api/chat/conversations", {
          cache: "no-store",
          credentials: "include",
        });

        const json = await res.json().catch(() => null);
        if (cancelled) return;

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || `Failed to load conversations (${res.status})`);
        }

        const rows: ApiChatConversation[] = Array.isArray(json?.data?.conversations)
          ? json.data.conversations
          : [];

        setConversations(rows);

        if (requestedConversationId && rows.some((r) => r.id === requestedConversationId)) {
          setSelectedConversationId(requestedConversationId);
          return;
        }

        setSelectedConversationId((prev) => {
          if (prev && rows.some((r) => r.id === prev)) return prev;
          return rows[0]?.id || "";
        });
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Failed to load conversations.");
          setConversations([]);
          setSelectedConversationId("");
        }
      } finally {
        if (!cancelled) setLoadingConversations(false);
      }
    }

    loadConversations();

    return () => {
      cancelled = true;
    };
  }, [requestedConversationId]);

  React.useEffect(() => {
    let cancelled = false;

    async function loadMessages() {
      if (!selectedConversationId) {
        setMessages([]);
        return;
      }

      try {
        setLoadingMessages(true);
        setError(null);
 
        const res = await fetch(
          `/api/chat/messages?conversationId=${encodeURIComponent(selectedConversationId)}`,
          {
            cache: "no-store",
            credentials: "include",
          }
        );

        const json = await res.json().catch(() => null);
        if (cancelled) return;

        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || `Failed to load messages (${res.status})`);
        }

        const rows: ApiChatMessage[] = Array.isArray(json?.data?.messages)
          ? json.data.messages
          : [];

        setMessages(rows);

        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConversationId
              ? { ...c, unreadCount: 0 }
              : c
          )
        );
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Failed to load messages.");
          setMessages([]);
        }
      } finally {
        if (!cancelled) setLoadingMessages(false);
      }
    }

    loadMessages();

    return () => {
      cancelled = true;
    };
  }, [selectedConversationId]);

  async function sendMessage() {
    const message = draft.trim();
    if (!selectedConversationId || !message) return;

    try {
      setSending(true);
      setError(null);

      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          conversationId: selectedConversationId,
          message,
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Failed to send (${res.status})`);
      }

      const created = json?.data?.message;
      if (!created) throw new Error("Missing created message.");

      setMessages((prev) => [...prev, created]);
      setDraft("");

      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedConversationId
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
    } catch (e: any) {
      setError(e?.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main
      style={{
        maxWidth: 1200,
        margin: "0 auto",
        padding: "16px 16px 16px",
        height: "calc(100vh - 140px)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "flex-start",
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "1.9rem",
              fontWeight: 900,
              color: "#0f172a",
            }}
          >
            ScoutLine Chat
          </h1>

          <p
            style={{
              marginTop: 8,
              marginBottom: 0,
              color: "#475569",
              lineHeight: 1.5,
              maxWidth: 760,
            }}
          >
            Coach-initiated conversations with players. Players can reply after you open the thread.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/dashboard/coach/recruiting-board" style={btnOutline}>
            Recruiting Board
          </Link>
          <Link href="/dashboard/coach" style={btnOutline}>
            Coach Dashboard
          </Link>
        </div>
      </div>

      {error ? (
        <div
          style={{
            marginBottom: 12,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#b91c1c",
            borderRadius: 12,
            padding: "10px 12px",
            fontWeight: 800,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      ) : null}

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "300px minmax(0, 1fr)",
          gap: 16,
          flex: 1,
          minHeight: 0,
          height: "100%",
          alignItems: "stretch",
        }}
      >
        <aside
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 18,
            background: "#ffffff",
            overflow: "hidden",
            display: "grid",
            gridTemplateRows: "auto minmax(0, 1fr)",
            minHeight: 0,
            height: "100%",
          }}
        >
          <div
            style={{
              padding: 14,
              borderBottom: "1px solid #e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div
              style={{
                fontWeight: 900,
                color: "#0f172a",
                whiteSpace: "nowrap",
              }}
            >
              Conversations
            </div>

            <input
              type="text"
              value={conversationSearch}
              onChange={(e) => setConversationSearch(e.target.value)}
              placeholder="Search"
              style={{
                minWidth: 0,
                width: 140,
                border: "1px solid #e5e7eb",
                borderRadius: 999,
                padding: "8px 12px",
                fontSize: 13,
                outline: "none",
                color: "#0f172a",
                background: "#ffffff",
              }}
            />
          </div>

          <div
            style={{
              padding: 12,
              display: "grid",
              gap: 8,
              overflowY: "auto",
              minHeight: 0,
              alignContent: "start",
            }}
          >
            {loadingConversations ? (
              <div style={{ padding: 12, color: "#64748b", fontSize: 14 }}>
                Loading conversations...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div style={{ padding: 12, color: "#64748b", fontSize: 14 }}>
                {conversationSearch.trim() ? "No matching conversations." : "No conversations yet."}
              </div>
            ) : (
              filteredConversations.map((thread) => {
                const active = thread.id === selectedConversationId;

                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => setSelectedConversationId(thread.id)}
                    style={{
                      textAlign: "left",
                      border: active ? "1px solid #7dd3fc" : "1px solid #e5e7eb",
                      background: active ? "#e0f2fe" : "#ffffff",
                      borderRadius: 12,
                      padding: "9px 12px",
                      cursor: "pointer",
                      minHeight: 42,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: active ? 900 : 800,
                        color: "#0f172a",
                        fontSize: 14,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {thread.otherParticipant?.name || "Unknown"}
                    </span>

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
                        }}
                      />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 18,
            background: "#ffffff",
            display: "grid",
            gridTemplateRows: "auto minmax(0, 1fr) auto",
            minWidth: 0,
            minHeight: 0,
            height: "100%",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: 16,
              borderBottom: "1px solid #e5e7eb",
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
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

            {selectedConversation?.subject ? (
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#475569",
                  background: "#f8fafc",
                  border: "1px solid #e5e7eb",
                  borderRadius: 999,
                  padding: "6px 10px",
                }}
              >
                {selectedConversation.subject}
              </div>
            ) : null}
          </div>

          <div
            style={{
              padding: 16,
              minHeight: 0,
              overflowY: "auto",
              display: "grid",
              gap: 12,
              alignContent: "start",
              background: "#f8fafc",
            }}
          >
            {!selectedConversationId ? (
              <div style={{ color: "#64748b", fontSize: 14 }}>
                Select a conversation to view messages.
              </div>
            ) : loadingMessages ? (
              <div style={{ color: "#64748b", fontSize: 14 }}>
                Loading messages...
              </div>
            ) : messages.length === 0 ? (
              <div style={{ color: "#64748b", fontSize: 14 }}>
                No messages yet.
              </div>
            ) : (
              messages.map((msg) => {
                const isCoach = msg.senderUserId === currentUserId;

                return (
                  <div
                    key={msg.id}
                    style={{
                      display: "flex",
                      justifyContent: isCoach ? "flex-end" : "flex-start",
                    }}
                  >
                    <div
                      style={{
                        maxWidth: "75%",
                        padding: "12px 14px",
                        borderRadius: 16,
                        background: isCoach ? "#e0f2fe" : "#ffffff",
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
              display: "grid",
              gap: 10,
              background: "#ffffff",
            }}
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={
                selectedConversationId
                  ? "Write a message to the player..."
                  : "Select a conversation first..."
              }
              disabled={!selectedConversationId || sending}
              style={{
                minHeight: 88,
                width: "100%",
                resize: "none",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                padding: 12,
                outline: "none",
                font: "inherit",
                color: "#0f172a",
                background: !selectedConversationId ? "#f8fafc" : "#ffffff",
              }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={sendMessage}
                disabled={!selectedConversationId || sending || !draft.trim()}
                style={{
                  height: 42,
                  padding: "0 16px",
                  borderRadius: 10,
                  border: "1px solid #0ea5e9",
                  background: "#38bdf8",
                  color: "#083344",
                  fontWeight: 800,
                  cursor:
                    !selectedConversationId || sending || !draft.trim()
                      ? "not-allowed"
                      : "pointer",
                  opacity:
                    !selectedConversationId || sending || !draft.trim()
                      ? 0.7
                      : 1,
                }}
              >
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

const btnOutline: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid #0ea5e9",
  background: "#ffffff",
  color: "#0f172a",
  fontWeight: 900,
  textDecoration: "none",
};