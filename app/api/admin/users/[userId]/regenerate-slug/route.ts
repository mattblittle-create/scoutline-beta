// app/api/admin/users/[userId]/regenerate-slug/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { logAdminAction } from "@/lib/admin/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function slugify(raw: string) {
  const s = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return s || null;
}

function baseFromUser(u: { email: string; name: string | null }) {
  // Prefer name if present; otherwise email local-part
  const fromName = slugify(u.name || "");
  if (fromName) return fromName;

  const local = String(u.email || "").split("@")[0] || "";
  return slugify(local) || "user";
}

async function findUniqueSlug(args: { base: string; userId: string }) {
  // Try base, then base-2, base-3...
  for (let i = 1; i <= 500; i++) {
    const candidate = i === 1 ? args.base : `${args.base}-${i}`;
    const hit = await prisma.user.findFirst({
      where: {
        slug: candidate,
        NOT: { id: args.userId }, // exclude the user we're updating
      },
      select: { id: true },
    });
    if (!hit) return candidate;
  }
  // Extremely unlikely; fallback
  return `${args.base}-${Date.now()}`;
}

export async function POST(_req: Request, ctx: { params: { userId: string } }) {
  const { admin, roles, user: adminUser } = await requireAdmin("/staff");

  // Permission: Support + ScoutLine Admin can regenerate slugs
  const can =
    roles.includes("SCOUTLINE_ADMIN") || roles.includes("SUPPORT_AGENT");
  if (!can) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const userId = String(ctx?.params?.userId || "").trim();
  if (!userId) return NextResponse.json({ ok: false, error: "Missing userId" }, { status: 400 });

  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, slug: true },
  });

  if (!u) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });

  const base = baseFromUser({ email: u.email, name: u.name });
  const nextSlug = await findUniqueSlug({ base, userId: u.id });

  const before = { slug: u.slug ?? null };
  const after = { slug: nextSlug };

  const updated = await prisma.user.update({
    where: { id: u.id },
    data: { slug: nextSlug },
    select: { id: true, slug: true },
  });

  await logAdminAction({
    adminUserId: admin.id,
    actingUserId: null,
    action: "REGENERATE_USER_SLUG",
    entityType: "User",
    entityId: u.id,
    beforeJson: { ...before, email: u.email, name: u.name ?? null },
    afterJson: { ...after, email: u.email, name: u.name ?? null },
  });

  return NextResponse.json({ ok: true, data: { id: updated.id, slug: updated.slug } });
}
