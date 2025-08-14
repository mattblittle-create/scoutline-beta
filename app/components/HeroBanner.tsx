// app/components/HeroBanner.tsx
import Image from "next/image";
import Link from "next/link";

export default function HeroBanner() {
  return (
    <section
      style={{
        position: "relative",
        width: "100%",
        height: "46vh",
        minHeight: 320,
        overflow: "hidden",
      }}
      aria-label="ScoutLine Home"
    >
      {/* Full-bleed background image */}
      <Image
        src="/track_pic_homepage.jpg"
        alt="Track starting line—symbolizing a fresh start"
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
            maxWidth: 960,
            textAlign: "center",
            color: "white",
            textShadow: "0 2px 12px rgba(0,0,0,0.35)",
            transform: "translateY(-6%)",
          }}
        >
          {/* Tagline — matches AboutHero sizing/weight/leading */}
          <h1
            style={{
              margin: 0,
              fontWeight: 700,
              lineHeight: 1.1,
              fontSize: "clamp(24px, 4.2vw, 44px)",
            }}
          >
            Your recruiting journey starts here
          </h1>

          <p
            style={{
              margin: "12px auto 0",
              maxWidth: 740,
              lineHeight: 1.6,
              fontSize: "clamp(14px, 2.2vw, 18px)",
              color: "rgba(255,255,255,0.96)",
            }}
          >
            ScoutLine connects players, parents, and coaches on the fastest path to recruitment—
            with profiles, milestones, and progress in one place. Get seen. Get signed. Game on.
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
              href="/about"
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.96)",
                color: "#0f172a",
                textDecoration: "none",
                border: "1px solid #e5e7eb",
                fontWeight: 600,
              }}
            >
              Who We Are
            </Link>
            <Link
              href="/how-it-works"
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.96)",
                color: "#0f172a",
                textDecoration: "none",
                border: "1px solid #e5e7eb",
                fontWeight: 600,
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
              }}
            >
              Get Started
            </Link>
            <Link
              href="/contact"
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.96)",
                color: "#0f172a",
                textDecoration: "none",
                border: "1px solid #e5e7eb",
                fontWeight: 600,
              }}
            >
              Want to Know More
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
