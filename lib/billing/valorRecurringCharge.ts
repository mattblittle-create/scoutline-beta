// lib/billing/valorRecurringCharge.ts

type ValorRecurringChargeInput = {
  token: string;
  invoiceNumber: string;
  amountCents: number;
  description: string;
  customerName?: string | null;
  email?: string | null;
};

export async function chargeValorStoredToken(input: ValorRecurringChargeInput) {
  if (process.env.VALOR_RECURRING_CHARGES_ENABLED !== "true") {
    return {
      ok: false,
      skipped: true,
      reason: "Recurring Valor charges are disabled.",
      invoiceNumber: input.invoiceNumber,
    };
  }

  // Do not enable until Valor confirms exact Direct Sale - Token payload.
  throw new Error(
    "Valor recurring token charge payload is not finalized yet."
  );
}