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
          <li>Clean dashboards, no clutter</li>
          <li>Live profile, metrics and milestones</li>
          <li>Quickly and easily update metrics, stats and player info</li>
          <li>Coach, parent and team admin views stay in sync with player updates</li>
          <li>Direct communication between player and coaches</li>
          <li>Ability to connect YouTube and social media links</li>
          <li>Get feedback on the effectiveness of your recruiting profile</li>
          <li>Track progress over time across key performance indicators</li>
        </ul>
      </main>
    </>
  );
}
