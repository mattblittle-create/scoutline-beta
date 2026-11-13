import { start } from "workflow/api";
import { notificationEmailWorkflow } from "@/workflows/notification-email";
export async function dispatchNotificationEmails(ids: string[]) {
  if (!ids.length) return;
  try { await Promise.all(ids.map(id => start(notificationEmailWorkflow, [[id]]))); }
  catch { console.error("NOTIFICATION_EMAIL_DISPATCH_FAILED: pending deliveries retained for recovery"); }
}
