// lib/slug.ts
import type { PrismaClient } from "@prisma/client";

/** Basic, safe slugify
 *  "Matt Little" -> "matt-little"
 */
export function slugifyName(name: string, maxLen = 48) {
  const base = String(name || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")          // strip diacritics
    .replace(/[^a-z0-9]+/g, "-")              // non-alphanumerics -> "-"
    .replace(/^-+|-+$/g, "")                  // trim leading/trailing "-"
    .replace(/-{2,}/g, "-")                   // collapse "--"
    .slice(0, maxLen)
    .replace(/^-+|-+$/g, "");                 // trim again after slice

  // Default fallback should be a neutral "player", not "coach"
  return base || "player";
}

/** Ensure uniqueness by appending -2, -3, ... if needed. */
export async function generateUniqueSlug(prisma: PrismaClient, baseSlug: string) {
  const base = slugifyName(baseSlug || "player"); // normalize ONCE
  let slug = base;
  let n = 2;

  while (true) {
    const exists = await prisma.user.findUnique({ where: { slug }, select: { id: true } });
    if (!exists) return slug;

    slug = `${base}-${n++}`;

    if (slug.length > 64) {
      const suffix = `-${n}`;
      const maxBase = Math.max(1, 64 - suffix.length);
      slug = `${base.slice(0, maxBase)}${suffix}`;
    }
  }
}

/** Pick the *preferred* slug base: first+last if present, otherwise fall back to email local part. */
export function preferredSlugBase(firstName?: string | null, lastName?: string | null, email?: string | null) {
  const fn = String(firstName || "").trim();
  const ln = String(lastName || "").trim();
  const nameJoined = [fn, ln].filter(Boolean).join(" ").trim();

  if (nameJoined) return slugifyName(nameJoined);

  // fallback: email local part if available
  const local = String(email || "").split("@")[0] || "";
  return slugifyName(local || "player");
}

/** Generate/upgrade a user's slug to be *name-based* when possible.
 *  - If the user has no slug, set it.
 *  - If the existing slug looks email-based and name is available, upgrade to name-based.
 *  Returns the final slug (or null if user not found).
 */
export async function generateOrUpgradeUserSlug(
  prisma: PrismaClient,
  email: string,
  firstName?: string | null,
  lastName?: string | null
): Promise<string | null> {
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, slug: true, email: true },
  });
  if (!user) return null;

  const desiredBase = preferredSlugBase(firstName, lastName, user.email);

  // If there is no slug at all → set one
  if (!user.slug) {
    const unique = await generateUniqueSlug(prisma, desiredBase);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { slug: unique },
      select: { slug: true },
    });
    return updated.slug;
  }

  // Decide if the current slug is email-style (so we can "upgrade" it)
  const emailLocal = String(user.email || "").split("@")[0] || "";
  const emailBase = slugifyName(emailLocal);

  const isEmailStyle =
    user.slug === emailBase || user.slug.startsWith(`${emailBase}-`);

  // If we *now* have a name-based base, and the current slug looks email-ish, upgrade it
  if (desiredBase && desiredBase !== emailBase && isEmailStyle) {
    const unique = await generateUniqueSlug(prisma, desiredBase);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { slug: unique },
      select: { slug: true },
    });
    return updated.slug;
  }

  // Otherwise, keep existing slug
  return user.slug;
}
