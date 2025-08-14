// app/components/HeroBanner.tsx
import Image from "next/image";
import Link from "next/link";

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
      {/* Background image */}
      <Image
        src="/track_pic_homepage.jpg"
        alt="Track starting line"
        fill
        style={{ objectFit: "cover" }}
        priority
      />

      {/* Dark overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0, 0, 0, 0.4)",
        }}
      />

      <style>{`
        .hero-wrap { position: relative; z-index: 2; max-width: 900px; padding: 0 16px; }
        .hero-title { font-size: 2.5rem; font-weight: 700; margin-bottom: 8px; }
        .hero-tagline { font-size: 1.5rem; font-weight: 500; margin-bottom: 16px; color: #ffffff; }
        .hero-sub { font-size: 1.125rem; margin-bottom: 24px; line-height: 1.5; color: #ffffff; }

        .btn {
          display: inline-block;
          padding: 10px 16px;
          border-radius: 10px;
          text-decoration: none;
          border: 1px solid transparent;
          font-weight: 600;
          transition: transform .2s ease, box-shadow .2s ease, background-color .2s ease, color .2s ease, border-color .2s ease;
        }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.18); }

        .btn-white { background: #fff; color: #0f172a; }
        .btn-white:hover { background: #f8fafc; }

        .btn-gold { background: #ca9a3f; color: #1a1203; }
        .btn-gold:hover { background: #e0b253; }

        .btn-row { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; }
        .login-wrap { margin-top: 14px; }
        .btn-login-lg { padding: 12px 20px; border-radius: 12px; }
      `}</style>

      <div className="hero-wrap">
        {/* New tagline line */}
        <div className="hero-tagline">Your recruiting journey starts here</div>

        <p className="hero-sub">
          ScoutLine connects players, parents, and coaches on the fastest path to recruitment—with profiles, milestones, and progress in one place. Get seen. Get signed. Game on.
        </p>

        <div className="btn-row">
          <Link href="/about" className="btn btn-white">Who We Are</Link>
          <Link href="/how-it-works" className="btn btn-white">How It Works</Link>
          <Link href="/pricing" className="btn btn-white">Get Started</Link>
          <Link href="/contact" className="btn btn-white">Want to Know More</Link>
        </div>

        <div className="login-wrap">
          <Link href="/login" className="btn btn-gold btn-login-lg">Log In</Link>
        </div>
      </div>
    </section>
  );
}
