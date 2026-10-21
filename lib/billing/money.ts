// lib/billing/money.ts

export function normalizeCents(value: number) {
  if (!Number.isFinite(value)) {
    throw new Error("Money value must be a finite number.");
  }

  return Math.round(value);
}

export function centsToDecimalString(cents: number) {
  return (normalizeCents(cents) / 100).toFixed(2);
}

export function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(normalizeCents(cents) / 100);
}