// app/admin/search/AdminRegenerateUserSlugButton.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

export default function AdminRegenerateUserSlugButton({
  userId,
  currentSlug,
}: {
  userId: string;
  currentSlug?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  async function run() {
    setErr(null);

    const ok = window.confirm(
      `Regenerate slug for this user?\n\nCurrent: ${currentSlug || "—"}\n\nThis updates User.slug and is logged in Audit Log.`
    );
    if (!ok) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/regenerate-slug`, {
        method: "POST",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) throw new Error(json?.error || `Failed (${res.status})`);

      router.refresh(); // ✅ re-run server component and show updated slug
    } catch (e: any) {
      setErr(e?.message || "Failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <button type="button" onClick={run} disabled={busy} style={btnMini}>
        {busy ? "Working…" : "Regen slug"}
      </button>
      {err ? <div style={{ fontSize: 11, color: "#7f1d1d", fontWeight: 900 }}>{err}</div> : null}
    </div>
  );
}

const btnMini: React.CSSProperties = {
  padding: "7px 10px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#0f172a",
  fontWeight: 900,
  cursor: "pointer",
  fontSize: 11,
  whiteSpace: "nowrap",
};
