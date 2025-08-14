import AboutHero from "../components/AboutHero";

export default function AboutPage() {
  return (
    <>
      <AboutHero />
      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 16px" }}>
        <h2 style={{ marginTop: 0 }}>Our Mission</h2>
        <p style={{ color: "#64748b", lineHeight: 1.65, maxWidth: 800 }}>
          We started ScoutLine to bring clarity to recruiting. Players, parents, and coaches
          all share the same goal—opportunity. We make the path transparent and actionable.
        </p>
      </main>
    </>
  );
}
