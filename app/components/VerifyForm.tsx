"use client";
import { useState } from "react";
import { sendVerification } from "@/lib/client-api";

export default function VerifyForm() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      const result = await sendVerification(email);
      if (result.ok) setMsg("✅ Verification email sent!");
    } catch (err: any) {
      setMsg(`❌ ${err.message}`);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        required
      />
      <button type="submit">Send verification</button>
      {msg && <p>{msg}</p>}
    </form>
  );
}
