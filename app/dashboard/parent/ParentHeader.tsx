// app/dashboard/parent/ParentHeader.tsx

// app/dashboard/parent/ParentHeader.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

export default function ParentHeader() {
  const pathname = usePathname();

  function isActive(href: string) {
    return pathname === href;
  }

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        alignItems: "center",
        marginBottom: 18,
      }}
    >
      <Link
        href="/dashboard/parent"
        style={pill(isActive("/dashboard/parent"))}
      >
        Parent Home
      </Link>

      <Link
        href="/dashboard/player/profile"
        style={pill(pathname?.startsWith("/dashboard/player/profile") ?? false)}
      >
        View / Edit Player Profile
      </Link>

      <Link
        href="/dashboard/player/profile/billing"
        style={pill(
          pathname?.startsWith("/dashboard/player/profile/billing") ?? false
        )}
      >
        Billing
      </Link>
    </div>
  );
}

function pill(active: boolean): React.CSSProperties {
  return {
    display: "inline-block",
    padding: "10px 14px",
    borderRadius: 999,
    textDecoration: "none",
    fontWeight: 900,
    fontSize: 13,
    border: active ? "1px solid #caa042" : "1px solid #e5e7eb",
    background: active ? "#caa042" : "#ffffff",
    color: "#0f172a",
    boxShadow: active ? "0 8px 18px rgba(202,160,66,0.22)" : "none",
  };
}