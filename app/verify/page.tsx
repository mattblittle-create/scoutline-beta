"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function VerifyPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = params.get("token");
    if (!token) {
      setError("Missing verification token.");
      return;
    }
    // Optionally ping a token-check endpoint first; we’ll keep it simple:
    router.replace(`/set-password?token=${encodeURIComponent(token)}`);
  }, [params, router]);

  return (
    <main style={{ maxWidth: 560, margin: "60px auto", padding: "0 16px" }}>
      <h1 style={{ fontWeight: 800, marginBottom: 8 }}>Verifying…</h1>
      {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : <p>Please wait.</p>}
    </main>
  );
}
