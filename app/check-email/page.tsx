import Link from "next/link";
import ResendClient from "./Client";

export default function CheckEmailPage({
  searchParams,
}: {
  searchParams: { email?: string; plan?: string };
}) {
  const email = searchParams?.email ?? "";
  const plan = (searchParams?.plan ?? "").toLowerCase();

  const title =
    plan === "coach" ? "Check your work email" : "Check your email";

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
        <ResendClient email={email} />
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
      `}</style>
    </main>
  );
}
