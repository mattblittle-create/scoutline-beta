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
    case "PARENT_UNREAD_MESSAGE_BADGE":
      return {
        ...base,
        category: "Messaging",
        title: "New Coach Message",
        summary:
          "There is a new coach message on the player account. Message contents are only visible to the player.",
        severity: "info",
      };

    case "PROFILE_VIEW":
    case "COACH_PROFILE_VIEW":
    case "PROFILE_VIEWS_WEEKLY_DIGEST":
    case "PARENT_COACH_ACTIVITY":
      return {
        ...base,
        category: "Recruiting",
        title: "Coach Activity",
        summary:
          "A coach or recruiter interacted with the player profile.",
        severity: "success",
      };

    case "PROFILE_SAVE":
    case "COACH_SAVE":
    case "PLAYER_SAVED":
    case "PLAYER_ADDED_TO_RECRUITING_BOARD":
      return {
        ...base,
        category: "Recruiting",
        title: "Player Saved",
        summary:
          "A coach saved the player profile or added the player to a recruiting board.",
        severity: "success",
      };

    case "PROFILE_INCOMPLETE":
    case "PARENT_PROFILE_COMPLETION":
      return {
        ...base,
        category: "Profile",
        title: "Profile Needs Attention",
        summary:
          "Some recruiting profile sections may need attention or updates.",
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

    case "PARENT_RECRUITING_PROGRESS":
      return {
        ...base,
        category: "Recruiting",
        title: "Recruiting Progress",
        summary:
          "There has been a positive recruiting progress update on the player account.",
        severity: "success",
      };

    case "BILLING_ISSUE":
    case "PAYMENT_FAILED":
    case "PAST_DUE":
    case "PARENT_BILLING_ALERT":
    case "BILLING_PAYMENT_FAILED":
    case "BILLING_PAST_DUE":
    case "BILLING_CARD_UPDATE_REQUIRED":
    case "BILLING_PAYMENT_REMINDER":
    case "BILLING_UPCOMING_INVOICE":
      return {
        ...base,
        category: "Billing",
        title: "Billing Attention Needed",
        summary:
          "There is a billing item that may need review on the player account.",
        severity: "warning",
      };

    case "BILLING_PLAN_CHANGED":
      return {
        ...base,
        category: "Billing",
        title: "Billing Plan Updated",
        summary: "The player account billing plan or ownership has changed.",
        severity: "info",
      };

    case "BILLING_CANCELLATION_REQUESTED":
      return {
        ...base,
        category: "Billing",
        title: "Cancellation Requested",
        summary: "A billing cancellation request has been submitted.",
        severity: "warning",
      };

    case "BILLING_CANCELLATION_CONFIRMED":
      return {
        ...base,
        category: "Billing",
        title: "Cancellation Confirmed",
        summary: "The billing cancellation has been confirmed.",
        severity: "info",
      };

    case "PARENT_WEEKLY_DIGEST":
      return {
        ...base,
        category: "Weekly Digest",
        title: "Weekly Player Activity Digest",
        summary:
          "A weekly summary of parent-safe player activity is available.",
        severity: "info",
      };

    case "PLAYER_REMOVED_FROM_TEAM":
    case "PLAYER_OWNERSHIP_CHANGED":
      return {
        ...base,
        category: "Account",
        title: "Account Ownership Updated",
        summary:
          "The player account team association or billing ownership has changed.",
        severity: "info",
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