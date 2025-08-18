// app/about/page.tsx
import AboutHero from "../components/AboutHero";

export default function AboutPage() {
  return (
    <>
      <AboutHero />
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 16px" }}>
        <h2 style={{ marginTop: 0 }}>Our Mission</h2>

        {/* Light divider line */}
        <div style={{ height: 1, background: "#e5e7eb", margin: "12px 0 16px" }} />

        <p style={{ color: "#64748b", lineHeight: 1.65, maxWidth: 900 }}>
          ScoutLine is designed to bring clarity to recruiting. Players, parents, and coaches
          all share the same goal—opportunity. ScoutLine makes the path transparent and actionable.
          ScoutLine empowers athletes, families, and coaches with clear, organized tools to navigate
          the recruiting journey so more talent gets seen, and more dreams become reality.
        </p>
        
      </main>
    </>
  );
}
