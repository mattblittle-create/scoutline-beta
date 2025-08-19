// app/components/HeroBanner.tsx
import Image from "next/image";
import Link from "next/link";

export default function HeroBanner() {
  return (
    <section
      style={{
        position: "relative",
        width: "100%",
        height: "56vh",
        minHeight: 320,
        overflow: "hidden",
      }}
      aria-label="ScoutLine Home"
    >
      {/* Full-bleed background image */}
      <Image
        src="/battersbox.jpg"
        alt="Home plate and batters box symbolizing where the game begins"
        fill
        priority
        sizes="100vw"
        style={{ objectFit: "cover" }}
      />

      {/* Top scrim to keep title/subtitle readable */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.25) 35%, rgba(0,0,0,0.00) 70%)",
          pointerEvents: "none",
        }}
      />
      {/* Bottom scrim so buttons pop while sitting on the image */}
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
        .hero-btn {
          padding: 10px 16px;
          border-radius: 10px;
          background: rgba(255,255,255,0.96);
          color: #0f172a;
          text-decoration: none;
          border: 1px solid #e5e7eb;
          font-weight: 600;
          transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
        }
        .hero-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.18);
          background: #f8fafc;
        }
        .login-btn {
          display: inline-block;
          padding: 12px 20px;
          border-radius: 12px;
          background: #ca9a3f;
          color: #1a1203;
          text-decoration: none;
          border: 1px solid transparent;
          font-weight: 700;
          transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
        }
        .login-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.18);
          background: #e0b253;
        }
      `}</style>

      {/* Overlay content split: title/subtitle up top, buttons at bottom (matches AboutHero layout) */}
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
        {/* Top: Title + Subtitle */}
        <div
          style={{
            width: "100%",
            maxWidth: 960,
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
        </div>

        {/* Bottom: Buttons (centered), first row = white CTAs, second row = gold Search + Log In */}
        <div
          style={{
            width: "100%",
            maxWidth: 960,
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
            <Link href="/about" className="hero-btn">
              Who We Are
            </Link>
            <Link href="/how-it-works" className="hero-btn">
              How It Works
            </Link>
            <Link href="/pricing" className="hero-btn">
              Get Started
            </Link>
            <Link href="/faq" className="hero-btn">
              Want to Know More
            </Link>
          </div>

          {/* Gold buttons underneath, centered */}
          <div
            style={{
              marginTop: 14,
              display: "flex",
              justifyContent: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <Link href="/search" className="login-btn">
              College Search
            </Link>
            <Link href="/login" className="login-btn">
              Log In
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
