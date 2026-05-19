// lib/billing/valorRecurringCharge.ts

type ValorRecurringChargeInput = {
  token: string;
  invoiceNumber: string;
  amountCents: number;
  cardFeeCents?: number;
  description: string;
  customerName?: string | null;
  email?: string | null;
};

function getSaleTokenUrl() {
  return (
    process.env.VALOR_DIRECT_TOKEN_URL ||
    "https://securelink-staging.valorpaytech.com:4430/?saleToken"
  );
}

function dollars(cents: number) {
  return (Math.max(0, Math.round(cents)) / 100).toFixed(2);
}

export async function chargeValorStoredToken(input: ValorRecurringChargeInput) {
  if (process.env.VALOR_RECURRING_CHARGES_ENABLED !== "true") {
    return {
      ok: false,
      skipped: true,
      reason: "Recurring Valor charges are disabled.",
      invoiceNumber: input.invoiceNumber,
    };
  }

  const appid = process.env.VALOR_APP_ID || "";
  const appkey = process.env.VALOR_APP_KEY || "";
  const epi = process.env.VALOR_EPI || "";

  if (!appid || !appkey || !epi) {
    return {
      ok: false,
      skipped: false,
      reason: "Missing Valor API credentials.",
      invoiceNumber: input.invoiceNumber,
    };
  }

  const cardFeeCents =
    typeof input.cardFeeCents === "number"
      ? Math.max(0, Math.round(input.cardFeeCents))
      : Math.round(input.amountCents * 0.03);

  const body = {
    appid,
    appkey,
    epi,
    txn_type: "sale",
    amount: dollars(input.amountCents),
    tax_amount: "0.00",
    token: input.token,
    invoicenumber: input.invoiceNumber,
    orderdescription: input.description.slice(0, 50),
    surchargeAmount: dollars(cardFeeCents),
    surchargeIndicator: cardFeeCents > 0 ? "1" : "0",
    shipping_country: "US",
    email: input.email || "",
    customer_name: input.customerName || "ScoutLine Customer",
    duplicate_transaction_check: 0,
  };

  const res = await fetch(getSaleTokenUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const json: any = await res.json().catch(() => null);

  const approved =
    res.ok &&
    (json?.error_no === "S00" ||
      json?.error_code === "00" ||
      String(json?.msg || "").toUpperCase() === "APPROVED");

  if (!approved) {
    return {
      ok: false,
      skipped: false,
      reason:
        json?.desc ||
        json?.msg ||
        json?.mesg ||
        `Valor token charge failed with HTTP ${res.status}.`,
      invoiceNumber: input.invoiceNumber,
      responseCode: json?.error_code || json?.error_no || null,
      raw: json,
    };
  }

  return {
    ok: true,
    skipped: false,
    invoiceNumber: input.invoiceNumber,
    amountPaidCents: input.amountCents + cardFeeCents,
    cardFeeCents,
    transactionId: String(json?.txnid || ""),
    responseCode: String(json?.error_code || json?.error_no || "00"),
    approvalCode: String(json?.approval_code || ""),
    rrn: String(json?.rrn || ""),
    receiptUrl: null,
    raw: json,
  };
}