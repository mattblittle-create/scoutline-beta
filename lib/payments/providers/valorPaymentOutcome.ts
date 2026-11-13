// A request being processed (S00) is not proof that a sale was approved.
const text = (v: unknown) => String(v ?? "").trim().toUpperCase();
const positive = new Set(["APPROVED", "SUCCESS", "SUCCEEDED", "PAID", "AUTHCAPTURE", "CAPTURED", "SETTLED", "COMPLETED"]);
const flag = (v: unknown) => ["1", "TRUE", "YES", "Y"].includes(text(v));
export function getValorPaymentOutcome(payload: unknown): { status: string; approved: boolean; definitiveFailure: boolean } {
  const root = payload as any;
  const data = root?.data ?? root?.payload ?? root ?? {};
  const statuses = [data.status, data.STATUS, data.transaction_status, data.txn_status, data.result,
    data.response, root?.status].filter(v => v != null && v !== "" && typeof v !== "object").map(text);
  const event = text(root?.event ?? root?.eventType ?? root?.type);
  const type = text(data.txn_type ?? data.transaction_type ?? data.TRAN_METHOD);
  const signals = [event, type, ...statuses, text(data.display_message), text(data.msg), text(data.desc)].join(" ");
  const outcome = (status: string, definitiveFailure = false) => ({ status, approved: status === "APPROVED", definitiveFailure });
  if (flag(data.is_reversed) || /REVERS(AL|E|ED)/.test(signals)) return outcome("REVERSED", true);
  if (flag(data.is_voided) || /\bVOID(ED)?\b/.test(signals)) return outcome("VOIDED", true);
  if (/DECLIN|DENIED|AUTHDECLINED/.test(signals)) return outcome("DECLINED", true);
  if (/FAIL|CANCEL|ERROR|REJECT/.test(signals)) return outcome("FAILED", true);
  if (/REFUND|\bRETURN\b/.test(signals)) return outcome("REFUNDED");
  if ([data.is_reversed, data.is_voided].some(v => v != null && !["0", "FALSE", "NO", "N"].includes(text(v)))) return outcome("UNKNOWN");
  const codes = [data.response_code, data.error_code, data.processor_response_code,
    data.reference_descriptive_data?.processor_response_code].filter(v => v != null && v !== "").map(text).filter(code => code !== "S00");
  if (codes.some(code => code !== "00")) return outcome("DECLINED", true);
  const transport = text(data.error_no ?? root?.error_no);
  if (transport && transport !== "S00") return outcome("FAILED", true);
  if (type && !["SALE", "CREDIT SALE", "DEBIT SALE", "CAPTURE", "AUTHCAPTURE", "COMPLETION"].includes(type)) return outcome("UNKNOWN");
  if (data.txn_type_code != null && ![101].includes(Number(data.txn_type_code))) return outcome("UNKNOWN");
  if (statuses.some(s => !positive.has(s))) return outcome(statuses.includes("PENDING") ? "PENDING" : "UNKNOWN");
  if (codes.includes("00") || statuses.some(s => ["APPROVED", "AUTHCAPTURE", "CAPTURED", "SETTLED"].includes(s))) return outcome("APPROVED");
  return outcome("UNKNOWN");
}

export function valorFailureMessage(status: string) {
  if (status === "REVERSED") return "Your card payment was reversed. Check your billing address and ZIP code, then retry manually.";
  if (status === "VOIDED") return "Your card payment was voided. No subscription was activated. You can retry manually.";
  return "Your card payment was not approved. Check your payment details, then retry manually. No subscription was activated.";
}
