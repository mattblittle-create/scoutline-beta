import { braden } from "../lib/samplePlayer";

export default function CoachPage() {
  const p = braden;

  return (
    <section style={{ padding: 24, maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>Coach View — Demo</h1>

      {/* Faux filters (non-functional for now) */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <input placeholder="Search name…" style={inputStyle} />
        <select style={inputStyle}>
          <option>All Grad Years</option>
          <option>2028</option>
          <option>2027</option>
        </select>
        <select style={inputStyle}>
          <option>All Positions</option>
          <option>SS</option>
          <option>RHP</option>
          <option>C</option>
        </select>
        <select style={inputStyle}>
          <option>Commit Status</option>
          <option>Uncommitted</option>
          <option>Committed</option>
        </select>
        <button style={buttonStyle}>Filter</button>
      </div>

      {/* Result card */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>{p.name} ({p.gradYear})</h2>
          <p style={{ margin: "6px 0 8px", color: "#6b7280" }}>
            {p.positions.join(" / ")} • {p.handedness} • {p.height}, {p.weight} • {p.city}
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <Badge>{p.org}</Badge>
            <Badge>{p.school}</Badge>
            <Badge>{p.committed ? `Committed: ${p.committedCollege}` : "Uncommitted"}</Badge>
          </div>
          <p style={{ margin: 0, color: "#374151" }}>{p.bio}</p>
        </div>

        <div>
          <h3 style={{ margin: "0 0 8px" }}>Key Metrics</h3>
          <ul style={{ margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
            {p.metrics.exitVelo && <li>Exit Velo: <strong>{p.metrics.exitVelo}</strong></li>}
            {p.metrics.infieldVelo && <li>INF Velo: <strong>{p.metrics.infieldVelo}</strong></li>}
            {p.metrics.sixtyYard && <li>60 yd: <strong>{p.metrics.sixtyYard}</strong></li>}
            {p.metrics.fastballMax && <li>FB Max: <strong>{p.metrics.fastballMax}</strong></li>}
          </ul>
          <div style={{ marginTop: 12 }}>
            {p.videoLinks.map(v => (
              <div key={v.url} style={{ marginBottom: 8 }}>
                <a href={v.url} target="_blank" rel="noreferrer">Watch: {v.label}</a>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p style={{ marginTop: 32 }}>
        <a href="/" style={{ color: "#2563eb", textDecoration: "none" }}>⬅ Back to Home</a>
      </p>
    </section>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 9999, background: "#f1f5f9", fontSize: 12 }}>
      {children}
    </span>
  );
}

const inputStyle: React.CSSProperties = { padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 8 };
const buttonStyle: React.CSSProperties = { padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: 8, background: "#f8fafc" };
