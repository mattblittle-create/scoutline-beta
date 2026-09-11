// lib/email/sendPlayerParentInvite.ts
import { resend } from "@/lib/email/resend";

type SendPlayerParentInviteInput = {
  to: string;
  playerFirstName: string;
  playerLastName: string;
  playerEmail: string;
  plan?: string | null;
  billing?: string | null;
  teamName?: string | null;
  setupUrl?: string | null;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatPlanDisplay(
  plan?: string | null,
  billing?: string | null,
  teamName?: string | null
) {
  const p = String(plan || "").trim().toLowerCase();
  const b = String(billing || "").trim().toLowerCase();
  const t = String(teamName || "").trim();

  if (p === "team" || p === "teams") {
    return t ? `Team via ${t}` : "Team";
  }

  if (p === "redshirt") {
    return "Redshirt, FREE";
  }

  if (p === "walk-on" || p === "walkon") {
    return b === "annual" ? "Walk-On, $265/year" : "Walk-On, $24.95/month";
  }

  if (p === "all-american" || p === "allamerican") {
    return b === "annual"
      ? "All-American, $510/year"
      : "All-American, $49.95/month";
  }

  return "N/A";
}

export async function sendPlayerParentInvite(
  input: SendPlayerParentInviteInput
) {
  const to = String(input.to || "").trim().toLowerCase();
  const playerFirstName = String(input.playerFirstName || "").trim();
  const playerLastName = String(input.playerLastName || "").trim();
  const playerEmail = String(input.playerEmail || "").trim().toLowerCase();
  const plan = String(input.plan || "").trim();
  const billing = String(input.billing || "").trim();

  const fallbackSetupUrl =
    "http://localhost:3000/onboarding/parent/password" +
    `?email=${encodeURIComponent(to)}` +
    `&playerEmail=${encodeURIComponent(playerEmail)}` +
    `&playerFirstName=${encodeURIComponent(playerFirstName)}` +
    `&playerLastName=${encodeURIComponent(playerLastName)}` +
    `&plan=${encodeURIComponent(plan)}` +
    `&billing=${encodeURIComponent(billing || "monthly")}`;

  const setupUrl = String(input.setupUrl || "").trim() || fallbackSetupUrl;

  if (!to) {
    throw new Error("Parent email is required.");
  }

  const playerFullName =
    `${playerFirstName} ${playerLastName}`.replace(/\s+/g, " ").trim() ||
    "your player";

  const safePlayerFullName = escapeHtml(playerFullName);
  const safePlayerEmail = escapeHtml(playerEmail);
  const safeSetupUrl = escapeHtml(setupUrl);
  const teamName = String(input.teamName || "").trim();
  const planDisplay = formatPlanDisplay(plan, billing, teamName);
  const safePlanDisplay = escapeHtml(planDisplay);

  const from =
    process.env.SCOUTLINE_FROM_EMAIL ||
    process.env.EMAIL_FROM ||
    "ScoutLine <onboarding@myscoutline.com>";

  const subject = `Parent access for ${playerFullName}`;

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
      <h2>ScoutLine Parent Invite</h2>

      <p>
        You were listed as the parent contact for
        <strong>${safePlayerFullName}</strong>.
      </p>

      <p><strong>Player Email:</strong> ${safePlayerEmail}</p>
      <p><strong>Plan:</strong> ${safePlanDisplay}</p>

      <p>
        Use the link below to set your parent password and continue setup:
      </p>

      <p>
        <a
          href="${safeSetupUrl}"
          style="display:inline-block;padding:10px 14px;border-radius:8px;background:#caa042;color:#111;text-decoration:none;font-weight:700;"
        >
          Set Parent Password
        </a>
      </p>

      <p style="margin-top:18px;color:#555;">
        If you were not expecting this email, you can ignore it.
      </p>
    </div>
  `;

  const text = [
    "ScoutLine Parent Invite",
    "",
    `You were listed as the parent contact for ${playerFullName}.`,
    `Player Email: ${playerEmail}`,
    `Plan: ${planDisplay}`,
    `Set Parent Password: ${setupUrl}`,
    "",
    "If you were not expecting this email, you can ignore it.",
  ].join("\n");

  const result = await resend.emails.send({
    from,
    to,
    subject,
    html,
    text,
  });

  console.log(
    "[resend] parent invite result:",
    JSON.stringify(
      {
        requestedTo: to,
        requestedFrom: from,
        subject,
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