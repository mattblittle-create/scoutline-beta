import { RetryableError } from "workflow";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

export function emailAllowed(preferences: { emailNotificationsEnabled?: boolean; instantProgramSaves?: boolean } | null | undefined, type: string) {
  return preferences?.emailNotificationsEnabled !== false && (type !== "COACH_PROGRAM_SAVED" || preferences?.instantProgramSaves !== false);
}
function escapeHtml(value: unknown) { return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)); }
export function notificationEmailContent(message: string, actionPath: string, coach: boolean) {
  const base = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://www.myscoutline.com").replace(/\/+$/, "");
  const safePath = actionPath.startsWith("/") && !actionPath.startsWith("//") ? actionPath : "/account";
  const login = base + "/login?next=" + encodeURIComponent(safePath);
  const settings = base + "/login?next=" + encodeURIComponent("/account#notification-preferences");
  return { login, html: '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px;color:#0f172a"><h1>ScoutLine</h1><p>' + escapeHtml(message) + '</p><p><a href="' + escapeHtml(login) + '" style="display:inline-block;background:#caa042;color:#0f172a;padding:12px 18px;border-radius:8px;font-weight:bold;text-decoration:none">' + (coach ? "View player profile" : "Log in to your account") + '</a></p><p style="font-size:12px">Email alerts are enabled for your account. <a href="' + escapeHtml(settings) + '">Change email preferences or opt out</a>. Your account bell alerts stay on.</p></div>' };
}
export async function deliverNotificationEmail(id: string) {
  const row = await prisma.notificationEmailDelivery.findUnique({ where: { id }, include: { notification: { include: { user: { include: { notificationPreference: true } } } } } });
  if (!row || ["SENT", "SKIPPED"].includes(row.status) || row.attempts >= 10) return;
  const n = row.notification, user = n.user, data = (n.data || {}) as Record<string, any>;
  let allowed = emailAllowed(user.notificationPreference, n.type);
  // Stop queued parent emails after a family link is removed.
  if (data.parentPlayerProfileId) allowed = allowed && !!await prisma.parentPlayerLink.findFirst({ where: { playerProfileId: data.parentPlayerProfileId, parentProfile: { userId: user.id } }, select: { id: true } });
  // Stop queued coach emails after a coach moves to another program.
  if (n.type === "COACH_PROGRAM_SAVED") allowed = allowed && user.collegeId === data.collegeId;
  if (!allowed || !user.email) {
    await prisma.notificationEmailDelivery.update({ where: { id }, data: { status: "SKIPPED" } }); return;
  }
  if (row.status === "PENDING" && row.nextAttemptAt > new Date()) throw new RetryableError("Email retry scheduled", { retryAfter: row.nextAttemptAt });
  const claim = await prisma.notificationEmailDelivery.updateMany({ where: { id, OR: [{ status: "PENDING", nextAttemptAt: { lte: new Date() } }, { status: "SENDING", updatedAt: { lt: new Date(Date.now() - 5 * 60 * 1000) } }] }, data: { status: "SENDING", attempts: { increment: 1 } } });
  if (!claim.count) return;
  try {
    if (!process.env.RESEND_API_KEY) throw new Error("Email service not configured");
    const content = notificationEmailContent(n.message, typeof data.actionPath === "string" ? data.actionPath : "/account", n.type === "COACH_PROGRAM_SAVED");
    const result = await new Resend(process.env.RESEND_API_KEY).emails.send({ from: process.env.EMAIL_FROM || "ScoutLine <onboarding@myscoutline.com>", to: user.email, subject: n.type === "COACH_PROGRAM_SAVED" ? "ScoutLine: A matching player saved your program" : "ScoutLine recruiting update", html: content.html, text: n.message + "\n\nLog in: " + content.login + "\nManage email preferences in your account." }, { idempotencyKey: "scoutline-notification-" + row.id });
    if (result.error) throw new Error("Email provider rejected delivery");
    await prisma.notificationEmailDelivery.update({ where: { id }, data: { status: "SENT", sentAt: new Date(), lastError: null } });
  } catch (error) {
    const retryAfter = new Date(Date.now() + Math.min(60, 2 ** row.attempts) * 60 * 1000);
    await prisma.notificationEmailDelivery.update({ where: { id }, data: { status: row.attempts + 1 >= 10 ? "FAILED" : "PENDING", nextAttemptAt: retryAfter, lastError: "Email delivery failed" } });
    throw new RetryableError("Email delivery failed", { retryAfter });
  }
}
