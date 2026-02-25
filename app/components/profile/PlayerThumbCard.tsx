// app/components/profile/PlayerThumbCard.tsx
"use client";

import React from "react";
import CommittedBadge, { CommittedData } from "./CommittedBadge";
import PublicAvatar from "@/app/components/shared/PublicAvatar";

type Props = {
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  primaryPos?: string;
  secondaryPos?: string[];
  committed?: CommittedData | null;
  onClick?: () => void;
  /** NEW: when committed, show the college name inside the pill */
  showCommittedCollege?: boolean;
};

export default function PlayerThumbCard({
  firstName,
  lastName,
  photoUrl,
  primaryPos,
  secondaryPos,
  committed,
  onClick,
  showCommittedCollege = false,
}: Props) {
  return (
    <article
      onClick={onClick}
      style={{
        width: 260,
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        background: "#fff",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        position: "relative",
      }}
    >
      <div style={{ position: "relative", height: 160, background: "#f1f5f9" }}>
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={`${firstName} ${lastName}`}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#94a3b8",
              fontWeight: 700,
              fontSize: 18,
            }}
          >
            No Photo
          </div>
        )}

        {/* Commitment pill overlay (top-left) — always render (shows Not Committed if falsey) */}
        <div style={{ position: "absolute", top: 10, left: 10 }}>
          <CommittedBadge
            committed={committed || undefined}
            size="sm"
            variant="solid"
            showCollege  // <— was false; now true so it shows the program
          />
        </div>
      </div>

      <div style={{ padding: 12 }}>
        <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 4 }}>
          {firstName} {lastName}
        </div>
        <div style={{ fontSize: 12.5, color: "#475569" }}>
          {primaryPos || "—"}
          {secondaryPos?.length ? ` · ${secondaryPos.join(", ")}` : ""}
        </div>
        {/* Optional inline college text stays (unchanged) */}
        {committed?.isCommitted && committed.college && (
          <div style={{ marginTop: 8, fontSize: 12.5, color: "#0F766E", fontWeight: 700 }}>
            {committed.college}
          </div>
        )}
      </div>
    </article>
  );
}
