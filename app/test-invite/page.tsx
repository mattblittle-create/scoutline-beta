// app/test-invite/page.tsx
"use client";

import * as React from "react";
import { sendCoachInvites } from "@/lib/client-api";

export default function TestInvitePage() {
  const [program, setProgram] = React.useState("");
  const [inviterName, setInviterName] = React.useState("");
  const [emails, setEmails] = React.useState("");
  const [msg, setMsg] = React.useState<string | null>(null);
  const [sending, setSending] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSending(true);
    try {
      const list = emails
        .split(/[,\s]+/)
        .map((e) => e.trim())
        .filter(Boolean);

      // ✅ call the 3-arg variant your API currently exports
      const r = await sendCoachInvites(program, inviterName, list);

      if (r.ok) setMsg("✅ Invites sent!");
      else setMsg(`❌ ${r.error || "Some invites failed"}`);
    } catch (err: any) {
      setMsg(`❌ ${err?.message || "Failed to send invites"}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: 20 }}>
      <h1 style={{ fontWeight: 800, fontSize: "1.6rem" }}>Test Coach Invites</h1>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Program</span>
          <input
            value={program}
            onChange={(e) => setProgram(e.target.value)}
            placeholder="Rate Limit Univ."
            style={{ padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8 }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Your Name</span>
          <input
            value={inviterName}
            onChange={(e) => setInviterName(e.target.value)}
            placeholder="Tester"
            style={{ padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8 }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Emails (comma or space separated)</span>
          <textarea
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            rows={4}
            placeholder="a@u.edu, b@u.edu c@u.edu"
            style={{ padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8 }}
          />
        </label>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="submit"
            disabled={sending}
            style={{
              background: "#caa042",
              color: "#0f172a",
              fontWeight: 800,
              border: "1px solid #caa042",
              borderRadius: 8,
              padding: "10px 14px",
              cursor: "pointer",
              opacity: sending ? 0.7 : 1,
            }}
          >
            {sending ? "Sending…" : "Send Invites"}
          </button>
        </div>

        {msg && (
          <div
            style={{
              marginTop: 6,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              background: "#f8fafc",
              color: "#0f172a",
              fontWeight: 700,
            }}
          >
            {msg}
          </div>
        )}
      </form>
    </main>
  );
}
