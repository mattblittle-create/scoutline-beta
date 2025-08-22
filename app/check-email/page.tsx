import Link from "next/link";
import Resend from "./Client";

type Props = {
  searchParams?: { email?: string; plan?: string };
};

export default function CheckEmailPage({ searchParams }: Props) {
  const email = (searchParams?.email || "").trim();
  const plan = (searchParams?.plan || "").trim();

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px", color: "#0f172a" }}>
      <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 800 }}>Check your email</h1>
      <p style={{ marginTop: 8, color: "#475569" }}>
        We sent a verification link to {email ? <strong>{email}</strong> : "your email"}.
        Click the link to verify, then you’ll be taken to set your password.
      </p>

      <div style={{ marginTop: 18, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <Resend email={email} />
        <Link href="/pricing" className="sl-link-btn">Back to Pricing</Link>
        {plan === "coach" ? (
          <Link href="/onboarding/coach" className="sl-link-btn">Edit Coach Info</Link>
        ) : null}
      </div>

      <p style={{ marginTop: 18, color: "#64748b", fontSize: ".95rem" }}>
        Didn’t get the email? Check your spam folder or resend it.
      </p>

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
      `}</style>
    </main>
  );
}
