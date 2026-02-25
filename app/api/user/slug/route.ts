// app/api/user/slug/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { slugifyName, generateUniqueSlug } from "@/lib/slug";

/**
 * GET ?email=...
 *   -> { ok:true, slug: "first-last" | null }
 *
 * PATCH { email, firstName, lastName }
 *   -> generates or upgrades the user's slug to first-last (unique), returns { ok:true, slug }
 */

// GET: read current slug
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = (searchParams.get("email") || "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ ok: false, error: "Missing email" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { slug: true },
    });

    return NextResponse.json({ ok: true, slug: user?.slug ?? null });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

// PATCH: ensure/upgrade to name-based slug
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const firstName = String(body?.firstName || "").trim();
    const lastName = String(body?.lastName || "").trim();

    if (!email) return NextResponse.json({ ok: false, error: "Email is required" }, { status: 400 });
    if (!firstName && !lastName) {
      return NextResponse.json({ ok: false, error: "First or last name is required" }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, slug: true },
    });
    if (!user) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });

    const base = slugifyName(`${firstName} ${lastName}`);
    const unique = await generateUniqueSlug(prisma, base);

    // Only update if different
    if (!user.slug || user.slug !== unique) {
      await prisma.user.update({ where: { id: user.id }, data: { slug: unique } });
    }

    return NextResponse.json({ ok: true, slug: unique });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
