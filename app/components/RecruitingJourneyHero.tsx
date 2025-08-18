// app/components/RecruitingJourneyHero.tsx
"use client";
import Image from "next/image";
import Link from "next/link";

export default function RecruitingJourneyHero() {
  return (
    <section
      style={{
        position: "relative",
        width: "100%",
        height: "56vh",
        minHeight: 320,
        overflow: "hidden",
      }}
      aria-label="Recruiting Journey"
    >
      {/* Full-bleed background image */}
      <Image
        src="/slidingintohome.jpg"
        alt="Player sliding into home plate—control your path"
        fill
        priority
        sizes="100vw"
        style={{ objectFit: "cover" }}
      />

      {/* Top scrim for text */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.25) 35%, rgba(0,0,0,0.00) 70%)",
          pointerEvents: "none",
        }}
      />
      {/* Bottom scrim for buttons */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to top, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.10) 30%, rgba(0,0,0,0.00) 55%)",
          pointerEvents: "none",
        }}
      />

      <style>{`
        .sl-btn {
          display: inline-block;
          padding: 10px 16px;
          border-radius: 10px;
          background: rgba(255,255,255,0.96);
          color: #0f172a;
          text-decoration: none;
          border: 1px solid #e5e7eb;
          font-weight: 600;
          transition: transform .2s ease, box-shadow .2s ease, background-color .2s ease, text-decoration-color .2s ease, border-color .2s ease;
        }
        .sl-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.18);
          background: #f3f4f6;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .sl-btn-gold {
          display: inline-block;
          padding: 12px 20px;
          border-radius: 12px;
          background: #ca9a3f;
          color: #1a1203;
          text-decoration: none;
          border: 1px solid transparent;
          font-weight: 700;
          transition: transform .2s ease, box-shadow .2s ease, background-color .2s ease, color .2s ease;
        }
        .sl-btn-gold:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.20);
          background: #b88934;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
      `}</style>

      {/* Content layout */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "18px 16px",
        }}
      >
        {/* Top text */}
        <div
          style={{
            width: "100%",
            maxWidth: 920,
            margin: "0 auto",
            textAlign: "center",
            color: "white",
            textShadow: "0 2px 12px rgba(0,0,0,0.35)",
            transform: "translateY(2%)",
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
            Your recruiting journey, organized and in control
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
            ScoutLine brings your entire recruiting journey into one place—contacts, timelines,
            tasks, and progress—so you spend less time guessing and more time advancing.
          </p>
        </div>

        {/* Bottom buttons */}
        <div
          style={{
            width: "100%",
            maxWidth: 920,
            margin: "0 auto 16px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Link href="/about" className="sl-btn">
              Who We Are
            </Link>
            <Link href="/pricing" className="sl-btn">
              Get Started
            </Link>
            <Link href="/faq" className="sl-btn">
              Want to Know More
            </Link>
          </div>

          {/* Gold buttons: Search (left) + Log In (right) */}
          <div
            style={{
              marginTop: 14,
              display: "flex",
              justifyContent: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <Link href="/search" className="sl-btn-gold">
              Search
            </Link>
            <Link href="/login" className="sl-btn-gold">
              Log In
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
