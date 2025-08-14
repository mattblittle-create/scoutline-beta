// app/components/HeroBanner.tsx

import Image from "next/image";

export default function HeroBanner() {
  return (
    <section
      style={{
        position: "relative",
        width: "100%",
        height: "420px",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        color: "#fff",
      }}
    >
      {/* Full-width background image */}
      <Image
        src="/track_pic_homepage.jpg"
        alt="Track starting line"
        fill
        style={{ objectFit: "cover" }}
        priority
      />

      {/* Dark overlay for better text visibility */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0, 0, 0, 0.4)",
        }}
      ></div>

      {/* Content */}
      <div style={{ position: "relative", zIndex: 2, maxWidth: 900, padding: "0 16px" }}>
        <h1 style={{ fontSize: "2.5rem", fontWeight: 700, marginBottom: 12 }}>
          Your recruiting journey, organized and in your control.
        </h1>
        <p style={{ fontSize: "1.125rem", marginBottom: 24, lineHeight: 1.5 }}>
          ScoutLine brings your entire recruiting journey into one place—contacts, timelines,
          tasks, and progress—so you spend less time guessing and more time advancing.
        </p>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <a
            href="/about"
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              background: "#fff",
              color: "#0f172a",
              textDecoration: "none",
              border: "1px solid transparent",
              fontWeight: 600,
            }}
          >
            Who We Are
          </a>
          <a
            href="/how-it-works"
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              background: "#fff",
              color: "#0f172a",
              textDecoration: "none",
              border: "1px solid transparent",
              fontWeight: 600,
            }}
          >
            How It Works
          </a>
          <a
            href="/pricing"
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              background: "#fff",
              color: "#0f172a",
              textDecoration: "none",
              border: "1px solid transparent",
              fontWeight: 600,
            }}
          >
            Get Started
          </a>
          <a
            href="/contact"
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              background: "#fff",
              color: "#0f172a",
              textDecoration: "none",
              border: "1px solid transparent",
              fontWeight: 600,
            }}
          >
            Want To Know More
          </a>

          {/* NEW gold Log In button */}
          <a
            href="/login"
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              background: "#ca9a3f",
              color: "#1a1203",
              textDecoration: "none",
              border: "1px solid transparent",
              fontWeight: 600,
            }}
          >
            Log In
          </a>
        </div>
      </div>
    </section>
  );
}
