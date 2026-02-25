// app/dashboard/player/profile/tabKeys.ts
export const TAB_KEYS = {
  OVERVIEW: "overview",
  METRICS: "metrics",
  STATS: "stats",
  VIDEO_SOCIAL: "video-social",
  // add others here as you wire them
} as const;

export type TabKey = typeof TAB_KEYS[keyof typeof TAB_KEYS];

// (Optional) If you render labels from keys in your nav:
export const TAB_LABELS: Record<TabKey, string> = {
  overview: "Overview",
  metrics: "Metrics",
  stats: "Stats",
  "video-social": "Video / Social Media",
};
