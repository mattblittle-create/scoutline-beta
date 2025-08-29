// app/api/debug/coach/[slug]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const slug = (params?.slug || "").trim().toLowerCase();
  if (!slug) {
    return NextResponse.json({ ok: false, error: "Missing slug" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { slug },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        program: true,
        photoUrl: true,
        workPhone: true,
        phonePrivate: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json({ ok: true, user });
  } catch (err: any) {
    console.error("DEBUG /api/debug/coach/[slug] error:", err);
    return NextResponse.json({ ok: false, error: err?.message || "Unknown error" }, { status: 500 });
  }
}
