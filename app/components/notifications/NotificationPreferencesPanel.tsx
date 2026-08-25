// app/components/notifications/NotificationPreferencesPanel.tsx

"use client";

import React, { useEffect, useState } from "react";

type Preferences = {
  instantChatMessages: boolean;
  digestChatMessages: boolean;
  instantProgramSaves: boolean;
  instantNewMatches: boolean;
  instantStaffActivity: boolean;
  weeklyDigest: boolean;
  verificationReminders: boolean;
};

const DEFAULT_PREFS: Preferences = {
  instantChatMessages: true,
  digestChatMessages: false,
  instantProgramSaves: true,
  instantNewMatches: true,
  instantStaffActivity: true,
  weeklyDigest: true,
  verificationReminders: true,
};

export default function NotificationPreferencesPanel() {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<keyof Preferences | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadPreferences() {
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/notifications/preferences", {
        cache: "no-store",
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Could not load notification preferences.");
      }

      setPrefs({
        ...DEFAULT_PREFS,
        ...json.preferences,
      });
    } catch (err: any) {
      setMessage(err?.message || "Could not load notification preferences.");
    } finally {
      setLoading(false);
    }
  }

  async function updatePreference(key: keyof Preferences, value: boolean) {
    const previous = prefs;

    setPrefs((current) => ({
      ...current,
      [key]: value,
    }));

    setSavingKey(key);
    setMessage(null);

    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || "Could not update notification preference.");
      }

      setPrefs({
        ...DEFAULT_PREFS,
        ...json.preferences,
      });

      setMessage("Notification preferences updated.");
    } catch (err: any) {
      setPrefs(previous);
      setMessage(err?.message || "Could not update notification preference.");
    } finally {
      setSavingKey(null);
    }
  }

  useEffect(() => {
    loadPreferences();
  }, []);

  const rows: Array<{
    key: keyof Preferences;
    title: string;
    description: string;
  }> = [
    {
      key: "instantChatMessages",
      title: "Instant chat messages",
      description: "Get notified right away when a new chat message comes in.",
    },
    {
      key: "digestChatMessages",
      title: "Chat message digest",
      description: "Include unread chat activity in digest-style summaries.",
    },
    {
      key: "instantProgramSaves",
      title: "Program save alerts",
      description: "Notify coaches when a player saves their program.",
    },
    {
      key: "instantNewMatches",
      title: "New match alerts",
      description: "Notify coaches when new player profiles match program needs.",
    },
    {
      key: "instantStaffActivity",
      title: "Staff activity alerts",
      description: "Notify coaches when staff invite, list, note, or rating activity happens.",
    },
    {
      key: "weeklyDigest",
      title: "Weekly digest",
      description: "Receive a weekly summary of recruiting and notification activity.",
    },
    {
      key: "verificationReminders",
      title: "Program verification reminders",
      description: "Remind coaches/admins when program details need review.",
    },
  ];

  return (
    <section
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 18,
        background: "#ffffff",
        padding: 20,
        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <h2
          style={{
            margin: 0,
            fontSize: 20,
            lineHeight: 1.2,
            color: "#0f172a",
          }}
        >
          Notification Preferences
        </h2>
        <p
          style={{
            margin: "6px 0 0",
            fontSize: 14,
            color: "#64748b",
          }}
        >
          Choose which ScoutLine updates should be immediate and which can wait
          for a digest.
        </p>
      </div>

      {loading ? (
        <div style={{ color: "#64748b", fontSize: 14 }}>
          Loading notification preferences...
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {rows.map((row) => {
            const disabled = savingKey === row.key;

            return (
              <div
                key={row.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16,
                  border: "1px solid #eef2f7",
                  borderRadius: 14,
                  padding: 14,
                  background: "#f8fafc",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#0f172a",
                    }}
                  >
                    {row.title}
                  </div>
                  <div
                    style={{
                      marginTop: 3,
                      fontSize: 13,
                      color: "#64748b",
                      lineHeight: 1.35,
                    }}
                  >
                    {row.description}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => updatePreference(row.key, !prefs[row.key])}
                  aria-pressed={prefs[row.key]}
                  style={{
                    minWidth: 74,
                    border: "none",
                    borderRadius: 999,
                    padding: "8px 12px",
                    cursor: disabled ? "not-allowed" : "pointer",
                    fontWeight: 800,
                    fontSize: 12,
                    color: prefs[row.key] ? "#ffffff" : "#334155",
                    background: prefs[row.key] ? "#0f172a" : "#e2e8f0",
                    opacity: disabled ? 0.7 : 1,
                  }}
                >
                  {prefs[row.key] ? "ON" : "OFF"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {message ? (
        <div
          style={{
            marginTop: 14,
            fontSize: 13,
            color: message.includes("Could not") ? "#b91c1c" : "#166534",
          }}
        >
          {message}
        </div>
      ) : null}
    </section>
  );
}