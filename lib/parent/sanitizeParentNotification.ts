// lib/parent/sanitizeParentNotification.ts

export type ParentSafeNotificationSeverity = "info" | "success" | "warning";

export type ParentSafeNotification = {
  id: string;
  createdAt: string;
  category: string;
  title: string;
  summary: string;
  severity: ParentSafeNotificationSeverity;
};

function toIsoString(value: unknown) {
  if (value instanceof Date) return value.toISOString();

  if (typeof value === "string" && value.trim()) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }

  return new Date().toISOString();
}

export function sanitizeParentNotification(
  notification: any
): ParentSafeNotification {
  const type = String(notification?.type || "GENERAL").trim().toUpperCase();

  const base = {
    id: String(notification?.id || ""),
    createdAt: toIsoString(notification?.createdAt),
  };

  switch (type) {
    case "COACH_MESSAGE":
    case "NEW_MESSAGE":
    case "MESSAGE_RECEIVED":
      return {
        ...base,
        category: "Messaging",
        title: "New Coach Message",
        summary: "A college coach sent a new message.",
        severity: "info",
      };

    case "PROFILE_VIEW":
    case "COACH_PROFILE_VIEW":
      return {
        ...base,
        category: "Recruiting",
        title: "Profile Viewed",
        summary: "A coach or recruiter viewed the player profile.",
        severity: "success",
      };

    case "PROFILE_SAVE":
    case "COACH_SAVE":
    case "PLAYER_SAVED":
      return {
        ...base,
        category: "Recruiting",
        title: "Player Saved",
        summary: "A coach saved the player profile.",
        severity: "success",
      };

    case "PROFILE_INCOMPLETE":
      return {
        ...base,
        category: "Profile",
        title: "Profile Needs Attention",
        summary: "Some recruiting profile sections are incomplete.",
        severity: "warning",
      };

    case "VIDEO_MISSING":
      return {
        ...base,
        category: "Media",
        title: "Video Missing",
        summary: "The player profile is missing a primary video.",
        severity: "warning",
      };

    case "BILLING_ISSUE":
    case "PAYMENT_FAILED":
    case "PAST_DUE":
      return {
        ...base,
        category: "Billing",
        title: "Billing Attention Needed",
        summary: "There is an issue with the account billing status.",
        severity: "warning",
      };

    default:
      return {
        ...base,
        category: "General",
        title: "Account Activity",
        summary: "There is new activity on the player account.",
        severity: "info",
      };
  }
}