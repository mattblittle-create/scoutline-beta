"use client";

import React, { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

// Prevent static prerender issues with useSearchParams
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ maxWidth: 420, margin: "40px auto" }}>Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const params = useSearchParams();
  const router = useRouter();
  const role = (params.get("role") || "").toUpperCase();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.ok) {
      if (role === "PLAYER") router.push("/player");
      else if (role === "PARENT") router.push("/parent");
      else if (role === "COACH") router.push("/coach");
      else if (role === "TEAM ADMIN" || role === "ADMIN") router.push("/admin");
      else router.push("/");
    } else {
      setErr("Invalid email or password");
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto" }}>
      <h1>Log In {role ? `— ${role}` : ""}</h1>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <input
          type="email"
          placeholder="Email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
        />
        <input
          type="password"
          placeholder="Password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
        />
        <button
          type="submit"
          style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", cursor: "pointer" }}
        >
          Log In
        </button>
        {err && <div style={{ color: "crimson" }}>{err}</div>}
      </form>
    </div>
  );
}
