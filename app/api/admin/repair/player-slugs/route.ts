// app/api/admin/repair/player-slugs/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminContext } from "@/lib/admin/getAdminContext";
import { slugifyName, generateUniqueSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";

function isGenericPlayerSlug(slug?: string | null) {
  const s = String(slug || "").trim().toLowerCase();
  return !s || s === "player" || /^player-\d+$/.test(s);
}

function clean(v: any) {
  return String(v ?? "").trim();
}

export async function GET(req: Request) {
  const ctx = await getAdminContext();
  if (!ctx.ok) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const canRepair =
    (ctx.roles ?? []).includes("SCOUTLINE_ADMIN") ||
    (ctx.roles ?? []).includes("SUPPORT_AGENT");

  if (!canRepair) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const dryRun = url.searchParams.get("dryRun") !== "false";

  const users = await prisma.user.findMany({
    where: {
      role: "PLAYER" as any,
      OR: [
        { slug: null },
        { slug: "player" },
        { slug: { startsWith: "player-" } },
        { name: null },
      ],
    },
    select: {
      id: true,
      email: true,
      name: true,
      slug: true,
      PlayerProfile: {
        select: {
          id: true,
          email: true,
          data: true,
        },
      },
    },
    take: 250,
  });

  const results: any[] = [];

  for (const user of users as any[]) {
    const profile = user.PlayerProfile ?? null;
    const data = (profile?.data || {}) as any;

    const firstName = clean(data.firstName ?? data.playerFirstName);
    const lastName = clean(data.lastName ?? data.playerLastName);
    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

    if (!fullName) {
      results.push({
        userId: user.id,
        email: user.email,
        currentName: user.name,
        currentSlug: user.slug,
        skipped: true,
        reason: "No firstName/lastName found in PlayerProfile.data",
      });
      continue;
    }

    const shouldUpdateName = !clean(user.name);
    const shouldUpdateSlug = isGenericPlayerSlug(user.slug);

    if (!shouldUpdateName && !shouldUpdateSlug) {
      results.push({
        userId: user.id,
        email: user.email,
        currentName: user.name,
        currentSlug: user.slug,
        skipped: true,
        reason: "Name and slug already look valid",
      });
      continue;
    }

    const slugBase = slugifyName(fullName) || "player";
    const nextSlug = shouldUpdateSlug
      ? await generateUniqueSlug(prisma as any, slugBase)
      : user.slug;

    const updateData: any = {};
    if (shouldUpdateName) updateData.name = fullName;
    if (shouldUpdateSlug) updateData.slug = nextSlug;

    if (!dryRun) {
      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      if (user.slug && user.slug !== nextSlug) {
        await prisma.publicProfileCache.deleteMany({
          where: {
            OR: [{ userId: user.id }, { slug: user.slug }, { slug: String(nextSlug || "") }],
          },
        });
      }
    }

    results.push({
      userId: user.id,
      email: user.email,
      profileId: profile?.id ?? null,
      oldName: user.name,
      newName: updateData.name ?? user.name,
      oldSlug: user.slug,
      newSlug: updateData.slug ?? user.slug,
      dryRun,
      updated: !dryRun,
    });
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    scanned: users.length,
    repairable: results.filter((r) => !r.skipped).length,
    skipped: results.filter((r) => r.skipped).length,
    results,
  });
}