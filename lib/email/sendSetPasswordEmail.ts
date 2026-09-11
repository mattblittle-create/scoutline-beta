// lib/email/sendSetPasswordEmail.ts
import { resend } from "@/lib/email/resend";
import { EMAIL_SENDERS, getBaseUrl } from "@/lib/email/senders";

type SendSetPasswordEmailInput = {
  to: string;
  rawToken: string;
  roleLabel?: string | null;
  nextPath?: string | null; // optional post-setup destination
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendSetPasswordEmail(
  input: SendSetPasswordEmailInput
) {
  const to = String(input.to || "").trim().toLowerCase();
  const rawToken = String(input.rawToken || "").trim();
  const roleLabel = String(input.roleLabel || "ScoutLine account").trim();
  const nextPath = String(input.nextPath || "").trim();

  if (!to) throw new Error("Recipient email is required.");
  if (!rawToken) throw new Error("Raw token is required.");

  const baseUrl = getBaseUrl();

  const setupUrl = nextPath
    ? `${baseUrl}/set-password?token=${encodeURIComponent(rawToken)}&next=${encodeURIComponent(nextPath)}`
    : `${baseUrl}/set-password?token=${encodeURIComponent(rawToken)}`;

  const safeRoleLabel = escapeHtml(roleLabel);
  const safeSetupUrl = escapeHtml(setupUrl);

  const subject = `Set your password for ${roleLabel}`;

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
      <h2>Welcome to ScoutLine</h2>
      <p>Your ${safeRoleLabel} is ready.</p>
      <p>Use the button below to set your password and finish account setup.</p>

      <p>
        <a
          href="${safeSetupUrl}"
          style="display:inline-block;padding:12px 16px;border-radius:8px;background:#caa042;color:#111;text-decoration:none;font-weight:700;"
        >
          Set Password
        </a>
      </p>

      <p style="margin-top:18px;color:#555;">
        This link expires automatically. If you did not expect this email, you can ignore it.
      </p>
    </div>
  `;

  const text = [
    "Welcome to ScoutLine",
    "",
    `Your ${roleLabel} is ready.`,
    "Use the link below to set your password and finish account setup:",
    setupUrl,
    "",
    "This link expires automatically. If you did not expect this email, you can ignore it.",
  ].join("\n");

  const result = await resend.emails.send({
    from: EMAIL_SENDERS.onboarding,
    to,
    subject,
    html,
    text,
  });

  console.log(
    "[email] set password result:",
    JSON.stringify(
      {
        to,
        subject,
        nextPath: nextPath || null,
        result,
      },
      null,
      2
    )
  );

  if ((result as any)?.error) {
    throw new Error(
      `Resend send failed: ${JSON.stringify((result as any).error)}`
    );
  }

  return result;
}