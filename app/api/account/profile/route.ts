// app/api/account/profile/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  email?: string;
  slug?: string;
};

function normalizeEmail(e?: string) {
  return (e || "").trim().toLowerCase();
}

function sanitizeSlug(s?: string) {
  const raw = (s || "").trim().toLowerCase();
  // keep letters, numbers, dashes; collapse repeats; trim dashes
  return raw
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function PUT(req: Request) {
  try {
    const { email, slug } = (await req.json()) as Body;

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return NextResponse.json({ ok: false, error: "Missing email" }, { status: 400 });
    }

    const safeSlug = sanitizeSlug(slug);
    if (!safeSlug) {
      return NextResponse.json({ ok: false, error: "Missing or invalid slug" }, { status: 400 });
    }

    // ensure unique slug if another user already has it
    const existing = await prisma.user.findFirst({
      where: { slug: safeSlug, NOT: { email: normalizedEmail } },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "Slug already taken" },
        { status: 409 }
      );
    }

    // update (or create if not found yet)
    const user = await prisma.user.upsert({
      where: { email: normalizedEmail },
      update: { slug: safeSlug },
      create: { email: normalizedEmail, slug: safeSlug },
      select: {
        email: true,
        slug: true,
        name: true,
        role: true,
        program: true,
        photoUrl: true,
      },
    });

    return NextResponse.json({ ok: true, user });
  } catch (err: any) {
    console.error("profile PUT error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
