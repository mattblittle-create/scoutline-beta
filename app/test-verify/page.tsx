"use client";

import { useState } from "react";
import { sendVerification } from "@/lib/client-api";

export default function TestVerifyPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      const result = await sendVerification(email);
      if (result.ok) {
        setMsg("✅ Verification email sent!");
      } else {
        setMsg("❌ Failed to send verification email.");
      }
    } catch (err: any) {
      setMsg(`❌ ${err.message}`);
    }
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Test Verification Email</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem" }}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
          style={{ flex: 1, padding: "0.5rem" }}
        />
        <button type="submit">Send verification</button>
      </form>
      {msg && <p style={{ marginTop: "1rem" }}>{msg}</p>}
    </main>
  );
}
