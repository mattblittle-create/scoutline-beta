"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { TAB_KEYS, TAB_LABELS } from "./tabKeys";

const TABS = [
  TAB_KEYS.OVERVIEW,
  TAB_KEYS.METRICS,
  TAB_KEYS.STATS,
  TAB_KEYS.VIDEO_SOCIAL,
] as const;

export default function PlayerProfileTabs() {
  const router = useRouter();
  const sp = useSearchParams();
  const active = sp.get("tab") ?? TAB_KEYS.OVERVIEW;

  return (
    <div style={{ display: "flex", gap: 8 }}>
      {TABS.map((key) => (
        <button
          key={key}
          onClick={() => router.push(`?tab=${key}`)}
          data-active={active === key}
          style={{ padding: "8px 12px", borderRadius: 10 }}
        >
          {TAB_LABELS[key]}
        </button>
      ))}
    </div>
  );
}
