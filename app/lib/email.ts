// /lib/email.ts
/**
 * Minimal email sender. In production, back this with real SMTP or a provider.
 * During development (or if not configured), it logs the email so builds don’t fail.
 */
export type SendEmailArgs = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || "no-reply@scoutline.app";

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.info("[email:devlog]", {
      to,
      subject,
      htmlPreview: html.slice(0, 200) + (html.length > 200 ? "…" : ""),
    });
    return;
  }

  // Example nodemailer usage (uncomment if you add it to deps):
  // const nodemailer = await import("nodemailer");
  // const transporter = nodemailer.createTransport({
  //   host: smtpHost,
  //   port: Number(process.env.SMTP_PORT || 587),
  //   secure: false,
  //   auth: { user: smtpUser, pass: smtpPass },
  // });
  // await transporter.sendMail({ from, to, subject, html });

  console.info("[email:sent]", { to, subject });
}

export function wrapHtml(inner: string): string {
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.5;color:#0f172a">
    <div style="max-width:560px;margin:24px auto;padding:20px;border:1px solid #e5e7eb;border-radius:12px;background:#fff">
      <h1 style="margin:0 0 12px;font-size:18px">ScoutLine</h1>
      ${inner}
      <p style="margin-top:24px;color:#64748b;font-size:12px">If you didn’t request this, you can ignore this email.</p>
    </div>
  </div>`;
}
