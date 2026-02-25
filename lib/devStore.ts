// lib/devStore.ts
// Simple in-memory “DB” for local/dev usage with stable slugs.
// Restarting the dev server clears this store (by design).

export type StoredUser = {
  // Required
  email: string;

  // Optional name/slug/photo + a bunch of profile fields
  id?: string;           // internal id (cuid-ish)
  slug?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  photoUrl?: string | null;

  // Contact privacy
  emailPrivate?: boolean;
  phone?: string | null;
  phonePrivate?: boolean;

  // Academics
  gradYear?: number | null;
  hsName?: string | null;
  hometown?: string | null; // maps to Player.hometown
  state?: string | null;    // maps to Player.state

  gpa?: number | null;
  gpaScale?: string | null;
  sat?: number | null;
  act?: number | null;

  academicBio?: string | null;
  academicBioPrivate?: boolean;

  // Eligibility
  eligibilityRegistered?: boolean;

  // Commitment
  isCommitted?: boolean;
  committedProgram?: string | null;
  committedProgramId?: string | null;

  // Core / athletics
  primaryPos?: string | null;
  secondaryPos?: string | null;
  isPitcher?: "Yes" | "No" | "" | null;
  pitcherHand?: "RHP" | "LHP" | null;

  throws?: "R" | "L" | "S" | null;
  bats?: "R" | "L" | "S" | null;

  heightFt?: number | null;
  heightIn?: number | null;
  weightLb?: number | null;

  age?: number | null;
  dob?: string | null;       // mm/dd/yyyy (private controlled on client)
  dobPrivate?: boolean;
  gender?: "Male" | "Female" | "" | null;

  // Schedules
  hsScheduleUrl?: string | null;
  hsSchedulePrivate?: boolean;

  travelTeamName?: string | null;
  travelTeamCity?: string | null;
  travelTeamState?: string | null;
  travelTeamScheduleUrl?: string | null;
  travelTeamSchedulePrivate?: boolean;

  otherTeams?: Array<{
    name?: string | null;
    city?: string | null;
    state?: string | null;
    scheduleUrl?: string | null;
  }>;

  // Legacy single "other team" fields for back-compat
  otherTeamName?: string | null;
  otherTeamCity?: string | null;
  otherTeamState?: string | null;
  otherTeamScheduleUrl?: string | null;

  // Bios
  playerBio?: string | null;
  playerBioPrivate?: boolean;

  // Metrics
  metrics?: Record<string, any>;
  metricsPrivate?: Record<string, boolean>;

  // Plan (display-only in this dev store)
  planTier?: "Redshirt" | "Walk-On" | "All-American" | "Teams";
};

// ---------------- In-memory store ----------------

type UserRecord = Required<Pick<StoredUser, "email">> & StoredUser & {
  id: string;           // required internally
  slug: string | null;  // stable once set
};

const usersById = new Map<string, UserRecord>();
const emailIndex = new Map<string, string>(); // email(lowercased) -> id
const slugIndex  = new Map<string, string>(); // slug(lowercased) -> id

// ---------------- Helpers ----------------

function cuid() {
  // tiny cuid-ish id, good enough for dev
  return "c" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function slugifyName(first?: string | null, last?: string | null) {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const parts = [String(first || ""), String(last || "")]
    .map((s) => norm(s))
    .filter(Boolean);

  const base = parts.join("-").replace(/-{2,}/g, "-");
  return base || null;
}

function ensureUniqueSlug(base: string): string {
  const clean = base.toLowerCase();
  if (!slugIndex.has(clean)) return clean;

  let n = 2;
  while (true) {
    const candidate = `${clean}-${n}`;
    if (!slugIndex.has(candidate)) return candidate;
    n++;
  }
}

// Only assign a slug once (at creation). Never change it later.
function assignInitialSlug(u: Partial<UserRecord>): string {
  // Prefer name
  const fromName = slugifyName(u.firstName, u.lastName);
  if (fromName) return ensureUniqueSlug(fromName);

  // Fall back to a short random
  return ensureUniqueSlug("p" + Math.random().toString(36).slice(2, 7));
}

function lcEmail(e?: string | null) {
  return (e || "").trim().toLowerCase();
}

// ---------------- Public API ----------------

export async function getByEmail(email: string): Promise<UserRecord | null> {
  const key = lcEmail(email);
  const id = emailIndex.get(key);
  if (!id) return null;
  return usersById.get(id) || null;
}

export async function getBySlug(slug: string): Promise<UserRecord | null> {
  const key = (slug || "").trim().toLowerCase();
  const id = slugIndex.get(key);
  if (!id) return null;
  return usersById.get(id) || null;
}

// Save/Upsert with stable slug behavior
export async function saveUser(input: StoredUser): Promise<UserRecord> {
  const nextEmail = lcEmail(input.email);
  if (!nextEmail) {
    throw new Error("Email is required.");
  }

  // 1) Find existing by email (most common case)
  let existingId = emailIndex.get(nextEmail);
  let existing: UserRecord | undefined;

  if (existingId) {
    existing = usersById.get(existingId);
  } else {
    // 2) If input carries a slug and we already know that slug, adopt that record
    const hintedSlug = (input.slug || "").trim().toLowerCase();
    if (hintedSlug && slugIndex.has(hintedSlug)) {
      existingId = slugIndex.get(hintedSlug)!;
      existing = usersById.get(existingId);
    }
  }

  // 3) Create new or update existing
  if (!existing) {
    // NEW record
    const id = cuid();
    const slug = assignInitialSlug({
      firstName: input.firstName,
      lastName: input.lastName,
    });

    const record: UserRecord = {
      id,
      slug,
      email: nextEmail,
      // copy all fields
      ...input,
      // enforce normalized fields
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      photoUrl: input.photoUrl ?? null,
    };

    usersById.set(id, record);
    emailIndex.set(nextEmail, id);
    if (slug) slugIndex.set(slug.toLowerCase(), id);

    return record;
  }

  // UPDATE existing — IMPORTANT: keep the same slug if it already exists
  const oldEmail = existing.email;
  const stableSlug = existing.slug; // never change once set

  // Merge fields
  const merged: UserRecord = {
    ...existing,
    ...input,
    id: existing.id,
    email: nextEmail,           // move to new email
    slug: stableSlug ?? existing.slug ?? null, // keep original slug
    firstName: input.firstName ?? existing.firstName ?? null,
    lastName:  input.lastName  ?? existing.lastName  ?? null,
    photoUrl:  input.photoUrl  ?? existing.photoUrl  ?? null,
  };

  // If this record never had a slug (shouldn’t happen often), assign one now and freeze it
  if (!merged.slug) {
    merged.slug = assignInitialSlug({
      firstName: merged.firstName,
      lastName: merged.lastName,
    });
    if (merged.slug) slugIndex.set(merged.slug.toLowerCase(), merged.id);
  }

  // Move email index if email changed
  if (lcEmail(oldEmail) !== nextEmail) {
    if (oldEmail) emailIndex.delete(lcEmail(oldEmail));
    emailIndex.set(nextEmail, merged.id);
  }

  usersById.set(merged.id, merged);
  return merged;
}

// Small helper for your public API builder
export function toPublicPayload(u: UserRecord) {
  // Shape your /api/public/player route expects
  return {
    ok: true,
    data: {
      profile: {
        firstName: u.firstName ?? null,
        lastName: u.lastName ?? null,
        primaryPhotoUrl: u.photoUrl ?? null,
        // academics/core bits you’ve started using:
        gradYear: u.gradYear ?? null,

        // commitment
        committed: {
          isCommitted: Boolean(u.isCommitted),
          program: u.committedProgram ?? null,
        },

        positions: {
          primary: u.primaryPos ?? null,
          secondary: u.secondaryPos ? [u.secondaryPos] : [],
        },
        seasons: [],
      },
      metrics: null,
      stats: null,
      planTier: u.planTier ?? "Teams",
      demoMode: "global",
    },
  };
}
