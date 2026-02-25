// app/dashboard/coach/CoachProgramBrand.tsx
"use client";

import React from "react";
import type { CSSProperties } from "react";

export default function CoachProgramBrand(props: { collegeName: string; logoUrl: string }) {
  const { collegeName, logoUrl } = props;

  const [imgOk, setImgOk] = React.useState(true);

  const initials = collegeName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <div style={brandRow}>
      <div style={logoWrap} aria-hidden="true">
        {logoUrl && imgOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={`${collegeName} logo`}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={() => setImgOk(false)}
          />
        ) : (
          <div style={logoFallback}>{initials || "SL"}</div>
        )}
      </div>

      <div style={brandText}>
        <div style={orgName}>{collegeName}</div>
      </div>
    </div>
  );
}

const brandRow: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  minWidth: 0,
};

const logoWrap: CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 12,
  overflow: "hidden",
  border: "1px solid #e5e7eb",
  background: "#fff",
  display: "grid",
  placeItems: "center",
  flex: "0 0 auto",
};

const logoFallback: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "grid",
  placeItems: "center",
  fontWeight: 900,
  color: "#0f172a",
  background: "#f8fafc",
};

const brandText: CSSProperties = {
  display: "grid",
  gap: 2,
  minWidth: 0,
};

const orgName: CSSProperties = {
  margin: 0,
  fontSize: "1.75rem",
  fontWeight: 900,
  letterSpacing: "-0.02em",
  lineHeight: 1.15,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
