import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBySlug } from "@/lib/devStore";

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const slug = String(params.slug || "").trim().toLowerCase();

  const out: any = { slug, checks: {} };

  // Check cache
  try {
    const cache = await prisma.publicProfileCache.findUnique({
      where: { slug },
      select: { slug: true, userId: true },
    });
    out.checks.cache = cache || null;
  } catch (e: any) {
    out.checks.cacheError = e?.message || String(e);
  }

  // Check user
  try {
    const user = await prisma.user.findUnique({
      where: { slug },
      select: { id: true, email: true, slug: true },
    });
    out.checks.user = user || null;

    if (user?.email) {
      const prof = await prisma.playerProfile.findUnique({
        where: { email: user.email.toLowerCase() },
        select: { id: true, email: true },
      });
      out.checks.playerProfileForUserEmail = prof || null;
    }
  } catch (e: any) {
    out.checks.userError = e?.message || String(e);
  }

  // Check devStore
  try {
    const dev = await getBySlug(slug);
    out.checks.devStore = dev ? { id: dev.id, email: dev.email, slug: dev.slug } : null;
  } catch (e: any) {
    out.checks.devError = e?.message || String(e);
  }

  return NextResponse.json({ ok: true, debug: out });
}
