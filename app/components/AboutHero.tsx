"use client";
import Image from "next/image";
import Link from "next/link";

export default function AboutHero() {
  return (
    <section
      style={{
        position: "relative",
        width: "100%",
        height: "56vh",
        minHeight: 320,
        overflow: "hidden",
      }}
      aria-label="About ScoutLine"
    >
      {/* Full-bleed background image */}
      <Image
        src="/baseballmound_pic_aboutpage.jpg"
        alt="Baseball mound with infield—symbolizing foundation and focus"
        fill
        priority
        sizes="100vw"
        style={{ objectFit: "cover" }}
      />

      {/* Scrim so text stays readable */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.25) 35%, rgba(255,255,255,0.00) 75%)",
          pointerEvents: "none",
        }}
      />

      {/* Centered overlay content */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          padding: "0 16px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 920,
            textAlign: "center",
            color: "white",
            textShadow: "0 2px 12px rgba(0,0,0,0.35)",
            transform: "translateY(-22%)", // moved higher on image
          }}
        >
          <h1
            style={{
              margin: 0,
              fontWeight: 700,
              lineHeight: 1.1,
              fontSize: "clamp(24px, 4.2vw, 44px)",
            }}
          >
            About ScoutLine
          </h1>

          <p
            style={{
              margin: "12px auto 0",
              maxWidth: 740,
              lineHeight: 1.6,
              fontSize: "clamp(14px, 2.2vw, 18px)",
              color: "rgba(255,255,255,0.95)",
            }}
          >
            Built by coaches and parents to make recruiting simpler, clearer, and fairer for
            athletes—across every step of the journey.
          </p>

          {/* Primary CTAs */}
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
              marginTop: 16,
            }}
          >
            <Link
              href="/recruiting-journey"
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.96)",
                color: "#0f172a",
                textDecoration: "none",
                border: "1px solid #e5e7eb",
                fontWeight: 600,
                transition: "all 0.2s ease-in-out",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f3f4f6";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.96)";
              }}
            >
              How It Works
            </Link>
            <Link
              href="/pricing"
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.96)",
                color: "#0f172a",
                textDecoration: "none",
                border: "1px solid #e5e7eb",
                fontWeight: 600,
                transition: "all 0.2s ease-in-out",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f3f4f6";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.96)";
              }}
            >
              Get Started
            </Link>
            <Link
              href="/faq"
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.96)",
                color: "#0f172a",
                textDecoration: "none",
                border: "1px solid #e5e7eb",
                fontWeight: 600,
                transition: "all 0.2s ease-in-out",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f3f4f6";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.96)";
              }}
            >
              Want To Know More
            </Link>
          </div>

          {/* Prominent Log In below the row */}
          <div style={{ marginTop: 14 }}>
            <Link
              href="/login"
              style={{
                display: "inline-block",
                padding: "12px 20px",
                borderRadius: 12,
                background: "#ca9a3f",
                color: "#1a1203",
                textDecoration: "none",
                border: "1px solid transparent",
                fontWeight: 700,
                transition: "all 0.2s ease-in-out",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#b88934";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#ca9a3f";
              }}
            >
              Log In
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
