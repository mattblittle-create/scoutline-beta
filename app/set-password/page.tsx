"use client";

import { FormEvent, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function SetPasswordPage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);

    if (!token) return setErr("Missing or invalid token.");
    if (pw1.length < 8) return setErr("Password must be at least 8 characters.");
    if (pw1 !== pw2) return setErr("Passwords do not match.");

    setLoading(true);
    const res = await fetch("/api/auth/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password: pw1 }),
    });
    setLoading(false);

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || "Failed to set password.");
      return;
    }
    setOk(true);
    setTimeout(() => router.replace("/login"), 1000);
  };

  return (
    <main style={{ maxWidth: 560, margin: "60px auto", padding: "0 16px" }}>
      <h1 style={{ fontWeight: 800, marginBottom: 8 }}>Set Your Password</h1>
      <p style={{ color: "#475569", marginBottom: 18 }}>
        Create a password for your ScoutLine account.
      </p>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <div>
          <label style={{ fontWeight: 700, display: "block", marginBottom: 6 }}>New Password</label>
          <input
            type={show ? "text" : "password"}
            value={pw1}
            onChange={(e) => setPw1(e.target.value)}
            placeholder="At least 8 characters"
            required
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ fontWeight: 700, display: "block", marginBottom: 6 }}>Confirm Password</label>
          <input
            type={show ? "text" : "password"}
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            required
            style={inputStyle}
          />
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, userSelect: "none" }}>
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
          Show password
        </label>

        {err && <p style={{ color: "#b91c1c", marginTop: 4 }}>{err}</p>}
        {ok && <p style={{ color: "#16a34a", marginTop: 4 }}>Password set! Redirecting…</p>}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #caa042",
            background: "#caa042",
            color: "#0f172a",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          {loading ? "Saving…" : "Save Password"}
        </button>
      </form>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  outline: "none",
};
