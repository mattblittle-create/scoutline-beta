"use client";

import React from "react";

type Props = {
  firstName?: string | null;
  lastName?: string | null;
  photoUrl?: string | null | undefined;
  /** Square size in px */
  size?: number;
};

/**
 * PublicAvatar
 * - Uses a plain <img> (no Next/Image) to avoid remotePatterns headaches.
 * - Falls back to initials if the image fails or is missing.
 * - CORS- & referrer-safe for Vercel Blob / S3-style URLs.
 * - Lazy loads and decodes async for perf.
 */
export default function PublicAvatar({
  firstName,
  lastName,
  photoUrl,
  size = 96,
}: Props) {
  const [broken, setBroken] = React.useState(false);

  const initials = React.useMemo(
    () =>
      [firstName?.[0], lastName?.[0]]
        .filter(Boolean)
        .join("")
        .toUpperCase(),
    [firstName, lastName]
  );

  const showFallback = !photoUrl || broken;

  const box: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: 12,
    overflow: "hidden",
    border: "1px solid #e5e7eb",
    background: "#f1f5f9",
    display: "grid",
    placeItems: "center",
    flex: "0 0 auto",
  };

  return (
    <figure style={box} aria-label="Player photo">
      {showFallback ? (
        <span
          style={{
            fontSize: Math.max(14, Math.floor(size * 0.33)),
            fontWeight: 900,
            color: "#0f172a",
            lineHeight: 1,
          }}
        >
          {initials || "—"}
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl!}
          alt={`${firstName ?? ""} ${lastName ?? ""}`.trim() || "Player"}
          width={size}
          height={size}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
          onError={() => setBroken(true)}
        />
      )}
    </figure>
  );
}
