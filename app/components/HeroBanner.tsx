// app/components/HeroBanner.tsx

import Image from "next/image";

const baseBtn: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: 10,
  textDecoration: "none",
  border: "1px solid transparent",
  fontWeight: 600,
  transition: "transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease",
  display: "inline-block",
};

const whiteBtn: React.CSSProperties = {
  ...baseBtn,
  background: "#fff",
  color: "#0f172a",
};

const goldBtn: React.CSSProperties = {
  ...baseBtn,
  background: "#ca9a3f",    // brand gold
  color: "#1a1203",
};

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
      />

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
          {[
            { label: "Who We Are", link: "/about" },
            { label: "How It Works", link: "/how-it-works" },
            { label: "Get Started", link: "/pricing" },
            { label: "Want to Know More", link: "/contact" },
          ].map((btn) => (
            <a
              key={btn.label}
              href={btn.link}
              style={whiteBtn}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.18)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {btn.label}
            </a>
          ))}

          {/* Gold Log In button */}
          <a
            href="/login"
            style={goldBtn}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.18)";
              e.currentTarget.style.background = "#e0b253"; // lighter gold on hover
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.background = "#ca9a3f";
            }}
          >
            Log In
          </a>
        </div>
      </div>
    </section>
  );
}
