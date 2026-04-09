// app/dashboard/player/page.tsx

"use client";

import Link from "next/link";
import React from "react";
import { useRouter } from "next/navigation";

type DashboardCardProps = {
  title: string;
  description: string;
  href?: string;
  disabled?: boolean;
  badge?: string;
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

  const [playerName, setPlayerName] = React.useState<string>("");
  const [playerPhotoUrl, setPlayerPhotoUrl] = React.useState<string>("");
  const [showNotifications, setShowNotifications] = React.useState(false);

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

        const first = String(norm?.firstName ?? "").trim();
        const last = String(norm?.lastName ?? "").trim();
        const fullName = [first, last].filter(Boolean).join(" ").trim();

        if (fullName) setPlayerName(fullName);

        const photo = String(user?.photoUrl ?? norm?.photoUrl ?? "").trim();
        if (photo) setPlayerPhotoUrl(photo);
      } catch {
        // no-op for dashboard shell
      }
    }

    loadDashboardIdentity();

    return () => {
      cancelled = true;
    };
  }, []);

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

          <div style={{ position: "relative" }}></div>
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
              12
            </span>
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
                  {[
                    "Coach viewed your profile",
                    "Your player card was saved to a recruiting board",
                    "Coach searched for players matching your metrics",
                    "New ScoutLine Chat message received",
                    "Time to update stats / metrics",
                  ].map((note, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        fontSize: 14,
                        color: "#334155",
                        lineHeight: 1.4,
                      }}
                    >
                      {note}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  style={{
                    marginTop: 14,
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    background: "#ffffff",
                    cursor: "pointer",
                    fontWeight: 800,
                    color: "#0f172a",
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
            style={{
              height: 42,
              padding: "0 14px",
              borderRadius: 999,
              border: "1px solid #0ea5e9",
              background: "#e0f2fe",
              color: "#0f172a",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            ScoutLine Chat
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
            In Progress
          </div>
          <div style={{ marginTop: 6, color: "#475569", fontSize: 14 }}>
            Continue updating your profile to improve recruiting visibility.
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
            Recent
          </div>
          <div style={{ marginTop: 6, color: "#475569", fontSize: 14 }}>
            Metrics, stats, grades, and video should stay current.
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
            12 New
          </div>
          <div style={{ marginTop: 6, color: "#475569", fontSize: 14 }}>
            Profile views, messages, saves, search activity, and reminders.
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
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
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
          title="Profile Editor"
          description="Open your player profile editor to update academics, athletics, metrics, stats, video, and references."
          href="/dashboard/player/profile"
          badge="Live"
        />

        <DashboardCard
          title="Recruiting Tool"
          description="Use ScoutLine’s fit and truth tools to better understand your recruiting level, best opportunities, and where you match."
          href="/dashboard/player/recruiting-tool"
          disabled
          badge="Coming Soon"
        />

        <DashboardCard
          title="College Search"
          description="Search colleges by region, division, conference, tuition, student life, admissions profile, and baseball fit."
          href="/dashboard/player/college-search"
          disabled
          badge="Coming Soon"
        />

        <DashboardCard
          title="Plan Billing"
          description="Manage your ScoutLine plan, review billing details, payment info, and upgrade options."
          href="/dashboard/player/profile/billing"
          badge="Live"
        />
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
            Chat shell coming next.
          </div>
        </div>
      </section>
    </main>
  );
}