// app/components/profile/CommittedBadge.tsx
"use client";

import React from "react";

export type CommittedData = {
  isCommitted: boolean;
  college?: string;
};

type Props = {
  committed?: CommittedData;         // if omitted, treat as not committed
  size?: "sm" | "md";
  variant?: "solid" | "outline";
  showCollege?: boolean;             // when committed, append college name
  /** When committed, use this as the pill’s accent color (defaults to #ca9a3f) */
  accentHex?: string;
  className?: string;
  style?: React.CSSProperties;
};

export default function CommittedBadge({
  committed,
  size = "md",
  variant = "solid",
  showCollege = true,
  accentHex, // NEW
  className,
  style,
}: Props) {
  const isCommitted = !!committed?.isCommitted;
  const hasCollege = !!committed?.college;

  const label = isCommitted
    ? showCollege && hasCollege
      ? `Committed — ${committed!.college}`
      : "Committed"
    : "Not Committed";

  const pad = size === "sm" ? "3px 8px" : "5px 10px";
  const fontSize = size === "sm" ? 12 : 13;

  // Visual tokens
  const accent = accentHex || "#ca9a3f"; // gold by default when committed
  const infoBlue = "#0ea5e9";            // previous accent for non-committed outline, etc.
  const neutralBg = "#e5e7eb";
  const neutralText = "#111827";

  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: pad,
    borderRadius: 999,
    fontWeight: 800,
    fontSize,
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
    color: "#0f172a",
    lineHeight: 1,
    whiteSpace: "nowrap",
    ...style,
  };

  if (variant === "solid") {
    if (isCommitted) {
      // GOLD solid for committed
      return (
        <span
          className={className}
          style={{
            ...base,
            background: accent,
            borderColor: accent,
            color: "#0f172a",
          }}
          title={label}
        >
          {label}
        </span>
      );
    }
    // neutral for not committed
    return (
      <span
        className={className}
        style={{
          ...base,
          background: neutralBg,
          borderColor: neutralBg,
          color: neutralText,
        }}
        title={label}
      >
        {label}
      </span>
    );
  }

  // outline variant
  return (
    <span
      className={className}
      style={{
        ...base,
        background: "#ffffff",
        borderColor: isCommitted ? accent : "#cbd5e1",
        color: isCommitted ? accent : infoBlue, // slight pop even when not committed
      }}
      title={label}
    >
      {label}
    </span>
  );
}
