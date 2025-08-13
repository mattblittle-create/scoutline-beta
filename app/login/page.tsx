"use client";

import React, { Suspense, useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ maxWidth: 420, margin: "40px auto" }}>Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");

    // authenticate without redirect so we can decide where to go
    const res = await signIn("credentials", { email, password, redirect: false });

    if (!res || !res.ok) {
      setErr("Invalid email or password");
      return;
    }

    // fetch the fresh session (includes role via your NextAuth callbacks)
    const session = await getSession();
    const role = (session as any)?.role;

    // send user to their area based on role
    switch (role) {
      case "PLAYER":
        router.push("/player");
        break;
      case "PARENT":
        router.push("/parent");
        break;
      case "COACH":
        router.push("/coach");
        break;
      case "ADMIN":
      case "TEAM_ADMIN":
        router.push("/admin");
        break;
      default:
        router.push("/");
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto" }}>
      <h1>Log In</h1>
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

        <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 14 }}>
          <a href="/forgot-password">Forgot password?</a>
          <a href="/trouble-signing-in">Trouble signing in?</a>
        </div>

        {err && <div style={{ color: "crimson" }}>{err}</div>}
      </form>
    </div>
  );
}
