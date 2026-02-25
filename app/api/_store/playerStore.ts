// app/api/_store/playerStore.ts
// Single shared in-memory store for dev. Replace with DB in production.

export type StoredUser = {
  email: string;
  slug?: string | null;

  // identity
  firstName?: string | null;
  lastName?: string | null;

  // contact
  emailPrivate?: boolean;
  phone?: string | null;
  phonePrivate?: boolean;

  // academics
  gradYear?: number | null;
  hsName?: string | null;
  hometown?: string | null;
  state?: string | null;

  gpa?: number | null;
  gpaScale?: string | null;
  sat?: number | null;
  act?: number | null;

  academicBio?: string | null;
  academicBioPrivate?: boolean;

  // athletics/core
  primaryPos?: string | null;
  secondaryPos?: string | null;
  isPitcher?: "Yes" | "No" | "";
  pitcherHand?: string | null;
  throws?: string | null;
  bats?: string | null;
  heightFt?: number | null;
  heightIn?: number | null;
  weightLb?: number | null;

  age?: number | null;
  dob?: string | null;
  dobPrivate?: boolean;
  gender?: string | null;

  // eligibility
  eligibilityRegistered?: boolean;

  // commitment
  isCommitted?: boolean;
  committedProgram?: string | null;
  committedProgramId?: string | null;

  // schedules
  hsScheduleUrl?: string | null;
  hsSchedulePrivate?: boolean;

  travelTeamName?: string | null;
  travelTeamCity?: string | null;
  travelTeamState?: string | null;
  travelTeamScheduleUrl?: string | null;
  travelTeamSchedulePrivate?: boolean;

  otherTeams?: Array<{
    name: string | null;
    city: string | null;
    state: string | null;
    scheduleUrl: string | null;
  }>;

  playerBio?: string | null;
  playerBioPrivate?: boolean;

  // metrics
  metrics?: Record<string, Array<{ monthYear: string; value: number; source?: string | null }>>;
  metricsPrivate?: Record<string, boolean>;

  // media
  photoUrl?: string | null;
};

// ---- In-memory singleton map keyed by email ----
const mem: Record<string, StoredUser> = {};

// ---- Basic load/save ----
export async function loadProfile(email: string): Promise<StoredUser | null> {
  return mem[email] ?? null;
}
export async function saveProfile(email: string, data: StoredUser): Promise<void> {
  mem[email] = data;
}
export async function findBySlug(slug: string): Promise<StoredUser | null> {
  const s = (slug || "").toLowerCase();
  for (const key of Object.keys(mem)) {
    if ((mem[key]?.slug || "").toLowerCase() === s) return mem[key];
  }
  return null;
}

// ---- Slug helpers ----
function sanitize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}
function baseSlugFromNames(first?: string | null, last?: string | null): string | null {
  const base = sanitize(`${first || ""}${last || ""}`);
  return base || null;
}
function baseSlugFromEmail(email: string): string {
  const local = (email.split("@")[0] || "").toLowerCase();
  return sanitize(local) || "player";
}
function slugExists(candidate: string): boolean {
  const c = candidate.toLowerCase();
  return Object.values(mem).some((u) => (u.slug || "").toLowerCase() === c);
}
// Generate or adjust slug. Preferred: first+last; fallback: email local-part.
// De-duplicate by appending 2,3,4...
export function ensureSlug(u: StoredUser): string {
  const preferred =
    baseSlugFromNames(u.firstName, u.lastName) || baseSlugFromEmail(u.email);

  let candidate = preferred;
  if (!slugExists(candidate)) return (u.slug = candidate);

  // If the same user already owns that slug, keep it.
  if (u.slug && u.slug.toLowerCase() === candidate) return u.slug;

  // De-dupe
  let i = 2;
  while (slugExists(`${candidate}${i}`)) i++;
  u.slug = `${candidate}${i}`;
  return u.slug;
}

// ---- Public payload (masking) ----
export function toPublicPayload(user: StoredUser) {
  // Respect simple privacy flags. Expand as needed.
  const metrics = user.metrics || {};
  const mp = user.metricsPrivate || {};

  // Filter metric groups that are marked private
  const publicMetrics: typeof metrics = {};
  Object.keys(metrics).forEach((k) => {
    if (!mp[k]) publicMetrics[k] = metrics[k];
  });

  return {
    profile: {
      slug: user.slug || null,
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      primaryPhotoUrl: user.photoUrl || null,
      positions: {
        primary: user.primaryPos || null,
        secondary: user.secondaryPos ? [user.secondaryPos].filter(Boolean) : [],
      },
      committed: !!user.isCommitted
        ? { program: user.committedProgram || null, id: user.committedProgramId || null }
        : null,
      gradYear: user.gradYear ?? null,
      // You can add more public-safe fields as desired
    },
    metrics: publicMetrics,
    // Optionally include (public-safe) stats or seasons if you store them
  };
}
