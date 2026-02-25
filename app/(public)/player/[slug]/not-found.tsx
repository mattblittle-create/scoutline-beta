import Link from "next/link";

export default function NotFound() {
  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "24px 16px" }}>
      <h1 style={{ marginTop: 0 }}>Player not found.</h1>
      <p style={{ color: "#64748b" }}>
        The profile may be private, or the slug is incorrect.
      </p>
      <Link href="/dashboard/player/profile" style={{ color: "#0ea5e9", textDecoration: "underline" }}>
        Back to your dashboard
      </Link>
    </main>
  );
}
