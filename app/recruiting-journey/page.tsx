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

        <ul
  style={{
    margin: "20px 0",
    padding: 0,
    listStyleType: "disc",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px 32px",
    color: "#475569",
    lineHeight: 1.6,
  }}
>
  <li>Clean dashboards, no clutter</li>
  <li>Live profile, metrics and milestones</li>
  <li>Update stats and player info in seconds</li>
  <li>Coach, parent, and team admin views stay synced with player updates</li>
  <li>Highlight reels and game film embedded directly in your profile</li>
  <li>Direct communication between player and coaches</li>
  <li>Insights into how your profile performs with recruiters</li>
  <li>Track progress over time across key performance indicators</li>
  <li>Mobile-friendly design so you can update and share on the go</li>
  <li>Affordable plans, no hidden fees – built for families, not just programs</li>
</ul>

      </main>
    </>
  );
}
