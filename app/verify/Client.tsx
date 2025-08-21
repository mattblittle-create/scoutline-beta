"use client";

import React, { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function VerifyClient() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";

  useEffect(() => {
    if (!token) return;
    router.replace(`/set-password?token=${encodeURIComponent(token)}`);
  }, [router, token]);

  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "24px 16px" }}>
      <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800 }}>Verifying…</h1>
      {!token && (
        <p style={{ marginTop: 8, color: "#7f1d1d" }}>
          Missing verification token. Please use the link from your email.
        </p>
      )}
      {!!token && (
        <p style={{ marginTop: 8, color: "#475569" }}>
          One moment—taking you to set your password.
        </p>
      )}
    </main>
  );
}
