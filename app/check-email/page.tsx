import Link from "next/link";

export default function CheckEmailPage({
  searchParams,
}: {
  searchParams: { email?: string; plan?: string };
}) {
  const email = searchParams?.email ?? "";
  const plan = (searchParams?.plan ?? "").toLowerCase();

  const title =
    plan === "coach"
      ? "Check your work email"
      : "Check your email";

  const subtitle =
    plan === "coach"
      ? "We’ve sent a verification link to finish setting up your Coach account."
      : "We’ve sent a verification link to your email.";

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px", color: "#0f172a" }}>
      <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800 }}>{title}</h1>
      <p style={{ marginTop: 6, color: "#475569" }}>{subtitle}</p>

      {email ? (
        <p style={{ marginTop: 10 }}>
          Sent to: <strong>{email}</strong>
        </p>
      ) : null}

      <div style={{ marginTop: 16 }}>
        <Resend email={email} />
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
        <Link href="/pricing" className="sl-link-btn">Back to Pricing</Link>
        {plan === "coach" && (
          <Link href="/onboarding/coach" className="sl-link-btn">Edit Info</Link>
        )}
      </div>

      <style>{`
        .sl-link-btn {
          display:inline-block;
          padding:10px 14px;
          border-radius:10px;
          background:#fff;
          color:#0f172a;
          text-decoration:none;
          border:1px solid #e5e7eb;
          font-weight:800;
          transition:transform .2s ease, box-shadow .2s ease, background-color .2s ease, text-decoration-color .2s ease, border-color .2s ease;
        }
        .sl-link-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.18);
          background: #f3f4f6;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .primary-btn {
          padding:10px 16px;
          border-radius:10px;
          border:1px solid #caa042;
          background:#caa042;
          color:#0f172a;
          font-weight:800;
          cursor:pointer;
          transition:transform .15s ease, box-shadow .15s ease, background-color .15s ease;
        }
        .primary-btn:hover { transform: translateY(-2px); box-shadow:0 6px 16px rgba(0,0,0,0.18); }
        .msg { margin-top:10px; font-weight:700; }
        .msg.ok { color:#065f46; }
        .msg.err { color:#7f1d1d; }
      `}</style>
    </main>
  );
}

/**
 * Client-only resend button
 */
"use client";
import { useState } from "react";

function Resend({ email }: { email: string }) {
  const [status, setStatus] = useState<"idle"|"ok"|"err"|"loading">("idle");

  const onResend = async () => {
    if (!email) return;
    setStatus("loading");
    try {
      const res = await fetch("/api/auth/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStatus(res.ok ? "ok" : "err");
    } catch {
      setStatus("err");
    }
  };

  return (
    <div>
      <button className="primary-btn" onClick={onResend} disabled={!email || status==="loading"}>
        {status === "loading" ? "Resending…" : "Resend verification email"}
      </button>
      {status === "ok" && <div className="msg ok">Verification email sent.</div>}
      {status === "err" && <div className="msg err">Couldn’t send email. Try again.</div>}
      {!email && <div className="msg err">No email provided.</div>}
    </div>
  );
}
