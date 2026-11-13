export function adminDate(date?: Date | null) {
  return date ? date.toLocaleDateString("en-US", { timeZone: "America/New_York" }) : "—";
}
export function adminDateTime(date?: Date | null) {
  return date ? date.toLocaleString("en-US", { timeZone: "America/New_York", timeZoneName: "short" }) : "—";
}
export function safeHostedUrl(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    if ([...url.searchParams.keys()].some(key => /appkey|appid|secret|password|authorization|api.?key|token/i.test(key))) return null;
    return url.href;
  } catch { return null; }
}
export function nextPlayerInvoice<T extends {status: string; dueDate: Date; invoiceDate: Date}>(invoices: T[]) {
  return invoices.filter(i => i.status === "UPCOMING" || i.status === "OPEN")
    .sort((a,b) => (a.status === "UPCOMING" ? 0 : 1) - (b.status === "UPCOMING" ? 0 : 1) || a.dueDate.getTime() - b.dueDate.getTime())[0] ?? null;
}
