"use client";
import { useEffect, useState } from "react";
import { braden as defaultBraden, Player } from "../lib/samplePlayer";

const LS_COMMITTED = "bradenCommitted";
const LS_COLLEGE = "bradenCommittedCollege";

export default function AdminPage() {
  const [player, setPlayer] = useState<Player>(defaultBraden);

  // Load from localStorage on mount
  useEffect(() => {
    const committed = localStorage.getItem(LS_COMMITTED);
    const college = localStorage.getItem(LS_COLLEGE) ?? "";
    setPlayer(p => ({
      ...p,
      committed: committed ? committed === "true" : p.committed,
      committedCollege: college || p.committedCollege,
    }));
  }, []);

  // Save when these change
  useEffect(() => {
    localStorage.setItem(LS_COMMITTED, String(player.committed));
    localStorage.setItem(LS_COLLEGE, player.committedCollege ?? "");
  }, [player.committed, player.committedCollege]);

  return (
    <section style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 12 }}>Admin — Demo</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16 }}>
        {/* Read-only summary table */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
          <h2 style={{ margin: "0 0 8px" }}>Players (1)</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Name", "Grad", "Pos", "Committed", "School", "Org", "Exit Velo", "60 yd"].map(h => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={td}>{player.name}</td>
                  <td style={td}>{player.gradYear}</td>
                  <td style={td}>{player.positions.join(", ")}</td>
                  <td style={td}>{player.committed ? `Yes: ${player.committedCollege || "—"}` : "No"}</td>
                  <td style={td}>{player.school}</td>
                  <td style={td}>{player.org}</td>
                  <td style={td}>{player.metrics.exitVelo ?? "—"}</td>
                  <td style={td}>{player.metrics.sixtyYard ?? "—"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit panel */}
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
          <h2 style={{ margin: "0 0 8px" }}>Commit Status (Demo)</h2>

          <label style={labelStyle}>Committed</label>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <input
              type="checkbox"
              checked={player.committed}
              onChange={(e) => setPlayer({ ...player, committed: e.target.checked })}
            />
            <span>{player.committed ? "Yes" : "No"}</span>
          </label>

          {player.committed && (
            <>
              <label style={labelStyle}>Committed College</label>
              <input
                placeholder="College name"
                value={player.committedCollege ?? ""}
                onChange={(e) => setPlayer({ ...player, committedCollege: e.target.value })}
                style={inputStyle}
              />
            </>
          )}

          <hr style={{ margin: "16px 0" }} />

          <label style={labelStyle}>Exit Velo</label>
          <input
            placeholder="e.g., 92 mph"
            value={player.metrics.exitVelo ?? ""}
            onChange={(e) => setPlayer({ ...player, metrics: { ...player.metrics, exitVelo: e.target.value } })}
            style={inputStyle}
          />

          <label style={labelStyle}>60 Yard</label>
          <input
            placeholder="e.g., 7.08"
            value={player.metrics.sixtyYard ?? ""}
            onChange={(e) => setPlayer({ ...player, metrics: { ...player.metrics, sixtyYard: e.target.value } })}
            style={inputStyle}
          />

          <p style={{ marginTop: 12, color: "#6b7280", fontSize: 12 }}>
            Demo only — changes are saved to your browser (localStorage), not a database.
          </p>
        </div>
      </div>

      <p style={{ marginTop: 24 }}>
        <a href="/" style={{ color: "#2563eb", textDecoration: "none" }}>⬅ Back to Home</a>
      </p>
    </section>
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: "8px 10px", borderBottom: "1px solid #e5e7eb", fontWeight: 600, fontSize: 13 };
const td: React.CSSProperties = { padding: "8px 10px", borderBottom: "1px solid #f3f4f6", fontSize: 14 };
const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 8, marginBottom: 10 };
const labelStyle: React.CSSProperties = { display: "block", fontSize: 12, color: "#6b7280", marginBottom: 6, marginTop: 10 };
