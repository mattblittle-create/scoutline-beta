// lib/billing/paymentsDisabled.ts

export function paymentsDisabled() {
  return process.env.NEXT_PUBLIC_SC_PAYMENTS_DISABLED === "true";
}