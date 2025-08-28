// app/test-invite/page.tsx
"use client";

import { useState } from "react";
import { sendCoachInvites } from "@/lib/client-api";

export default function TestInvitePage() {
  const [program, setProgram] = useState("Rate Limit Univ.");
  const [inviterName, setInviterName] = useState("Tester");
  const [emailsText, setEmailsText] = useState("coach1@example.com, coach2@example.com");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setMsg(null);
    setBusy(true);

    try {
      const list = emailsText
        .split(/[, \n\r\t;]+/)
        .map((e) => e.trim())
        .filter(Boolean);

      await sendCoachInvites(program, inviterName, list);
      setMsg("✅ Invites sent!");
    } catch (err: any) {
      setMsg(`❌ ${err?.message || "Failed to send invites"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px" }}>
      <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 800 }}>Test Coach Invites</h1>

      <form onSubmit={onSubmit} style={{ marginTop: 12, display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Program</span>
          <input
            value={program}
            onChange={(e) => setProgram(e.target.value)}
            className="sl-input"
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Inviter Name</span>
          <input
            value={inviterName}
            onChange={(e) => setInviterName(e.target.value)}
            className="sl-input"
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Emails (comma/space/newline separated)</span>
          <textarea
            value={emailsText}
            onChange={(e) => setEmailsText(e.target.value)}
            rows={4}
            className="sl-input"
          />
        </label>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="submit"
            disabled={busy}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #caa042",
              background: "#caa042",
              color: "#0f172a",
              fontWeight: 800,
              cursor: "pointer",
              opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? "Sending…" : "Send Invites"}
          </button>
        </div>

        {msg && (
          <div
            style={{
              marginTop: 6,
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              background: "#f8fafc",
              fontWeight: 700,
            }}
          >
            {msg}
          </div>
        )}
      </form>

      <style>{`
        .sl-input {
          padding: 10px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          outline: none;
          background: #fff;
        }
        .sl-input:focus {
          border-color: #caa042;
          box-shadow: 0 0 0 3px rgba(202, 160, 66, 0.2);
        }
      `}</style>
    </main>
  );
}
