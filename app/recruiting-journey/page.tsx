import RecruitingJourneyHero from "../components/RecruitingJourneyHero";

export default function RecruitingJourneyPage() {
  return (
    <>
      <RecruitingJourneyHero />

      <main
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "32px 16px",
          color: "#0f172a",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 32, lineHeight: 1.15 }}>
          Why ScoutLine?
        </h1>

        {/* Light divider line */}
        <div style={{ height: 1, background: "#e5e7eb", margin: "12px 0 16px" }} />

        <ul style={{ margin: "0 0 0 18px", color: "#475569", lineHeight: 1.65 }}>
          <li>Unified profile & milestones across sports</li>
          <li>Coach & parent views that stay in sync</li>
          <li>Clean dashboards, not clutter</li>
        </ul>
      </main>
    </>
  );
}
