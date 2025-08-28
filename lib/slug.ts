// lib/slug.ts
import type { PrismaClient } from "@prisma/client";

/** "Matt Little" -> "matt-little" */
export function slugifyName(name: string, maxLen = 48) {
  const base = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")            // remove diacritics
    .replace(/[^a-z0-9]+/g, "-")                // non-alphanumerics -> "-"
    .replace(/^-+|-+$/g, "")                    // trim leading/trailing "-"
    .replace(/-{2,}/g, "-")                     // collapse --
    .slice(0, maxLen)
    .replace(/^-+|-+$/g, "");                   // trim again in case slice caused hyphens at ends

  return base || "coach";
}

/** Make sure slug is unique by appending -2, -3, ... if needed */
export async function generateUniqueSlug(
  prisma: PrismaClient,
  baseSlug: string
) {
  let slug = baseSlug;
  let n = 2;

  while (true) {
    const exists = await prisma.user.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!exists) return slug;
    slug = `${baseSlug}-${n++}`;
    if (slug.length > 64) {
      // safety cap—truncate base if we’re getting too long
      const trimmedBase = baseSlug.slice(0, Math.max(1, 64 - (`-${n}`.length)));
      slug = `${trimmedBase}-${n}`;
    }
  }
}
