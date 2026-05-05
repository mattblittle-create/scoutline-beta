// app/lib/utils/format.ts

export function formatPercent(value?: number | null): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return `${Math.round(value * 100)}%`;
}