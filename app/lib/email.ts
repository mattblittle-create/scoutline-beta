// lib/email.ts
// Minimal mail helpers. In dev (or when SMTP not configured) we just log.
// In prod, wire up Nodemailer (optional) if you add it as a dependency.

type MailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

async function sendWithConsole({ to, subject, html }: MailInput) {
  console.log("—— EMAIL (console fallback) ——");
  console.log("To:", to);
  console.log("Subject:", subject);
  console.log("HTML:\n", html);
  console.log("——————————————");
}

export async function sendVerificationEmail(to: string, link: string) {
  const subject = "Verify your email";
  const html = `
    <div style="font-family:system-ui,Segoe UI,Arial,sans-serif">
      <h2>Confirm your email</h2>
      <p>Click the button below to verify your email address.</p>
      <p><a href="${link}" style="display:inline-block;padding:10px 14px;border-radius:8px;background:#caa042;color:#0f172a;text-decoration:none;font-weight:700">Verify Email</a></p>
      <p>If the button doesn't work, copy and paste this URL into your browser:</p>
      <p><code>${link}</code></p>
    </div>
  `;
  await sendWithConsole({ to, subject, html });
}

export async function sendSetPasswordEmail(to: string, link: string) {
  const subject = "Set your password";
  const html = `
    <div style="font-family:system-ui,Segoe UI,Arial,sans-serif">
      <h2>Set your password</h2>
      <p>Click the button below to create your password and finish setup.</p>
      <p><a href="${link}" style="display:inline-block;padding:10px 14px;border-radius:8px;background:#caa042;color:#0f172a;text-decoration:none;font-weight:700">Set Password</a></p>
      <p>If the button doesn't work, copy and paste this URL into your browser:</p>
      <p><code>${link}</code></p>
    </div>
  `;
  await sendWithConsole({ to, subject, html });
}
