// lib/digest/digestTypes.ts

export type DigestAudience = "PARENT" | "PLAYER" | "COACH" | "TEAM";

export type DigestPriority = "low" | "medium" | "high";

export type DigestCategory =
  | "RECRUITING_ACTIVITY"
  | "MESSAGING"
  | "PROFILE_COMPLETION"
  | "COLLEGE_FIT"
  | "TARGET_SCHOOLS"
  | "PLAYER_DEVELOPMENT"
  | "TEAM_ACTIVITY"
  | "BILLING"
  | "CAMPS"
  | "ACCOUNTABILITY";

export type DigestItem = {
  id: string;
  audience: DigestAudience;
  category: DigestCategory;
  priority: DigestPriority;
  title: string;
  summary: string;
  href?: string | null;
  metadata?: Record<string, unknown>;
};

export type DigestBundle = {
  audience: DigestAudience;
  userId?: string | null;
  playerProfileId?: string | null;
  teamId?: string | null;
  collegeId?: string | null;
  generatedAt: string;
  items: DigestItem[];
};

export function createDigestItem(input: {
  audience: DigestAudience;
  category: DigestCategory;
  priority?: DigestPriority;
  title: string;
  summary: string;
  href?: string | null;
  metadata?: Record<string, unknown>;
}): DigestItem {
  return {
    id: `${input.audience}-${input.category}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}`,
    audience: input.audience,
    category: input.category,
    priority: input.priority || "medium",
    title: input.title,
    summary: input.summary,
    href: input.href || null,
    metadata: input.metadata || {},
  };
}

export function createDigestBundle(input: {
  audience: DigestAudience;
  userId?: string | null;
  playerProfileId?: string | null;
  teamId?: string | null;
  collegeId?: string | null;
  items: DigestItem[];
}): DigestBundle {
  return {
    audience: input.audience,
    userId: input.userId || null,
    playerProfileId: input.playerProfileId || null,
    teamId: input.teamId || null,
    collegeId: input.collegeId || null,
    generatedAt: new Date().toISOString(),
    items: input.items,
  };
}