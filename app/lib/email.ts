// lib/email.ts
// Uses Resend if RESEND_API_KEY is set; otherwise logs to console in dev.

type SendArgs = {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  // optional: for providers that need from/reply-to overrides
  from?: string;
};

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const DEFAULT_FROM = process.env.EMAIL_FROM || "ScoutLine <no-reply@scoutline.app>";

/**
 * Sends an email. In production with RESEND_API_KEY set, it uses Resend.
 * Otherwise, it falls back to console logging (useful for local dev).
 */
export async function sendEmail({ to, subject, html, text, from }: SendArgs) {
  if (RESEND_API_KEY) {
    const { Resend } = await import("resend");
    const resend = new Resend(RESEND_API_KEY);

    const result = await resend.emails.send({
      from: from || DEFAULT_FROM,
      to,
      subject,
      html: html || (text ? `<pre>${escapeHtml(text)}</pre>` : "<div></div>"),
      text,
    });

    if (result.error) {
      // Bubble up for API route to handle
      throw new Error(
        typeof result.error === "string" ? result.error : JSON.stringify(result.error)
      );
    }
    return result;
  }

  // Fallback: dev log
  // eslint-disable-next-line no-console
  console.log("==== DEV EMAIL (no RESEND_API_KEY set) ====");
  // eslint-disable-next-line no-console
  console.log({ from: from || DEFAULT_FROM, to, subject, html, text });
  // Return a mock object to keep callers happy
  return { id: "dev-email", to, subject };
}

function escapeHtml(str: string) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/**
 * Convenience helper to generate a simple branded HTML wrapper.
 * Optional to use—your API routes can pass raw HTML too.
 */
export function wrapHtml(body: string) {
  return `
<!doctype html>
<html>
  <head>
    <meta charSet="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>ScoutLine</title>
  </head>
  <body style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'; background:#f8fafc; padding:24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;">
      <tr>
        <td style="padding:20px 24px;border-bottom:1px solid #e5e7eb;">
          <h1 style="margin:0;font-size:20px;color:#0f172a;">ScoutLine</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:24px;font-size:16px;color:#0f172a;line-height:1.6;">
          ${body}
        </td>
      </tr>
      <tr>
        <td style="padding:16px 24px;border-top:1px solid #e5e7eb;color:#64748b;font-size:12px;">
          © ${new Date().getFullYear()} ScoutLine
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
