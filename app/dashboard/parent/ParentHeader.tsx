// app/dashboard/parent/ParentHeader.tsx

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import SupportButton from "@/app/components/SupportButton";

type Props = {
  linkedPlayerProfileId?: string | null;
  linkedPlayerName?: string | null;
  notificationCount?: number;
};

type NavItem = {
  label: string;
  href: string;
  match: string;
  disabled?: boolean;
  badge?: string | number | null;
};

export default function ParentHeader({
  linkedPlayerProfileId,
  linkedPlayerName,
  notificationCount = 0,
}: Props) {
  const pathname = usePathname();

  const basePlayerPath = linkedPlayerProfileId
    ? `/dashboard/parent/player/${encodeURIComponent(
        linkedPlayerProfileId
      )}`
    : "";

  const navItems: NavItem[] = [
    {
      label: "Dashboard",
      href: "/dashboard/parent",
      match: "/dashboard/parent",
    },
    {
      label: "Player Overview",
      href: basePlayerPath || "/dashboard/parent",
      match: basePlayerPath,
      disabled: !linkedPlayerProfileId,
    },
    {
      label: "Recruiting Snapshot",
      href: basePlayerPath
        ? `${basePlayerPath}/recruiting`
        : "/dashboard/parent",
      match: basePlayerPath
        ? `${basePlayerPath}/recruiting`
        : "",
      disabled: !linkedPlayerProfileId,
    },
    {
      label: "College Search",
      href: basePlayerPath
        ? `${basePlayerPath}/college-search`
        : "/dashboard/parent",
      match: basePlayerPath
        ? `${basePlayerPath}/college-search`
        : "",
      disabled: !linkedPlayerProfileId,
    },
    {
      label: "Billing",
      href: basePlayerPath
        ? `${basePlayerPath}/billing`
        : "/dashboard/parent",
      match: basePlayerPath
        ? `${basePlayerPath}/billing`
        : "",
      disabled: !linkedPlayerProfileId,
    },
    {
      label: "Notifications",
      href: "/dashboard/parent/notifications",
      match: "/dashboard/parent/notifications",
      disabled: !linkedPlayerProfileId,
      badge: notificationCount > 0 ? notificationCount : null,
    },
  ];

  function isActive(item: NavItem) {
    if (!item.match) return false;

    if (item.match === "/dashboard/parent") {
      return pathname === "/dashboard/parent";
    }

    return pathname === item.match || pathname?.startsWith(`${item.match}/`);
  }

  return (
    <nav
      aria-label="Parent dashboard navigation"
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 18,
        background: "#ffffff",
        boxShadow: "0 10px 24px rgba(15,23,42,0.05)",
        padding: 10,
        marginBottom: 18,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {navItems.map((item) => {
          const active = isActive(item);

          if (item.disabled) {
            return (
              <span key={item.label} style={pill(false, true)}>
                <span>{item.label}</span>

                {item.badge ? (
                  <span style={badge}>{item.badge}</span>
                ) : null}
              </span>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              style={pill(active, false)}
            >
              <span>{item.label}</span>

              {item.badge ? (
                <span style={badge}>{item.badge}</span>
              ) : null}
            </Link>
          );
        })}

        {linkedPlayerProfileId ? (
<SupportButton
  subjectPrefix="Account Support Request"
  playerName={linkedPlayerName}
  targetId={linkedPlayerProfileId}
/>
        ) : null}
      </div>

      {!linkedPlayerProfileId ? (
        <div
          style={{
            marginTop: 10,
            padding: "10px 12px",
            borderRadius: 14,
            border: "1px solid #fde68a",
            background: "#fffbeb",
            color: "#78350f",
            fontWeight: 800,
            lineHeight: 1.45,
            fontSize: 13,
          }}
        >
          Link a player to unlock parent overview, recruiting snapshot,
          college search, billing, and notifications.
        </div>
      ) : null}
    </nav>
  );
}

function pill(
  active: boolean,
  disabled: boolean
): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 14px",
    borderRadius: 999,
    textDecoration: "none",
    fontWeight: 900,
    fontSize: 13,
    border: active
      ? "1px solid #caa042"
      : "1px solid #e5e7eb",
    background: active
      ? "#caa042"
      : disabled
      ? "#f8fafc"
      : "#ffffff",
    color: disabled ? "#94a3b8" : "#0f172a",
    boxShadow: active
      ? "0 8px 18px rgba(202,160,66,0.22)"
      : "none",
    cursor: disabled ? "not-allowed" : "pointer",
    userSelect: "none",
  };
}

const badge: React.CSSProperties = {
  minWidth: 20,
  height: 20,
  padding: "0 6px",
  borderRadius: 999,
  background: "#0f172a",
  color: "#ffffff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 11,
  fontWeight: 950,
};
