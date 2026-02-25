import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Simple list endpoint.
 * Notes:
 * - We select PlayerProfile and join to User (to get slug) by matching email.
 * - For now, we fetch a page and filter/map in JS. You can optimize later with custom SQL/GIN index.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const committedOnly = url.searchParams.get("committed") === "true";
    const limit = Math.min(Number(url.searchParams.get("limit") || 24), 60);
    const cursor = url.searchParams.get("cursor") || undefined;

    // Basic page of profiles
    const page = await prisma.playerProfile.findMany({
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { updatedAt: "desc" },
    });

    // Map to public-safe card data, attach slug
    const emails = page.map((p) => p.email);
    const users = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { email: true, slug: true, name: true },
    });
    const byEmail = new Map(users.map((u) => [u.email, u]));

    const items = page
      .map((row) => {
        const u = byEmail.get(row.email);
        const d: any = row.data;
        const committed = d?.profile?.committed;
        const positions = d?.profile?.positions ?? {};

        const base = {
          id: row.id,
          slug: u?.slug || null,
          photoUrl: d?.profile?.primaryPhotoUrl || null,
          firstName: d?.profile?.firstName || "",
          lastName: d?.profile?.lastName || "",
          primaryPos: positions.primary,
          secondaryPos: positions.secondary,
          committed,
          updatedAt: row.updatedAt,
        };

        if (committedOnly && !committed?.isCommitted) return null;
        return base;
      })
      .filter(Boolean);

    const hasMore = items.length > limit;
    const nextCursor = hasMore ? (page[limit]?.id ?? null) : null;
    const slice = hasMore ? items.slice(0, limit) : items;

    return NextResponse.json({ ok: true, items: slice, nextCursor });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
