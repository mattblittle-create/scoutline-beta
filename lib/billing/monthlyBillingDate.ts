const billingTimeZone = "America/New_York";
const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: billingTimeZone, year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});
function wallClock(date: Date) {
  const parts = Object.fromEntries(formatter.formatToParts(date).map(p => [p.type, p.value]));
  return Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second, date.getUTCMilliseconds());
}
/** Monthly billing uses Eastern calendar days. Days 29–31 anchor to the 28th permanently. */
export function nextMonthlyBillingDate(anchor: Date): Date {
  if (!Number.isFinite(anchor.getTime())) throw new Error("Invalid billing date.");
  const local = new Date(wallClock(anchor));
  local.setUTCDate(Math.min(local.getUTCDate(), 28));
  local.setUTCMonth(local.getUTCMonth() + 1);
  const desired = local.getTime();
  let instant = desired;
  const seen = new Set<number>();
  for (let attempt = 0; attempt < 4; attempt++) {
    const adjustment = desired - wallClock(new Date(instant));
    if (!adjustment) return new Date(instant);
    const next = instant + adjustment;
    // A nonexistent spring-forward time moves forward to the next valid hour.
    if (seen.has(next)) return new Date(Math.max(instant, next));
    seen.add(instant);
    instant = next;
  }
  return new Date(instant);
}
