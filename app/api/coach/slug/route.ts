// app/api/coach/slug/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeSlug(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "")
    .replace(/\-+/g, "-")
    .replace(/^\-|\-$/g, "");
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const raw = searchParams.get("slug") || "";
    const slug = normalizeSlug(raw);
    if (!slug) return NextResponse.json({ ok: false, available: false, reason: "empty" });

    const existing = await prisma.user.findFirst({ where: { slug } });
    return NextResponse.json({ ok: true, available: !existing });
  } catch (err: any) {
    console.error("slug GET error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { email, slug: raw } = await req.json();
    const emailNorm = (email || "").toLowerCase().trim();
    const slug = normalizeSlug(raw || "");

    if (!emailNorm || !slug) {
      return NextResponse.json({ ok: false, error: "Missing email or slug" }, { status: 400 });
    }

    const exists = await prisma.user.findFirst({ where: { slug } });
    if (exists && exists.email !== emailNorm) {
      return NextResponse.json({ ok: false, error: "Slug already taken" }, { status: 409 });
    }

    const user = await prisma.user.upsert({
      where: { email: emailNorm },
      update: { slug },
      create: { email: emailNorm, slug },
      select: { email: true, slug: true },
    });

    return NextResponse.json({ ok: true, ...user });
  } catch (err: any) {
    console.error("slug POST error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Server error" }, { status: 500 });
  }
}
