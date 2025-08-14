import HeroBanner from "./components/HeroBanner";

export default function HomePage() {
  return (
    <>
      <HeroBanner />

      <main
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "32px 16px",
          color: "#0f172a",            // force visible text color
          background: "transparent",
        }}
      >

        <h1 style={{ marginTop: 10, fontSize: 32, lineHeight: 1.15 }}>
          Your recruiting journey, organized and in your control.
        </h1>

        <p style={{ marginTop: 12, maxWidth: 720, color: "#64748b", lineHeight: 1.65 }}>
          ScoutLine brings your entire recruiting journey into one place—contacts, timelines,
          tasks, and progress—so you spend less time guessing and more time advancing.
        </p>

        <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
          
        </div>

        <section
          style={{
            marginTop: 28,
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            padding: 18,
            background: "#fff",
            boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
          }}
        >
          <h2 style={{ margin: 0, fontSize: 24 }}>Why ScoutLine</h2>
          <ul style={{ margin: "10px 0 0 18px", color: "#64748b", lineHeight: 1.6 }}>
            <li>Unified profile & milestones across sports</li>
            <li>Coach & parent views that stay in sync</li>
            <li>Clean dashboards, not clutter</li>
          </ul>
        </section>
      </main>
    </>
  );
}
