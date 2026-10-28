type TokenSdk<T> = { getPaymentToken: () => Promise<T> };

function record(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
}

// SDK failures are JSON objects, not Error instances. Never log the raw
// object: it may include payment data. Only allow bounded provider diagnostics.
export function describeClearentAchTokenError(error: unknown): string {
  let value = error;
  if (typeof value === "string") {
    try { value = JSON.parse(value); } catch { value = { message: value }; }
  }
  const root = record(value);
  const detail = record(record(root.payload).error);
  const message = [detail["error-message"], root.message, typeof root.error === "string" ? root.error : null]
    .find(v => typeof v === "string" && v.trim());
  const safeMessage = typeof message === "string" ? message
    .replace(/eyJ[A-Za-z0-9_.-]+/g, "[redacted]")
    .replace(/\b[A-Za-z0-9_+/=-]{40,}\b/g, "[redacted]")
    .replace(/\d{5,}/g, "[redacted]")
    .replace(/[\r\n\t]+/g, " ").slice(0, 240) : "";
  const code = [root.code, detail["result-code"]]
    .filter(v => typeof v === "string" && /^[A-Za-z0-9-]{1,8}$/.test(v)).join("/");
  const exchange = typeof root["exchange-id"] === "string" &&
    /^(client-side-validation|ID-clearent-[A-Za-z0-9-]{1,120})$/.test(root["exchange-id"])
    ? root["exchange-id"] : "";
  return ["Xplor could not validate the bank account. No debit request was sent by ScoutLine.",
    safeMessage, code ? `Code: ${code}.` : "", exchange ? `Support reference: ${exchange}.` : ""]
    .filter(Boolean).join(" ");
}

export async function getClearentAchPaymentToken<T>(sdk: TokenSdk<T>): Promise<T> {
  try { return await sdk.getPaymentToken(); }
  catch (error) { throw new Error(describeClearentAchTokenError(error)); }
}
