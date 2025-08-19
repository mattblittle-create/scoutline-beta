"use client";

import Link from "next/link";
import React from "react";

export default function ForgotUsernamePage() {
  return (
    <main style={{ maxWidth: 480, margin: "72px auto", padding: 24 }}>
      <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>Find Username</h1>
      <p style={{ color: "#64748b", marginTop: 8 }}>
        Enter the email associated with your account and we’ll send your username.
      </p>

      <form
        style={{ marginTop: 16, border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "#fff" }}
        onSubmit={(e) => {
          e.preventDefault();
          // hook up to your username lookup handler here
        }}
      >
        <label htmlFor="fu-email" style={{ display: "block", fontWeight: 600 }}>
          Email Address
        </label>
        <input
          id="fu-email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
          style={{
            width: "100%",
            marginTop: 6,
            padding: "10px 12px",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            outline: "none",
          }}
        />

        <button
          type="submit"
          style={{
            marginTop: 14,
            width: "100%",
            padding: "10px 14px",
            borderRadius: 10,
            background: "#ca9a3f",
            color: "#0f172a",
            fontWeight: 700,
            border: "1px solid #b88934",
            cursor: "pointer",
          }}
        >
          Send Username
        </button>

        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between" }}>
          <Link href="/forgot-password" style={{ textDecoration: "underline" }}>
            Forgot Password?
          </Link>
          <Link href="/login" style={{ textDecoration: "underline" }}>
            Back to Log In
          </Link>
        </div>
      </form>
    </main>
  );
}

