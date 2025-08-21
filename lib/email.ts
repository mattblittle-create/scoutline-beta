// lib/email.ts

type SendArgs = { to: string; subject: string; html: string };

/**
 * Minimal email helper.
 * If SMTP env vars are not set, it logs to console so builds won’t fail.
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.EMAIL_FROM || "no-reply@scoutline.app";

  if (!host || !user || !pass) {
    console.info("[email:devlog]", { to, subject, preview: html.slice(0, 200) + (html.length > 200 ? "…" : "") });
    return;
  }

  // If you later add nodemailer:
  // const nodemailer = await import("nodemailer");
  // const transporter = nodemailer.createTransport({
  //   host,
  //   port: Number(process.env.SMTP_PORT || 587),
  //   secure: false,
  //   auth: { user, pass },
  // });
  // await transporter.sendMail({ from, to, subject, html });

  console.info("[email:sent]", { to, subject });
}

/** Simple branded wrapper (optional helper) */
export function wrapHtml(inner: string): string {
  return `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.5;color:#0f172a">
      <div style="max-width:560px;margin:24px auto;padding:20px;border:1px solid #e5e7eb;border-radius:12px">
        <h1 style="margin:0 0 12px;font-size:18px">ScoutLine</h1>
        ${inner}
        <p style="margin-top:24px;color:#64748b;font-size:12px">If you didn’t request this, you can ignore this email.</p>
      </div>
    </div>`;
}
