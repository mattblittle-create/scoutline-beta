"use client";

export default function CoachError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontWeight: 900, fontSize: "1.5rem" }}>Something went wrong</h1>
      <p style={{ color: "#475569" }}>
        We couldn’t load this profile. Try refreshing the page.
      </p>
      <pre style={{ marginTop: 12, background: "#f8fafc", padding: 12, borderRadius: 8, overflow: "auto" }}>
        {error?.message}
      </pre>
      <button
        onClick={() => reset()}
        style={{ marginTop: 12, padding: "8px 12px", borderRadius: 8, border: "1px solid #e5e7eb" }}
      >
        Try again
      </button>
    </main>
  );
}
