// app/lib/visibility.ts
export type ViewerRole = "PUBLIC" | "COACH" | "PLAYER" | "PARENT" | "TEAM_ADMIN" | "ADMIN";
export type PlanTier = "REDSHIRT" | "WALK_ON" | "ALL_AMERICAN" | "TEAMS";
export type ActivityStatus = "ACTIVE" | "OFF_ROSTER_GRACE" | "DORMANT";

export type CorePrivacy = {
  emailPrivate?: boolean | null;
  phonePrivate?: boolean | null;
  dobPrivate?: boolean | null;
};

export type VisibilityContext = {
  viewer: ViewerRole;
  plan: PlanTier;
  status: ActivityStatus;
  corePrivacy?: CorePrivacy | null;

  // Optional: if the viewer is the owner (player/parent) and should see everything regardless of public rules
  isOwner?: boolean;
};

export type SectionKey =
  | "CORE_BASICS"
  | "CORE_CONTACT"
  | "ACADEMICS"
  | "ATHLETICS"
  | "METRICS_PILLS"
  | "METRICS_GROWTH"
  | "STATS"
  | "VIDEO_SOCIAL"
  | "COACHES_REFERENCES"
  | "CHAT";

export type FeatureKey =
  | "VIDEO_UPLOADS"
  | "SOCIAL_LINKS"
  | "STATS_AUTOMATION_IMPORT"
  | "METRICS_SOURCE_ATTRIBUTION"
  | "METRICS_AGE_AVERAGES"
  | "METRICS_GROWTH_CHARTS";

const isAAOrTeams = (plan: PlanTier) => plan === "ALL_AMERICAN" || plan === "TEAMS";
const isWalkOnPlus = (plan: PlanTier) => plan === "WALK_ON" || isAAOrTeams(plan);

export function normalizePlanTier(plan?: string | null): PlanTier {
  const p = String(plan || "").trim().toLowerCase();
  if (p === "teams" || p === "team") return "TEAMS";
  if (p === "all-american" || p === "allamerican" || p === "all_american") return "ALL_AMERICAN";
  if (p === "walk-on" || p === "walkon" || p === "walk_on") return "WALK_ON";
  return "REDSHIRT";
}

export function normalizeActivityStatus(status?: string | null): ActivityStatus {
  const s = String(status || "").trim().toLowerCase();
  if (s === "dormant") return "DORMANT";
  if (s === "off_roster_grace" || s === "offrostergrace" || s === "grace") return "OFF_ROSTER_GRACE";
  return "ACTIVE";
}

/**
 * Dormant = "basic only" for non-admin viewers.
 * Admin always sees all.
 * Owner (player/parent) sees all regardless of plan/status restrictions (except if you choose to enforce)
 */
export function canViewSection(ctx: VisibilityContext, section: SectionKey): boolean {
  const { viewer, plan, status, isOwner } = ctx;

  // Admin sees everything.
  if (viewer === "ADMIN") return true;

  // Owners can always view everything (recommended).
  if (isOwner && (viewer === "PLAYER" || viewer === "PARENT")) return true;

  // Dormant: harsh restrictions for everyone else.
  if (status === "DORMANT") {
    if (section === "CORE_BASICS") return true;
    if (section === "METRICS_PILLS") return true;
    if (section === "ACADEMICS") return true;
    if (section === "ATHLETICS") return true;
    if (section === "STATS") return true;
    if (section === "COACHES_REFERENCES") return true;

    // Hide contact, videos, socials, chat, growth.
    if (section === "CORE_CONTACT") return false;
    if (section === "VIDEO_SOCIAL") return false;
    if (section === "CHAT") return false;
    if (section === "METRICS_GROWTH") return false;

    return false;
  }

  // ACTIVE or OFF_ROSTER_GRACE:
  switch (section) {
    case "CORE_BASICS":
      return true;

    case "CORE_CONTACT":
      return true; // privacy rules applied per-field (email/phone/dob)

    case "ACADEMICS":
    case "ATHLETICS":
    case "STATS":
      return true; // visibility within may still be plan-controlled elsewhere if you want

    case "METRICS_PILLS":
      return true; // all plans

    case "METRICS_GROWTH":
      return isAAOrTeams(plan);

    case "VIDEO_SOCIAL":
      return plan !== "REDSHIRT";

    case "COACHES_REFERENCES":
      return isWalkOnPlus(plan);

    case "CHAT":
      // If you later gate chat, do it here.
      // For now: only if not dormant and plan has video/social (or another rule)
      return plan !== "REDSHIRT";

    default:
      return true;
  }
}

export function canViewCoreField(
  ctx: VisibilityContext,
  field: "email" | "phone" | "dob"
): boolean {
  const { viewer, status, corePrivacy, isOwner } = ctx;

  if (viewer === "ADMIN") return true;
  if (isOwner && (viewer === "PLAYER" || viewer === "PARENT")) return true;

  // Dormant: no contact at all
  if (status === "DORMANT") return false;

  const priv = corePrivacy || {};
  if (viewer === "PUBLIC" || viewer === "COACH" || viewer === "TEAM_ADMIN") {
    if (field === "email") return !priv.emailPrivate;
    if (field === "phone") return !priv.phonePrivate;
    if (field === "dob") return !priv.dobPrivate;
  }

  // Default allow
  return true;
}

export function feature(ctx: VisibilityContext, key: FeatureKey): boolean {
  const { viewer, plan, status, isOwner } = ctx;

  if (viewer === "ADMIN") return true;
  if (isOwner && (viewer === "PLAYER" || viewer === "PARENT")) return true;

  if (status === "DORMANT") return false;

  switch (key) {
    case "STATS_AUTOMATION_IMPORT":
      return isAAOrTeams(plan); // player side feature

    case "METRICS_SOURCE_ATTRIBUTION":
    case "METRICS_AGE_AVERAGES":
    case "METRICS_GROWTH_CHARTS":
      return isAAOrTeams(plan);

    case "VIDEO_UPLOADS":
    case "SOCIAL_LINKS":
      return plan !== "REDSHIRT";

    default:
      return false;
  }
}

export function limits(plan: PlanTier) {
  return {
    videoUploadsMax: plan === "WALK_ON" ? 3 : plan === "REDSHIRT" ? 0 : Infinity,
  };
}

export function shouldShowDormantCoachNudge(ctx: VisibilityContext): boolean {
  // Only show to COACH in dormant status
  return ctx.viewer === "COACH" && ctx.status === "DORMANT";
}
