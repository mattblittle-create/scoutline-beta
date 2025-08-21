export async function sendEmail(to: string, subject: string, html: string) {
  // TODO: integrate your ESP (Resend, SES, SendGrid, etc.)
  console.log("DEV EMAIL ->", { to, subject, html });
}
/**
 * Minimal email sender abstraction.
 * Replace with your provider (Resend, SES, Sendgrid, etc).
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}) {
  const from = opts.from ?? (process.env.MAIL_FROM || "no-reply@scoutline.app");
  // Stub: log in dev, hand off to your real provider in prod
  if (process.env.NODE_ENV !== "production") {
    console.log("[DEV EMAIL]", { from, ...opts });
    return { id: "dev-mail" };
  }

  // Example placeholder — replace with your provider call
  // await realProvider.send({ from, to: opts.to, subject: opts.subject, html: opts.html, text: opts.text });

  // For now, still succeed
  return { id: "noop-mail" };
}
