// lib/email/sendPaymentUpdateEmail.ts

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function getFromEmail() {
  return process.env.RESEND_FROM_EMAIL || "ScoutLine <noreply@myscoutline.com>";
}

type SendPaymentUpdateEmailArgs = {
  to: string;
  playerName?: string | null;
  updateUrl: string;
  invoiceNumber?: string | null;
  amountDueText?: string | null;
};

export async function sendPaymentUpdateEmail({
  to,
  playerName,
  updateUrl,
  invoiceNumber,
  amountDueText,
}: SendPaymentUpdateEmailArgs) {
  const subject = "Action needed: Update your ScoutLine payment method";

  const safePlayerName = playerName?.trim() || "your player";
  const safeInvoiceNumber = invoiceNumber?.trim() || "your ScoutLine invoice";
  const safeAmountDue = amountDueText?.trim() || "the outstanding balance";

  const html = `
    <div style="font-family:Arial, sans-serif; color:#0f172a; line-height:1.6;">
      <h2 style="margin:0 0 12px;">Update your ScoutLine payment method</h2>

      <p>
        We were unable to successfully process payment for ${safePlayerName}'s ScoutLine subscription.
      </p>

      <p>
        Invoice: <strong>${safeInvoiceNumber}</strong><br />
        Amount due: <strong>${safeAmountDue}</strong>
      </p>

      <p>
        Please update your payment method to help avoid interruption to player profile editing,
        recruiting tools, coach teaser card sharing, Suggested Programs, and Truth Fit access.
      </p>

      <p style="margin:24px 0;">
        <a href="${updateUrl}"
          style="background:#0ea5e9;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:700;display:inline-block;">
          Update Payment Method
        </a>
      </p>

      <p style="font-size:13px;color:#64748b;">
        ScoutLine securely uses a hosted third-party payment platform. ScoutLine does not store full card or bank account credentials.
      </p>

      <p style="font-size:13px;color:#64748b;">
        If the button does not work, copy and paste this link into your browser:<br />
        ${updateUrl}
      </p>
    </div>
  `;

  const text = [
    "Update your ScoutLine payment method",
    "",
    `We were unable to successfully process payment for ${safePlayerName}'s ScoutLine subscription.`,
    "",
    `Invoice: ${safeInvoiceNumber}`,
    `Amount due: ${safeAmountDue}`,
    "",
    "Please update your payment method to help avoid interruption to player profile editing, recruiting tools, coach teaser card sharing, Suggested Programs, and Truth Fit access.",
    "",
    updateUrl,
  ].join("\n");

  return resend.emails.send({
    from: getFromEmail(),
    to,
    subject,
    html,
    text,
  });
}