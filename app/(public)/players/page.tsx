// app/(public)/players/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import PlayerThumbCard from "@/app/components/profile/PlayerThumbCard";
import { useRouter } from "next/navigation";

type CardItem = {
  id: string;
  slug: string | null;
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  primaryPos?: string;
  secondaryPos?: string[];
  committed?: { isCommitted: boolean; college?: string } | null;
};

export default function PlayersGridPage() {
  const [items, setItems] = useState<CardItem[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/public/players?limit=24`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json?.error || "Failed to load players");
        setItems(json.items || []);
      } catch (e: any) {
        setErr(e?.message || "Failed to load players");
      }
    })();
  }, []);

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 16px" }}>
      <h1 style={{ margin: 0, fontWeight: 900, fontSize: 24 }}>Players</h1>
      {err && <p style={{ color: "#b91c1c" }}>{err}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16, marginTop: 16 }}>
        {items.map((p) => (
          <PlayerThumbCard
            key={p.id}
            firstName={p.firstName}
            lastName={p.lastName}
            photoUrl={p.photoUrl || null}
            primaryPos={p.primaryPos}
            secondaryPos={p.secondaryPos}
            committed={p.committed || undefined}
            onClick={p.slug ? () => router.push(`/player/${encodeURIComponent(p.slug!)}`) : undefined}
          />
        ))}
      </div>
    </main>
  );
}
