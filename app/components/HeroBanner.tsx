// app/components/HeroBanner.tsx
"use client";

import Link from "next/link";

export default function HeroBanner() {
  return (
    <section
      style={{
        background: "linear-gradient(to bottom right, #1e293b, #334155)",
        color: "#fff",
        padding: "60px 16px",
        borderRadius: 16,
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between", // push top + bottom apart
        alignItems: "center",
        minHeight: 380, // gives room for spacing
      }}
    >
      {/* Top-aligned headline */}
      <h1
        style={{
          margin: 0,
          fontSize: 36,
          lineHeight: 1.2,
          maxWidth: 700,
          fontWeight: 600,
        }}
      >
        Your recruiting journey starts here...
      </h1>

      {/* Bottom-aligned buttons */}
      <div style={{ marginTop: 40, display: "flex", gap: 16 }}>
        <Link
          href="/search"
          style={{
            background: "#facc15",
            color: "#0f172a",
            padding: "12px 24px",
            borderRadius: 8,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Search
        </Link>
        <Link
          href="/login"
          style={{
            background: "#facc15",
            color: "#0f172a",
            padding: "12px 24px",
            borderRadius: 8,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Log In
        </Link>
      </div>
    </section>
  );
}
