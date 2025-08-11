export default function CoachPage() {
  return (
    <section style={{ padding: 24, maxWidth: 960, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>Coach View — Demo</h1>
      <p style={{ marginBottom: 12 }}>Static demo list. Replace with live database results later.</p>
      <ol style={{ marginTop: 12, lineHeight: 1.8 }}>
        <li>Braden Little — SS/RHP — 2028 — Charlotte, NC</li>
        <li>Player Two — C — 2027 — Rock Hill, SC</li>
        <li>Player Three — OF — 2026 — Gastonia, NC</li>
      </ol>
      <p style={{ marginTop: 32 }}><a href="/" style={{ color: "#2563eb", textDecoration: "none" }}>⬅ Back to Home</a></p>
    </section>
  );
}
