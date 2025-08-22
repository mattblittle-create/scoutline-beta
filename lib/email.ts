// lib/email.ts
import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const EMAIL_FROM = process.env.EMAIL_FROM || "support@myscoutline.com";

// Keep one Resend client for the whole runtime
const resend = new Resend(RESEND_API_KEY);

/**
 * Minimal HTML wrapper for consistent brand styling.
 */
export function wrapHtml(inner: string) {
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.55;color:#0f172a">
    <div style="max-width:560px;margin:24px auto;padding:20px;border:1px solid #e5e7eb;border-radius:12px">
      <h1 style="margin:0 0 12px;font-size:18px">ScoutLine</h1>
      ${inner}
      <p style="margin-top:24px;color:#64748b;font-size:12px">If you didn’t request this, you can ignore this email.</p>
    </div>
  </div>`;
}

/**
 * Send an email via Resend.
 * Returns { id } on success. Throws on error.
 */
export async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    // Fail fast so we notice missing config
    throw new Error("Missing RESEND_API_KEY");
  }
  const { data, error } = await resend.emails.send({
    from: EMAIL_FROM,
    to,
    subject,
    html,
  });

  if (error) {
    // Surface the provider error (handy in Vercel logs)
    throw new Error(`Resend error: ${error.message}`);
  }
  return data; // { id: string }
}
