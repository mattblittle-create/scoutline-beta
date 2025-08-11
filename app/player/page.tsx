export default function PlayerPage() {
  return (
    <section style={{ padding: 24, maxWidth: 960, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>Player View — Demo</h1>
      <p style={{ marginBottom: 12 }}>Static demo of a player profile card. Replace with live data later.</p>
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginTop: 12 }}>
        <strong>Braden Little (2028) — SS / RHP</strong>
        <div style={{ marginTop: 8, color: "#6b7280" }}>Committed: <em>—</em></div>
        <ul style={{ marginTop: 12, lineHeight: 1.8 }}>
          <li>Exit Velo: 92 mph</li>
          <li>INF Velo: 84 mph</li>
          <li>60 yd: 7.08</li>
        </ul>
        <div style={{ marginTop: 12 }}>Video: <a href="https://x.com/BLittle2028" target="_blank" rel="noreferrer">Watch on X</a></div>
      </div>
      <p style={{ marginTop: 32 }}><a href="/" style={{ color: "#2563eb", textDecoration: "none" }}>⬅ Back to Home</a></p>
    </section>
  );
}
