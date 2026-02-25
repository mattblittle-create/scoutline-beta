"use client";

import React from "react";

type Props = {
  firstName?: string | null;
  lastName?: string | null;
  photoUrl?: string | null;
  primaryPos?: string | null;
  secondaryPos?: string[] | null | string;
  committed?: { program?: string | null } | null;
};

export default function PlayerThumbCard({
  firstName,
  lastName,
  photoUrl,
  primaryPos,
  secondaryPos,
  committed,
}: Props) {
  const [broken, setBroken] = React.useState(false);

  React.useEffect(() => {
    setBroken(false);
  }, [photoUrl]);

  const initials = [firstName?.[0], lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase();

  const secondary =
    Array.isArray(secondaryPos) ? secondaryPos : (secondaryPos ? String(secondaryPos).split(",") : []);
  const secondaryText = secondary.filter(Boolean).join(", ");

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "64px 1fr",
        gap: 12,
        alignItems: "center",
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 12,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 10,
          overflow: "hidden",
          background: "#f1f5f9",
          display: "grid",
          placeItems: "center",
          border: "1px solid #e5e7eb",
        }}
        aria-label="Player thumbnail"
      >
        {photoUrl && !broken ? (
          <img
            src={photoUrl}
            alt={`${firstName ?? ""} ${lastName ?? ""}`.trim() || "Player"}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            onError={() => setBroken(true)}
          />
        ) : (
          <span style={{ fontSize: 20, fontWeight: 900, color: "#0f172a" }}>
            {initials || "—"}
          </span>
        )}
      </div>

      <div>
        <div style={{ fontWeight: 900, color: "#0f172a" }}>
          {[firstName, lastName].filter(Boolean).join(" ") || "Player"}
        </div>
        <div style={{ color: "#475569", fontWeight: 600, marginTop: 2 }}>
          {primaryPos || "—"}
          {secondaryText ? ` · ${secondaryText}` : ""}
        </div>
        {committed?.program ? (
          <div style={{ marginTop: 4, fontSize: 12, color: "#0f172a", fontWeight: 700 }}>
            Committed: {committed.program}
          </div>
        ) : null}
      </div>
    </div>
  );
}
