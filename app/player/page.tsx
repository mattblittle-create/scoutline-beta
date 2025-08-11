"use client";
import { useEffect, useState } from "react";
import { braden as defaultBraden, Player } from "../lib/samplePlayer";

const LS_COMMITTED = "bradenCommitted";
const LS_COLLEGE = "bradenCommittedCollege";

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 9999, background: "#eef2ff", color: "#3730a3", fontSize: 12 }}>
      {children}
    </span>
  );
}

export default function PlayerPage() {
  const [p, setP] = useState<Player>(defaultBraden);

  useEffect(() => {
    const committed = localStorage.getItem(LS_COMMITTED);
    const college = localStorage.getItem(LS_COLLEGE) ?? "";
    setP(prev => ({
      ...prev,
      committed: committed ? committed === "true" : prev.committed,
      committedCollege: college || prev.committedCollege,
    }));
  }, []);

  return (
    <section style={{ padding: 24, maxWidth: 960, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>
        {p.name} ({p.gradYear}) — {p.positions.join(" / ")}
      </h1>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        {p.handedness && <Badge>{p.handedness}</Badge>}
        {p.height && <Badge>{p.height}</Badge>}
        {p.weight && <Badge>{p.weight}</Badge>}
        {p.committed ? <Badge>COMMITTED: {p.committedCollege || "—"}</Badge> : <Badge>Uncommitted</Badge>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
        {/* bio, academics, metrics, video (unchanged) */}
        <Card title="Bio"><p style={{ margin: 0 }}>{p.bio}</p></Card>
        <Card title="Academics & Orgs">
          <ul style={{ margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
            <li><strong>School:</strong> {p.school}</li>
            <li><strong>Organization:</strong> {p.org}</li>
            <li><strong>Region:</strong> {p.city}</li>
            {p.academics?.gpa && <li><strong>GPA:</strong> {p.academics.gpa}</li>}
            {p.academics?.interests && <li><strong>Academic Interests:</strong> {p.academics.interests.join(", ")}</li>}
          </ul>
        </Card>
        <Card title="Metrics">
          <ul style={{ margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
            {p.metrics.exitVelo && <li>Exit Velo: <strong>{p.metrics.exitVelo}</strong></li>}
            {p.metrics.infieldVelo && <li>INF Velo: <strong>{p.metrics.infieldVelo}</strong></li>}
            {p.metrics.sixtyYard && <li>60 yd: <strong>{p.metrics.sixtyYard}</strong></li>}
            {p.metrics.fastballMax && <li>FB Max: <strong>{p.metrics.fastballMax}</strong></li>}
          </ul>
        </Card>
        <Card title="Video Links">
          <ul style={{ margin: 0, paddingLeft: 16, lineHeight: 2 }}>
            {p.videoLinks.map(v => (
              <li key={v.url}><a href={v.url} target="_blank" rel="noreferrer">{v.label}</a></li>
            ))}
          </ul>
        </Card>
      </div>

      <p style={{ marginTop: 32 }}>
        <a href="/" style={{ color: "#2563eb", textDecoration: "none" }}>⬅ Back to Home</a>
      </p>
    </section>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
      <h2 style={{ fontSize: 18, margin: "0 0 8px" }}>{title}</h2>
      {children}
    </div>
  );
}
