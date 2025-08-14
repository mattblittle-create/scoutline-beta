// app/recruiting-journey/page.tsx
export default function RecruitingJourneyPage() {
  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 16px", color: "#0f172a" }}>
      <h1 style={{ margin: 0, fontSize: 32, lineHeight: 1.15 }}>
        Your recruiting journey, organized and in your control.
      </h1>

      {/* Light divider line */}
      <div style={{ height: 1, background: "#e5e7eb", margin: "12px 0 16px" }} />

      <p style={{ marginTop: 0, maxWidth: 720, color: "#475569", lineHeight: 1.65 }}>
        ScoutLine brings your entire recruiting journey into one place—contacts, timelines,
        tasks, and progress—so you spend less time guessing and more time advancing.
      </p>

      <section
        style={{
          marginTop: 24,
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
  );
}
