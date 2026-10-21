// lib/email/sendForgotPasswordEmail.ts
import { resend } from "@/lib/email/resend";
import { EMAIL_SENDERS, getBaseUrl } from "@/lib/email/senders";

type SendForgotPasswordEmailInput = {
  to: string;
  rawToken: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendForgotPasswordEmail(
  input: SendForgotPasswordEmailInput
) {
  const to = String(input.to || "").trim().toLowerCase();
  const rawToken = String(input.rawToken || "").trim();

  if (!to) throw new Error("Recipient email is required.");
  if (!rawToken) throw new Error("Raw token is required.");

  const baseUrl = getBaseUrl();
  const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;

  const safeResetUrl = escapeHtml(resetUrl);

  const subject = "Reset your ScoutLine password";

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
      <h2>ScoutLine Password Reset</h2>
      <p>We received a request to reset your password.</p>
      <p>Use the button below to create a new password.</p>

      <p>
        <a
          href="${safeResetUrl}"
          style="display:inline-block;padding:12px 16px;border-radius:8px;background:#caa042;color:#111;text-decoration:none;font-weight:700;"
        >
          Reset Password
        </a>
      </p>

      <p style="margin-top:18px;color:#555;">
        If you did not request a password reset, you can ignore this email.
      </p>
    </div>
  `;

  const text = [
    "ScoutLine Password Reset",
    "",
    "We received a request to reset your password.",
    "Use the link below to create a new password:",
    resetUrl,
    "",
    "If you did not request a password reset, you can ignore this email.",
  ].join("\n");

  const result = await resend.emails.send({
    from: EMAIL_SENDERS.support,
    to,
    subject,
    html,
    text,
  });

  console.log(
    "[email] forgot password result:",
    JSON.stringify({ to, subject, result }, null, 2)
  );

  if ((result as any)?.error) {
    throw new Error(
      `Resend send failed: ${JSON.stringify((result as any).error)}`
    );
  }

  return result;
}