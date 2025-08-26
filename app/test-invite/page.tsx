"use client";

import { useState } from "react";
import { sendCoachInvites } from "@/lib/client-api";

export default function TestInvitePage() {
  const [program, setProgram] = useState("State University");
  const [inviterName, setInviterName] = useState("Matt");
  const [emails, setEmails] = useState("coach1@example.com, coach2@example.com");
  const [msg, setMsg] = useState<string | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      const list = emails
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);
      const r = await sendCoachInvites({ program, inviterName, emails: list });
      if (r.ok) setMsg("✅ Invites sent!");
      else setMsg(`❌ ${r.error || "Some invites failed"}`);
    } catch (err: any) {
      setMsg(`❌ ${err.message}`);
    }
  }

  return (
    <main style={{ maxWidth: 640, margin: "40px auto", padding: 16 }}>
      <h1>Test: Send Coach Invites</h1>
      <form onSubmit={handleSend} style={{ display: "grid", gap: 12 }}>
        <input value={program} onChange={(e) => setProgram(e.target.value)} placeholder="Program" />
        <input value={inviterName} onChange={(e) => setInviterName(e.target.value)} placeholder="Inviter Name" />
        <textarea
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          placeholder="Comma-separated emails"
          rows={3}
        />
        <button type="submit">Send</button>
      </form>
      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </main>
  );
}
