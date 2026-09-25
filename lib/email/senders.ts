// lib/email/senders.ts
export const EMAIL_SENDERS = {
  onboarding:
    process.env.SCOUTLINE_ONBOARDING_FROM_EMAIL ||
    "ScoutLine Onboarding <onboarding@myscoutline.com>",

  support:
    process.env.SCOUTLINE_SUPPORT_FROM_EMAIL ||
    "ScoutLine Support <support@myscoutline.com>",
} as const;

export function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");
}