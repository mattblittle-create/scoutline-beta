// app/demo/metrics-from-profile/page.tsx
"use client";

import { useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import PublicPlayerMetrics from "@/app/components/metrics/PublicPlayerMetrics";

type ApiUser = {
  dob?: string | null;
  primaryPos?: string | null;
  secondaryPos?: string | null;
  isPitcher?: "Yes" | "No" | "" | null;
  metrics?: any;
};

const DEMO_EMAIL = "matt.b.little@gmail.com";

export default function MetricsFromProfileDemo() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const sp = useSearchParams();
  const slug = sp.get("slug") ?? "";

  useEffect(() => {
    let dead = false;
    async function load() {
      try {
        const q = encodeURIComponent(DEMO_EMAIL);
        const res = await fetch(`/api/player/profile?email=${q}`, { cache: "no-store" });
        const json = await res.json();
        if (dead) return;
        if (!res.ok || !json?.ok) {
          setErr(json?.error || "Failed to load profile");
        } else {
          setUser(json.user || {});
        }
      } catch (e: any) {
        if (!dead) setErr(e?.message || "Network error");
      } finally {
        if (!dead) setLoading(false);
      }
    }
    load();
    return () => { dead = true; };
  }, []);

  return (
    <main style={{ maxWidth: 1040, margin: "0 auto", padding: "24px 16px" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 900, margin: 0 }}>
        Metrics from Saved Profile (Demo)
      </h1>
      <p style={{ color: "#64748b", margin: 0 }}>
        Charts your saved Metrics from your Player Profile and displays change over time with baseline for age.
      </p>

      <div style={{ marginTop: 16 }}>
        {loading && <p style={{ color: "#64748b" }}>Loading…</p>}
        {err && <p style={{ color: "#b91c1c" }}>{err}</p>}
        {!loading && !err && (
          user ? <PublicPlayerMetrics user={user as any} /> : <p>No user found.</p>
        )}
      </div>
    </main>
  );
}
